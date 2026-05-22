import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Play, Send, Layout, ShieldAlert, ChevronLeft, Terminal, Info, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import SecurityModule from '../components/SecurityModule';

const LANG_OPTIONS = [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' },
    { id: 'cpp', label: 'C++' },
    { id: 'c', label: 'C' },
    { id: 'sql', label: 'SQL' },
];

function getBoilerplate(lang) {
    switch (lang) {
        case 'javascript':
            return 'const fs = require("fs");\n\nfunction solution() {\n  const input = fs.readFileSync(0, "utf-8").trim();\n  // Parse input and write your logic here\n  \n  // console.log(result);\n}\n\nsolution();';
        case 'python':
            return 'import sys\n\ndef solution():\n    input_data = sys.stdin.read().strip()\n    # Parse input and write your logic here\n    \n    # print(result)\n\nif __name__ == "__main__":\n    solution()';
        case 'java':
            return 'import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input and write your logic here\n        \n    }\n}';
        case 'cpp':
            return '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and write your logic here\n    \n    return 0;\n}';
        case 'c':
            return '#include <stdio.h>\n\nint main() {\n    // Read input and write your logic here\n    \n    return 0;\n}';
        case 'sql':
            return '-- Write your SQL query here\nSELECT 1;';
        default:
            return '';
    }
}

function monacoLanguage(lang) {
    if (lang === 'cpp') return 'cpp';
    if (lang === 'c') return 'c';
    return lang;
}

const confettiPieces = Array.from({ length: 34 }, (_, i) => ({
    id: i,
    left: `${8 + ((i * 13) % 86)}%`,
    delay: `${(i % 9) * 0.08}s`,
    duration: `${1.7 + (i % 5) * 0.18}s`,
    color: ['#8254ee', '#e7c965', '#ffffff', '#34d399'][i % 4],
    size: 6 + (i % 4) * 2,
}));

/** Block common copy/paste, context menu, devtools, and select-all shortcuts */
function isBlockedShortcut(e) {
    if (!e || e.key == null) return false;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    const lower = typeof k === 'string' && k.length === 1 ? k.toLowerCase() : k;
    if (mod && ['c', 'v', 'x', 'a', 's', 'p', 'u', 'i', 'j', 'k'].includes(lower)) {
        return true;
    }
    if (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(lower)) {
        return true;
    }
    if (k === 'F12') return true;
    if (k === 'F5') return true;
    return false;
}

const ProblemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [runResults, setRunResults] = useState(null);
    const [submitSummary, setSubmitSummary] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [pointsToast, setPointsToast] = useState(null);
    const [compilerLocked, setCompilerLocked] = useState(false);
    const [labOpenStatus, setLabOpenStatus] = useState(true);
    const solveStartedAtRef = useRef(new Date().toISOString());

    const languageIsAccepted = problem?.acceptedLanguages?.includes(language);
    const compilerEnabled = !compilerLocked && !languageIsAccepted && labOpenStatus;

    const showRestriction = useCallback((msg) => {
        setToast(msg || 'Copy Paste Restricted');
        window.setTimeout(() => setToast(null), 2600);
    }, []);

    const checkLabStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/lab/status?questionId=${id}`, {
                headers: token ? { 'x-auth-token': token } : {},
            });
            setLabOpenStatus(res.data.isOpen);
        } catch (e) {
            console.error("Could not fetch lab status", e);
        }
    }, [id]);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5000/api/questions/${id}`, {
                    headers: token ? { 'x-auth-token': token } : {},
                });
                const data = res.data;
                setProblem(data);
                
                let initialLang = 'javascript';
                if (data.acceptedLanguages && data.acceptedLanguages.includes(initialLang)) {
                    const available = LANG_OPTIONS.find(l => !data.acceptedLanguages.includes(l.id));
                    if (available) initialLang = available.id;
                }
                setLanguage(initialLang);
                setCode(getBoilerplate(initialLang));
                solveStartedAtRef.current = new Date().toISOString();
            } catch {
                setError('Problem not found');
            }
        };
        fetchProblem();
        checkLabStatus();
    }, [id, checkLabStatus]);

    useEffect(() => {
        const socket = io('http://localhost:5000');
        socket.on('scheduleCheck', () => {
            checkLabStatus();
        });

        // Check lab status every 15 seconds automatically
        const intervalId = setInterval(() => {
            checkLabStatus();
        }, 15000);

        return () => {
            socket.disconnect();
            clearInterval(intervalId);
        };
    }, [checkLabStatus]);

    useEffect(() => {
        const block = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showRestriction('Copy Paste Restricted');
        };

        const onKeyDown = (e) => {
            if (isBlockedShortcut(e)) {
                e.preventDefault();
                e.stopPropagation();
                showRestriction('Copy Paste Restricted');
            }
        };

        window.addEventListener('copy', block, true);
        window.addEventListener('paste', block, true);
        window.addEventListener('cut', block, true);
        window.addEventListener('contextmenu', block, true);
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('dragstart', block, true);

        return () => {
            window.removeEventListener('copy', block, true);
            window.removeEventListener('paste', block, true);
            window.removeEventListener('cut', block, true);
            window.removeEventListener('contextmenu', block, true);
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('dragstart', block, true);
        };
    }, [showRestriction]);

    const handleEditorMount = (editor) => {
        editor.onKeyDown((e) => {
            const be = e.browserEvent;
            if (be && isBlockedShortcut(be)) {
                e.preventDefault();
                e.stopPropagation();
                showRestriction('Copy Paste Restricted');
            }
        });
        const node = editor.getDomNode();
        if (!node) return;
        const block = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            showRestriction('Copy Paste Restricted');
        };
        ['copy', 'paste', 'cut', 'contextmenu', 'drop'].forEach((evt) => node.addEventListener(evt, block, true));
    };

    const handleRun = async () => {
        if (!compilerEnabled) return;
        setSubmitting(true);
        setSubmitSummary(null);
        try {
            const res = await axios.post('http://localhost:5000/api/execute/run', {
                code,
                language,
                questionId: id,
            });
            setRunResults(res.data.results || []);
        } catch {
            setRunResults([{ caseType: 'sample', index: 1, status: { description: 'Error' }, stderr: 'Run failed', passed: false }]);
        }
        setSubmitting(false);
    };

    const handleSubmit = async () => {
        if (!compilerEnabled) return;
        setSubmitting(true);
        setRunResults(null);
        try {
            const token = localStorage.getItem('token');
            const uid = user?._id || user?.id;
            const res = await axios.post(
                'http://localhost:5000/api/execute/submit',
                { code, language, questionId: id, userId: uid, solveStartedAt: solveStartedAtRef.current },
                { headers: { 'x-auth-token': token } }
            );
            setSubmitSummary(res.data);
            
            // If the submission is accepted, update the problem's acceptedLanguages so it immediately locks
            if (res.data.status === 'Accepted') {
                setProblem(prev => {
                    if (!prev) return prev;
                    const accepted = prev.acceptedLanguages || [];
                    if (!accepted.includes(language)) {
                        return { ...prev, acceptedLanguages: [...accepted, language] };
                    }
                    return prev;
                });
                setPointsToast({
                    earnedPoints: res.data.earnedPoints || 0,
                    basePoints: res.data.basePoints || 0,
                    speedBonus: res.data.speedBonus ?? res.data.timeBonus ?? 0,
                    accuracyBonus: res.data.accuracyBonus || 0,
                    totalUserPoints: res.data.totalUserPoints || 0,
                    rank: res.data.rank || 0,
                });
                setCode('');
                window.setTimeout(() => setPointsToast(null), 4200);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Submit failed';
            setSubmitSummary({ status: 'Error', testCasesPassed: 0, totalTestCases: 0, error: msg });
        }
        setSubmitting(false);
    };

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                {error}
            </div>
        );
    }
    if (!problem) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                Loading…
            </div>
        );
    }

    const hiddenCount = problem.hiddenTestCaseCount ?? problem.hiddenTestCases?.length ?? 0;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                backgroundColor: 'var(--bg)',
                overflow: 'hidden',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            <header
                style={{
                    flexShrink: 0,
                    minHeight: '70px',
                    background: 'var(--glass-gradient)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 1rem 0 1.5rem',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    zIndex: 100,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
                        <ChevronLeft size={24} />
                    </motion.button>
                    <div>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0 }}>{problem.title}</h2>
                        <p style={{ fontSize: '0.75rem', color: 'gray', margin: 0 }}>
                            Difficulty:{' '}
                            <span style={{ color: problem.difficulty === 'Easy' ? '#10b981' : problem.difficulty === 'Medium' ? '#f59e0b' : '#ef4444' }}>{problem.difficulty}</span>
                            {hiddenCount > 0 && (
                                <span style={{ marginLeft: '0.75rem' }}>
                                    · {hiddenCount} hidden test case{hiddenCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div
                        style={{
                            fontSize: '0.78rem',
                            color: '#fca5a5',
                            background: 'rgba(127,29,29,0.35)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(252,165,165,0.35)',
                            maxWidth: '220px',
                        }}
                    >
                        Copy Paste Restricted
                    </div>
                    <select
                        value={language}
                        onChange={(e) => {
                            const v = e.target.value;
                            setLanguage(v);
                            const completed = problem?.acceptedLanguages?.includes(v);
                            setCode(completed ? '' : getBoilerplate(v));
                            solveStartedAtRef.current = new Date().toISOString();
                        }}
                        className="glass"
                        disabled={compilerLocked}
                        style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.85rem', outline: 'none', cursor: compilerLocked ? 'not-allowed' : 'pointer', opacity: compilerLocked ? 0.5 : 1 }}
                    >
                        {LANG_OPTIONS.map((o) => {
                            const isCompleted = problem?.acceptedLanguages?.includes(o.id);
                            return (
                                <option key={o.id} value={o.id}>
                                    {o.label} {isCompleted ? '(Completed)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    <motion.button
                        type="button"
                        whileHover={compilerEnabled ? { scale: 1.03 } : {}}
                        className="btn glass"
                        onClick={handleRun}
                        disabled={submitting || !compilerEnabled}
                        style={{ padding: '8px 16px', borderRadius: '10px', opacity: compilerEnabled ? 1 : 0.45 }}
                    >
                        <Play size={16} /> Run
                    </motion.button>
                    <motion.button
                        type="button"
                        whileHover={compilerEnabled ? { scale: 1.03 } : {}}
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting || !compilerEnabled}
                        style={{ padding: '8px 18px', borderRadius: '10px', opacity: compilerEnabled ? 1 : 0.45 }}
                    >
                        <Send size={16} /> Submit
                    </motion.button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                <motion.div
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    style={{
                        width: '40%',
                        minWidth: '280px',
                        padding: '1.25rem',
                        overflowY: 'auto',
                        background: 'rgba(255,255,255,0.02)',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 600 }}>
                        <Info size={18} /> Description
                    </div>
                    <div className="card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', marginBottom: '1.5rem' }}>
                        <p style={{ lineHeight: 1.65, fontSize: '0.95rem', opacity: 0.92 }}>{problem.description}</p>
                    </div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <Layout size={16} className="text-primary" /> I/O
                    </h3>
                    <div className="card" style={{ padding: '1rem', marginTop: '0.75rem', marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'gray', marginBottom: '0.35rem' }}>Input</p>
                        <p style={{ fontSize: '0.88rem' }}>{problem.inputFormat}</p>
                    </div>
                    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'gray', marginBottom: '0.35rem' }}>Output</p>
                        <p style={{ fontSize: '0.88rem' }}>{problem.outputFormat}</p>
                    </div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                        <ShieldAlert size={16} className="text-primary" /> Constraints
                    </h3>
                    <pre style={{ padding: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.06)', color: '#d1d5db', marginTop: '0.5rem' }}>{problem.constraints}</pre>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginTop: '1.25rem' }}>
                        <CheckCircle2 size={16} className="text-primary" /> Sample tests
                    </h3>
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '0.75rem' }}>
                        {problem.sampleTestCases?.map((tc, i) => (
                            <div key={i} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                <p style={{ fontWeight: 600, fontSize: '0.75rem', color: 'gray', marginBottom: '0.35rem' }}>Input {i + 1}</p>
                                <pre style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{tc.input}</pre>
                                <p style={{ fontWeight: 600, fontSize: '0.75rem', color: 'gray', marginBottom: '0.35rem' }}>Output {i + 1}</p>
                                <pre style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.82rem' }}>{tc.output}</pre>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a1e', minWidth: 0 }}>
                    <div style={{ flex: 1, position: 'relative', minHeight: '200px' }}>
                        {!compilerEnabled && !languageIsAccepted && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 5,
                                    background: 'rgba(0,0,0,0.55)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fecaca',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    padding: '1rem',
                                    gap: '1rem',
                                    backdropFilter: 'blur(4px)',
                                }}
                            >
                                <ShieldAlert size={40} />
                                {!labOpenStatus 
                                    ? "Lab is currently closed. Submissions are only allowed during the assigned lab schedule." 
                                    : compilerLocked 
                                        ? "Compiler locked due to security violations." 
                                        : "Compiler is currently disabled."}
                            </div>
                        )}
                        {languageIsAccepted && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 10,
                                    background: 'rgba(0,0,0,0.85)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fecaca',
                                    textAlign: 'center',
                                    padding: '2rem',
                                    gap: '1rem',
                                }}
                            >
                                <CheckCircle2 size={56} color="#34d399" />
                                <h2 style={{ margin: 0, color: '#34d399', fontSize: '1.5rem' }}>Language Completed</h2>
                                <p style={{ margin: 0, maxWidth: '420px', lineHeight: 1.6, color: '#d1d5db', fontSize: '1rem' }}>
                                    You have already completed this question in <strong style={{color: '#fff'}}>{LANG_OPTIONS.find(l => l.id === language)?.label || language}</strong> language.<br/><br/>
                                    Please solve again using another language. Contact faculty for doubts.
                                </p>
                            </div>
                        )}
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={monacoLanguage(language)}
                            value={code}
                            onChange={(v) => compilerEnabled && setCode(v || '')}
                            onMount={handleEditorMount}
                            options={{
                                readOnly: !compilerEnabled,
                                fontSize: 18,
                                lineNumbers: 'on',
                                autoIndent: 'full',
                                autoClosingBrackets: 'always',
                                autoClosingQuotes: 'always',
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 12 },
                                contextmenu: false,
                                dragAndDrop: false,
                                selectionClipboard: false,
                                copyWithSyntaxHighlighting: false,
                                formatOnPaste: false,
                                formatOnType: false,
                                quickSuggestions: false,
                                parameterHints: { enabled: false },
                                suggestOnTriggerCharacters: false,
                                wordBasedSuggestions: 'off',
                                occurrencesHighlight: 'off',
                                selectionHighlight: false,
                                renderLineHighlight: 'none',
                                links: false,
                                folding: true,
                                matchBrackets: 'never',
                            }}
                        />
                    </div>

                    <div style={{ height: '34%', minHeight: '160px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(24,24,28,0.98)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                            <Terminal size={16} /> Output console
                        </div>
                        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', fontSize: '16px', fontFamily: 'ui-monospace, monospace' }}>
                            {submitSummary && (
                                <div style={{ marginBottom: '1rem', padding: '0.85rem', borderRadius: '10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ fontWeight: 700, color: submitSummary.status === 'Accepted' ? '#34d399' : '#f87171', marginBottom: '0.5rem' }}>
                                        Submit: {submitSummary.status}
                                        {submitSummary.error && ` — ${submitSummary.error}`}
                                    </div>
                                    {!submitSummary.error && (
                                        <>
                                            <div>
                                                Passed {submitSummary.testCasesPassed ?? 0} / {submitSummary.totalTestCases ?? 0} total tests
                                            </div>
                                            <div style={{ color: '#9ca3af', marginTop: '0.35rem' }}>
                                                Sample: {submitSummary.samplePassed ?? 0}/{submitSummary.sampleTotal ?? 0} · Hidden: {submitSummary.hiddenPassed ?? 0}/{submitSummary.hiddenTotal ?? 0} (details not shown)
                                            </div>
                                            {submitSummary.caseSummaries && (
                                                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: '#d1d5db' }}>
                                                    {submitSummary.caseSummaries.map((c) => (
                                                        <li key={`${c.caseType}-${c.index}`}>
                                                            {c.caseType === 'hidden' ? `Hidden #${c.index}` : `Sample #${c.index}`}: {c.passed ? 'passed' : 'failed'}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {submitSummary.status === 'Accepted' && (
                                                <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
                                                    {[
                                                        ['Base Points', submitSummary.basePoints || 0],
                                                        ['Speed Bonus', `+${submitSummary.speedBonus ?? submitSummary.timeBonus ?? 0}`],
                                                        ['Accuracy Bonus', `+${submitSummary.accuracyBonus || 0}`],
                                                        ['Total Earned', `+${submitSummary.earnedPoints || 0}`],
                                                    ].map(([label, value]) => (
                                                        <div key={label} style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(130,84,238,0.14)', border: '1px solid rgba(231,201,101,0.22)' }}>
                                                            <div style={{ color: '#c1cfc1', fontSize: '0.78rem' }}>{label}</div>
                                                            <div style={{ color: label === 'Total Earned' ? '#e7c965' : '#ffffff', fontWeight: 800, fontSize: '1rem' }}>{value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {runResults && (
                                <div>
                                    <div style={{ color: '#93c5fd', marginBottom: '0.5rem', fontWeight: 600 }}>Run (sample cases only)</div>
                                    {runResults.map((res, i) => (
                                        <div key={i} style={{ marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                {res.passed ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#f87171" />}
                                                <span style={{ fontWeight: 600 }}>Case {res.index}: {res.status?.description || res.status}</span>
                                            </div>
                                            {res.stdout != null && res.stdout !== '' && (
                                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e5e7eb' }}>{res.stdout}</pre>
                                            )}
                                            {(res.stderr || res.compile_output) && (
                                                <pre style={{ margin: '0.35rem 0 0', color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{res.stderr || res.compile_output}</pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!runResults && !submitSummary && (
                                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>Run executes visible samples only. Submit evaluates all cases including hidden.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 1000 }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
                                color: '#fff',
                                padding: '12px 20px',
                                borderRadius: '14px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                maxWidth: '320px',
                            }}
                        >
                            <ShieldAlert size={20} />
                            {toast}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {pointsToast && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="reward-overlay"
                    >
                        <div className="reward-confetti">
                            {confettiPieces.map((piece) => (
                                <span
                                    key={piece.id}
                                    style={{
                                        left: piece.left,
                                        animationDelay: piece.delay,
                                        animationDuration: piece.duration,
                                        background: piece.color,
                                        width: `${piece.size}px`,
                                        height: `${piece.size * 1.8}px`,
                                    }}
                                />
                            ))}
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 36, scale: 0.86 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -24, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                            className="reward-popup"
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.12, type: 'spring', stiffness: 260, damping: 12 }}
                                className="reward-check"
                            >
                                <CheckCircle2 size={54} />
                            </motion.div>
                            <div className="reward-title">Accepted Successfully</div>
                            <motion.div
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.18 }}
                                className="reward-points"
                            >
                                +{pointsToast.earnedPoints} Points Earned
                            </motion.div>
                            <div className="reward-breakdown">
                                <div><span>Base Points</span><strong>{pointsToast.basePoints}</strong></div>
                                <div><span>Speed Bonus</span><strong>+{pointsToast.speedBonus}</strong></div>
                                <div><span>Accuracy Bonus</span><strong>+{pointsToast.accuracyBonus}</strong></div>
                            </div>
                            <div className="reward-total">
                                <span>Total Points</span>
                                <strong>{pointsToast.totalUserPoints}</strong>
                                {pointsToast.rank ? <em>Rank #{pointsToast.rank}</em> : null}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: [0, 1, 1, 0], y: [20, 0, -24, -58] }}
                            transition={{ duration: 2.3, delay: 0.25 }}
                            className="floating-points reward-float"
                        >
                            +{pointsToast.earnedPoints}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <SecurityModule 
                problem={problem} 
                isCompilerEnabled={compilerEnabled} 
                setCompilerLocked={setCompilerLocked} 
            />
        </div>
    );
};

export default ProblemDetail;
