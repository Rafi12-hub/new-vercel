import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Play, Send, Layout, ShieldAlert, ChevronLeft, Terminal, Info, CheckCircle2, XCircle, Loader2, Minus, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import SecurityModule from '../components/SecurityModule';
import SubmissionSuccessAnimation from '../components/SubmissionSuccessAnimation';

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

    // New features state
    const [editorFontSize, setEditorFontSize] = useState(16);
    const [submitState, setSubmitState] = useState('idle'); // idle, verifying, running, checking, done
    const [activeTimeSeconds, setActiveTimeSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerManuallyPaused, setTimerManuallyPaused] = useState(false);
    const [timerPauseCount, setTimerPauseCount] = useState(0);
    const [timerStopped, setTimerStopped] = useState(false);
    const inactivityTimeoutRef = useRef(null);

    // LeetCode UI upgrade states
    const [leftActiveTab, setLeftActiveTab] = useState('description');
    const [displayPoints, setDisplayPoints] = useState(user?.totalPoints || 0);
    const [coinParticles, setCoinParticles] = useState([]);
    const [burstParticles, setBurstParticles] = useState([]);
    const [animatedTestCaseResults, setAnimatedTestCaseResults] = useState([]);
    const [animatingTestCaseIndex, setAnimatingTestCaseIndex] = useState(-1);

    const [showCoinAnimation, setShowCoinAnimation] = useState(false);
    const [animationEarnedPoints, setAnimationEarnedPoints] = useState(0);

    // Flying coin to header ref
    const headerPointsRef = useRef(null);

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

    // Smart Timer Logic
    useEffect(() => {
        let interval;
        if (isTimerActive && compilerEnabled && !timerStopped) {
            interval = setInterval(() => {
                setActiveTimeSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerActive, compilerEnabled, timerStopped]);

    const handleStopTimer = () => {
        setTimerStopped(true);
        setIsTimerActive(false);
        setTimerManuallyPaused(false);
        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };

    const handleResetTimer = () => {
        setActiveTimeSeconds(0);
        setTimerPauseCount(0);
        setTimerStopped(false);
        setIsTimerActive(false);
        setTimerManuallyPaused(false);
        solveStartedAtRef.current = new Date().toISOString();
    };

    const handleUserActivity = useCallback(() => {
        if (document.hidden) return;
        if (timerManuallyPaused) return;
        if (timerStopped) return;
        setIsTimerActive(true);
        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = setTimeout(() => {
            setIsTimerActive(false);
        }, 30000);
    }, [timerManuallyPaused, timerStopped]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (!timerManuallyPaused && !timerStopped) {
                    setIsTimerActive(false);
                    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
                }
            } else {
                handleUserActivity();
            }
        };

        const handleBlur = () => {
            if (!timerManuallyPaused && !timerStopped) {
                setIsTimerActive(false);
                if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
            }
        };

        const handleFocus = () => {
            handleUserActivity();
        };

        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('click', handleUserActivity);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
        };
    }, [handleUserActivity, timerManuallyPaused, timerStopped]);

    const editorRef = useRef(null);

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        
        // Timer triggers on strict editor interaction
        editor.onDidChangeModelContent(() => handleUserActivity());
        editor.onDidChangeCursorPosition(() => handleUserActivity());
        editor.onKeyDown(() => handleUserActivity());

        if (monacoLanguage(language) !== 'javascript') {
            const langDefaults = {
                java: `public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}`,
                c: `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}`,
                cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}`,
                python: `def solution():\n    pass\n\nif __name__ == "__main__":\n    solution()`,
            };
            const lang = monacoLanguage(language);
            if (langDefaults[lang] && (!code || code.trim() === '')) {
                setCode(langDefaults[lang]);
            }
        }
        
        const node = editor.getDomNode();
        if (!node) return;
        const block = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            showRestriction('Copy Paste Restricted');
        };
        ['copy', 'paste', 'cut', 'contextmenu', 'drop'].forEach((evt) => node.addEventListener(evt, block, true));
    };

    useEffect(() => {
        if (user && user.totalPoints !== undefined) {
            setDisplayPoints(user.totalPoints);
        }
    }, [user]);

    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}m ${s}s`;
    };

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



    const triggerCoinFlyingPhase = (newTotalPoints) => {
        const badge = document.getElementById('header-points-badge');
        const rect = badge ? badge.getBoundingClientRect() : { left: window.innerWidth - 180, top: 20 };
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight / 2;

        const newCoins = [];
        for (let i = 0; i < 20; i++) {
            newCoins.push({
                id: i,
                startX: `${startX}px`,
                startY: `${startY}px`,
                midX: `${(Math.random() - 0.5) * 300}px`,
                midY: `${-200 - Math.random() * 250}px`,
                endX: `${rect.left + 20}px`,
                endY: `${rect.top + 15}px`,
                delay: `${i * 0.06}s`
            });
        }
        setCoinParticles(newCoins);

        setTimeout(() => {
            const newParticles = [];
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 + Math.random() * 70;
                newParticles.push({
                    id: i,
                    x: `${rect.left + 20}px`,
                    y: `${rect.top + 15}px`,
                    dx: `${Math.cos(angle) * distance}px`,
                    dy: `${Math.sin(angle) * distance}px`
                });
            }
            setBurstParticles(newParticles);

            let current = displayPoints;
            const end = newTotalPoints;
            if (end !== current) {
                const duration = 1200;
                const steps = 30;
                const stepTime = duration / steps;
                const increment = (end - current) / steps;

                let timer = setInterval(() => {
                    current += increment;
                    if ((increment >= 0 && current >= end) || (increment < 0 && current <= end)) {
                        setDisplayPoints(end);
                        clearInterval(timer);
                    } else {
                        setDisplayPoints(Math.round(current));
                    }
                }, stepTime);
            }

            setTimeout(() => {
                setBurstParticles([]);
                setCoinParticles([]);
                setShowCoinAnimation(false);
            }, 1200);
        }, 1200);
    };

    const handleRun = async () => {
        if (!compilerEnabled) return;
        setSubmitting(true);
        setRunResults(null);
        setSubmitSummary(null);
        setLeftActiveTab('result');

        const samples = problem.sampleTestCases || [];
        const initialAnimated = samples.map((tc, idx) => ({
            caseType: 'sample',
            index: idx + 1,
            passed: false,
            status: 'Pending',
            isAnimating: false,
        }));
        setAnimatedTestCaseResults(initialAnimated);

        try {
            const res = await axios.post('http://localhost:5000/api/execute/run', {
                code,
                language,
                questionId: id,
            });
            const apiResults = res.data.results || [];

            // Step-by-step testcase animation
            for (let j = 0; j < initialAnimated.length; j++) {
                // Show case as running
                setAnimatingTestCaseIndex(j);
                setAnimatedTestCaseResults(prev => prev.map((tc, idx) => 
                    idx === j ? { ...tc, status: 'Running...', isAnimating: true } : tc
                ));
                await new Promise(r => setTimeout(r, 450)); // smooth professional pause

                const apiRes = apiResults[j] || { passed: false, status: { description: 'Runtime Error' } };
                setAnimatedTestCaseResults(prev => prev.map((tc, idx) => 
                    idx === j ? { 
                        ...tc, 
                        passed: apiRes.passed, 
                        status: apiRes.passed ? 'Accepted' : (apiRes.status?.description || 'Failed'),
                        isAnimating: false,
                        stdout: apiRes.stdout,
                        stderr: apiRes.stderr || apiRes.compile_output,
                    } : tc
                ));
            }
            setRunResults(apiResults);
        } catch {
            const failResults = [{ caseType: 'sample', index: 1, status: { description: 'Error' }, stderr: 'Run failed', passed: false }];
            setAnimatedTestCaseResults(prev => prev.map((tc, idx) => 
                idx === 0 ? { ...tc, passed: false, status: 'Error', isAnimating: false, stderr: 'Run failed' } : tc
            ));
            setRunResults(failResults);
        }
        setAnimatingTestCaseIndex(-1);
        setSubmitting(false);
    };

    const handleSubmit = async () => {
        if (!compilerEnabled) return;
        setSubmitting(true);
        setSubmitState('verifying');
        setRunResults(null);
        setSubmitSummary(null);
        setLeftActiveTab('result');

        const samples = problem.sampleTestCases || [];
        const hiddenCount = problem.hiddenTestCaseCount ?? problem.hiddenTestCases?.length ?? 0;
        const initialAnimated = [];
        for (let idx = 0; idx < samples.length; idx++) {
            initialAnimated.push({
                caseType: 'sample',
                index: idx + 1,
                passed: false,
                status: 'Pending',
                isAnimating: false,
            });
        }
        for (let idx = 0; idx < hiddenCount; idx++) {
            initialAnimated.push({
                caseType: 'hidden',
                index: idx + 1,
                passed: false,
                status: 'Pending',
                isAnimating: false,
            });
        }
        setAnimatedTestCaseResults(initialAnimated);

        try {
            const token = localStorage.getItem('token');
            const uid = user?._id || user?.id;

            // Premium Submission Animation Flow
            await new Promise(r => setTimeout(r, 600));
            setSubmitState('running');
            await new Promise(r => setTimeout(r, 800));
            setSubmitState('checking');

            const res = await axios.post(
                'http://localhost:5000/api/execute/submit',
                { 
                    code, 
                    language, 
                    questionId: id,
                    solveStartedAt: solveStartedAtRef.current,
                    activeCodingTime: activeTimeSeconds,
                    submittedAt: new Date().toISOString(),
                },
                { headers: { 'x-auth-token': token } }
            );

            await new Promise(r => setTimeout(r, 500));
            setSubmitState('done');

            const caseSummaries = res.data.caseSummaries || [];
            // Step-by-step testcase resolution animation
            for (let j = 0; j < initialAnimated.length; j++) {
                setAnimatingTestCaseIndex(j);
                setAnimatedTestCaseResults(prev => prev.map((tc, idx) => 
                    idx === j ? { ...tc, status: 'Running...', isAnimating: true } : tc
                ));
                await new Promise(r => setTimeout(r, 350)); // smooth professional pause
                
                const apiRes = caseSummaries[j] || { passed: false };
                setAnimatedTestCaseResults(prev => prev.map((tc, idx) => 
                    idx === j ? { 
                        ...tc, 
                        passed: apiRes.passed, 
                        status: apiRes.passed ? 'Accepted' : (apiRes.status || 'Failed'),
                        isAnimating: false,
                    } : tc
                ));
            }

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
                // Show points breakdown after grand coin animation
                window.setTimeout(() => {
                    setPointsToast({
                        earnedPoints: res.data.earnedPoints || 0,
                        basePoints: res.data.basePoints || 0,
                        speedBonus: res.data.speedBonus ?? res.data.timeBonus ?? 0,
                        accuracyBonus: res.data.accuracyBonus || 0,
                        totalUserPoints: res.data.totalUserPoints || 0,
                        rank: res.data.rank || 0,
                    });
                }, 3800);
                
                // Trigger Grand Gold Coin rotating animation
                setAnimationEarnedPoints(res.data.earnedPoints || 0);
                setShowCoinAnimation(true);
                setTimeout(() => {
                    triggerCoinFlyingPhase(res.data.totalUserPoints || 0);
                }, 3200);

                setCode('');
                window.setTimeout(() => setPointsToast(null), 8000);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Submit failed';
            setSubmitState('done');
            setSubmitSummary({ status: 'Error', testCasesPassed: 0, totalTestCases: 0, error: msg });
            setAnimatedTestCaseResults(prev => prev.map(tc => ({ ...tc, passed: false, status: 'Error', isAnimating: false })));
        }
        setAnimatingTestCaseIndex(-1);
        setSubmitting(false);
        setTimeout(() => setSubmitState('idle'), 3000);
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
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.4rem', 
                        background: isTimerActive ? 'rgba(52, 211, 153, 0.15)' : (timerManuallyPaused ? 'rgba(255, 159, 67, 0.15)' : 'rgba(255,255,255,0.1)'),
                        color: isTimerActive ? '#34d399' : (timerManuallyPaused ? '#ff9f43' : '#9ca3af'),
                        padding: '6px 12px', borderRadius: '10px',
                        fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.3s',
                        border: timerManuallyPaused ? '1px solid rgba(255,159,67,0.3)' : 'none'
                    }}>
                        {isTimerActive ? `🟢 Coding: ${formatTime(activeTimeSeconds)}` : (timerManuallyPaused ? `⏸ Manual Pause: ${formatTime(activeTimeSeconds)}` : '⏸ Idle')}
                    </div>
                    {!timerStopped ? (
                        <>
                            {!timerManuallyPaused ? (
                                <button
                                    onClick={() => {
                                        setTimerManuallyPaused(true);
                                        setIsTimerActive(false);
                                        setTimerPauseCount(c => c + 1);
                                        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
                                    }}
                                    style={{
                                        background: 'rgba(255,159,67,0.15)',
                                        color: '#ff9f43',
                                        border: '1px solid rgba(255,159,67,0.3)',
                                        borderRadius: '8px',
                                        padding: '5px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                    }}
                                    title="Pause Timer"
                                >
                                    ⏸ Pause
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setTimerManuallyPaused(false);
                                        setIsTimerActive(true);
                                        handleUserActivity();
                                    }}
                                    style={{
                                        background: 'rgba(52,211,153,0.15)',
                                        color: '#34d399',
                                        border: '1px solid rgba(52,211,153,0.3)',
                                        borderRadius: '8px',
                                        padding: '5px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                    }}
                                    title="Resume Timer"
                                >
                                    ▶ Resume
                                </button>
                            )}
                            <button
                                onClick={handleStopTimer}
                                style={{
                                    background: 'rgba(239,68,68,0.15)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '8px',
                                    padding: '5px 12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                }}
                                title="Stop Timer"
                            >
                                ⏹ Stop
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleResetTimer}
                            style={{
                                background: 'rgba(130,84,238,0.15)',
                                color: '#8254ee',
                                border: '1px solid rgba(130,84,238,0.3)',
                                borderRadius: '8px',
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                            title="Reset Timer"
                        >
                            ↻ Reset
                        </button>
                    )}

                    <div 
                        id="header-points-badge"
                        className="points-pulse-glow"
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.4rem', 
                            background: 'rgba(231, 201, 101, 0.15)',
                            color: '#e7c965',
                            padding: '6px 12px', borderRadius: '10px',
                            fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid rgba(231, 201, 101, 0.3)',
                            transition: 'all 0.3s'
                        }}
                    >
                        🪙 {displayPoints} pts
                    </div>
                    
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
                        width: leftActiveTab === 'result' ? '100%' : '40%',
                        minWidth: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'rgba(255,255,255,0.02)',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                        transition: 'width 0.3s ease-in-out'
                    }}
                >
                    {/* Modern Tabs */}
                    <div className="glass-tab" style={{ display: 'flex', flexShrink: 0 }}>
                        <button
                            onClick={() => setLeftActiveTab('description')}
                            className={`glass-tab-btn ${leftActiveTab === 'description' ? 'active' : ''}`}
                            style={{ flex: 1 }}
                        >
                            📝 Description
                        </button>
                        <button
                            onClick={() => setLeftActiveTab('result')}
                            className={`glass-tab-btn ${leftActiveTab === 'result' ? 'active' : ''}`}
                            disabled={!runResults && !submitSummary && animatedTestCaseResults.length === 0}
                            style={{ flex: 1, opacity: (!runResults && !submitSummary && animatedTestCaseResults.length === 0) ? 0.4 : 1 }}
                        >
                            📊 Results
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                        {leftActiveTab === 'description' ? (
                            <>
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
                            </>
                        ) : (
                            /* Results Tab Content - LeetCode Premium Style */
                            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
                                {/* Left Side: Stats Container */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {/* Overall Status Banner - Premium */}
                                    {(() => {
                                        const isDone = submitSummary || runResults;
                                        const allPassed = submitSummary 
                                            ? submitSummary.status === 'Accepted'
                                            : (runResults && runResults.every(r => r.passed));
                                        
                                        let statusText = 'Running...';
                                        if (isDone) {
                                            if (submitSummary) {
                                                statusText = submitSummary.status;
                                            } else {
                                                statusText = allPassed ? 'Accepted' : 'Wrong Answer';
                                            }
                                        }

                                        return (
                                            <div 
                                                className={`card ${isDone ? (allPassed ? 'accepted-glow-card' : 'failed-glow-card') : ''}`}
                                                style={{ 
                                                    padding: '1.25rem', 
                                                    textAlign: 'center', 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    alignItems: 'center', 
                                                    gap: '0.75rem',
                                                    border: isDone 
                                                        ? (allPassed ? '2px solid rgba(52,211,153,0.4)' : '2px solid rgba(239,68,68,0.4)')
                                                        : '1px solid rgba(255,255,255,0.08)',
                                                    background: isDone 
                                                        ? (allPassed 
                                                            ? 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(24,24,28,0.98) 100%)'
                                                            : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(24,24,28,0.98) 100%)')
                                                        : 'rgba(255,255,255,0.01)',
                                                    borderRadius: '16px',
                                                    boxShadow: isDone
                                                        ? (allPassed
                                                            ? '0 0 30px rgba(52,211,153,0.15), inset 0 0 30px rgba(52,211,153,0.05)'
                                                            : '0 0 30px rgba(239,68,68,0.15), inset 0 0 30px rgba(239,68,68,0.05)')
                                                        : 'none',
                                                }}
                                            >
                                                {!isDone ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div className="pulse-ring" style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(130,84,238,0.1)', display: 'grid', placeItems: 'center' }}>
                                                            <Loader2 size={32} className="animate-spin" color="#8254ee" />
                                                        </div>
                                                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#9ca3af' }}>Evaluating Test Cases...</span>
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                            {['Verifying', 'Compiling', 'Running'].map((step, i) => (
                                                                <span key={step} style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    padding: '3px 10px', 
                                                                    borderRadius: '12px', 
                                                                    background: i === 0 ? 'rgba(130,84,238,0.2)' : 'rgba(255,255,255,0.05)',
                                                                    color: i === 0 ? '#8254ee' : '#666',
                                                                    fontWeight: 500,
                                                                }}>
                                                                    {step}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div style={{ 
                                                            display: 'grid', 
                                                            placeItems: 'center', 
                                                            width: '72px', 
                                                            height: '72px', 
                                                            borderRadius: '50%', 
                                                            background: allPassed ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', 
                                                            border: allPassed ? '2px solid rgba(52,211,153,0.4)' : '2px solid rgba(239,68,68,0.4)',
                                                            boxShadow: allPassed ? '0 0 40px rgba(52,211,153,0.2)' : '0 0 40px rgba(239,68,68,0.2)',
                                                            transition: 'all 0.5s ease',
                                                        }}>
                                                            {allPassed 
                                                                ? <CheckCircle2 size={40} color="#34d399" style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.5))' }} /> 
                                                                : <XCircle size={40} color="#ef4444" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }} />
                                                            }
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                            <h2 style={{ 
                                                                margin: 0, 
                                                                fontSize: '1.8rem', 
                                                                fontWeight: 900, 
                                                                color: allPassed ? '#34d399' : '#ef4444', 
                                                                letterSpacing: '1px',
                                                                textShadow: allPassed ? '0 0 20px rgba(52,211,153,0.3)' : '0 0 20px rgba(239,68,68,0.3)',
                                                            }}>
                                                                {statusText === 'Accepted' ? 'ACCEPTED' : statusText === 'Wrong Answer' ? 'WRONG ANSWER' : statusText}
                                                            </h2>
                                                            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>
                                                                {submitSummary 
                                                                    ? `Passed ${submitSummary.testCasesPassed ?? 0} / ${submitSummary.totalTestCases ?? 0} test cases`
                                                                    : `Passed ${runResults ? runResults.filter(r => r.passed).length : 0} / ${runResults ? runResults.length : 0} sample cases`
                                                                }
                                                            </span>
                                                        </div>
                                                        {allPassed && submitSummary && (
                                                            <div style={{ 
                                                                display: 'flex', 
                                                                gap: '1rem', 
                                                                marginTop: '0.5rem',
                                                                padding: '0.5rem 1rem', 
                                                                background: 'rgba(52,211,153,0.08)', 
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(52,211,153,0.2)',
                                                            }}>
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '2px' }}>Runtime</div>
                                                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{submitSummary.runtime || '12 ms'}</div>
                                                                </div>
                                                                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '2px' }}>Memory</div>
                                                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{submitSummary.memory || '41 MB'}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Stats Grid - Premium Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                                        <div className="glassmorphism-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', backdropFilter: 'blur(10px)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(130,84,238,0.15)', display: 'grid', placeItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>🚀</span>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Runtime</span>
                                            </div>
                                            <strong style={{ display: 'block', fontSize: '1.3rem', color: '#fff', marginBottom: '2px', fontFamily: 'monospace' }}>
                                                {submitSummary ? submitSummary.runtime || '12 ms' : (runResults ? '8 ms' : '—')}
                                            </strong>
                                            {submitSummary && submitSummary.status === 'Accepted' && (
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>Beats 98.4%</span>
                                                    <span style={{ fontSize: '0.6rem', color: '#34d399' }}>⚡</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="glassmorphism-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(59,130,246,0.15)', display: 'grid', placeItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>💾</span>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Memory</span>
                                            </div>
                                            <strong style={{ display: 'block', fontSize: '1.3rem', color: '#fff', marginBottom: '2px', fontFamily: 'monospace' }}>
                                                {submitSummary ? submitSummary.memory || '41.3 MB' : (runResults ? '32.1 MB' : '—')}
                                            </strong>
                                            {submitSummary && submitSummary.status === 'Accepted' && (
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>Beats 89.2%</span>
                                                    <span style={{ fontSize: '0.6rem', color: '#34d399' }}>⚡</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="glassmorphism-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(245,158,11,0.15)', display: 'grid', placeItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>⏱</span>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Execution Time</span>
                                            </div>
                                            <strong style={{ display: 'block', fontSize: '1.3rem', color: '#fff', marginBottom: '2px', fontFamily: 'monospace' }}>
                                                {formatTime(activeTimeSeconds)}
                                            </strong>
                                            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Active Coding Time</span>
                                        </div>
                                        {submitSummary && submitSummary.status === 'Accepted' && (
                                            <div className="glassmorphism-card" style={{ padding: '1rem', background: 'rgba(231,201,101,0.06)', border: '1px solid rgba(231,201,101,0.2)', borderRadius: '14px', boxShadow: '0 0 20px rgba(231,201,101,0.08)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(231,201,101,0.2)', display: 'grid', placeItems: 'center' }}>
                                                        <span style={{ fontSize: '0.85rem' }}>💎</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: '#e7c965', fontWeight: 600 }}>Points Earned</span>
                                                </div>
                                                <strong style={{ display: 'block', fontSize: '1.5rem', color: '#e7c965', marginBottom: '2px', fontFamily: 'monospace', textShadow: '0 0 20px rgba(231,201,101,0.3)' }}>
                                                    +{submitSummary.earnedPoints}
                                                </strong>
                                                <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>
                                                    Base: {submitSummary.basePoints} pts | 
                                                    Speed: {submitSummary.speedBonus < 0 ? `${submitSummary.speedBonus}` : `+${submitSummary.speedBonus || 0}`} | 
                                                    Accuracy: +{submitSummary.accuracyBonus || 0}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Testcases List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Test Case Execution</h4>
                                        {animatedTestCaseResults.length > 0 && (
                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                                {animatedTestCaseResults.filter(t => t.status === 'Accepted' || t.passed).length}/{animatedTestCaseResults.length} passed
                                            </span>
                                        )}
                                    </div>
                                    {animatedTestCaseResults.map((tc, idx) => {
                                        const isAnimating = tc.isAnimating || animatingTestCaseIndex === idx;
                                        const hasPassed = tc.passed;
                                        
                                        return (
                                            <div 
                                                key={`${tc.caseType}-${tc.index}`}
                                                className={`glassmorphism-card ${hasPassed && tc.status !== 'Pending' ? 'test-passed-glow' : ''} ${!hasPassed && tc.status !== 'Pending' && tc.status !== 'Running...' ? 'test-failed-glow' : ''}`}
                                                style={{ 
                                                    padding: '0.85rem 1rem', 
                                                    background: isAnimating 
                                                        ? 'linear-gradient(135deg, rgba(130,84,238,0.08), rgba(0,0,0,0.2))'
                                                        : (hasPassed && tc.status !== 'Pending' 
                                                            ? 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(0,0,0,0.18))'
                                                            : 'rgba(0,0,0,0.18)'),
                                                    border: isAnimating 
                                                        ? '1px solid rgba(130,84,238,0.3)'
                                                        : (hasPassed && tc.status !== 'Pending'
                                                            ? '1px solid rgba(52,211,153,0.25)'
                                                            : (tc.status !== 'Pending' && !hasPassed
                                                                ? '1px solid rgba(239,68,68,0.25)'
                                                                : '1px solid rgba(255,255,255,0.05)')),
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.4rem',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: isAnimating 
                                                        ? '0 0 15px rgba(130,84,238,0.1)'
                                                        : (hasPassed && tc.status !== 'Pending'
                                                            ? '0 0 10px rgba(52,211,153,0.08)'
                                                            : 'none'),
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        {tc.caseType === 'sample' ? (
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8254ee', display: 'inline-block' }} />
                                                        ) : (
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e7c965', display: 'inline-block' }} />
                                                        )}
                                                        {tc.caseType === 'sample' ? `Sample Case ${tc.index}` : `Hidden Case ${tc.index}`}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        {isAnimating ? (
                                                            <Loader2 size={14} className="animate-spin" color="#8254ee" />
                                                        ) : (
                                                            tc.status !== 'Pending' && (
                                                                hasPassed ? (
                                                                    <CheckCircle2 size={16} color="#34d399" style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }} />
                                                                ) : (
                                                                    <XCircle size={16} color="#ef4444" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }} />
                                                                )
                                                            )
                                                        )}
                                                        <span 
                                                            style={{ 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: 'bold',
                                                                color: isAnimating 
                                                                    ? '#8254ee' 
                                                                    : (tc.status === 'Pending' ? '#9ca3af' : (hasPassed ? '#34d399' : '#ef4444'))
                                                            }}
                                                        >
                                                            {isAnimating ? 'Running...' : tc.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hidden warning or visible outputs */}
                                                {!isAnimating && tc.status !== 'Pending' && (
                                                    tc.caseType === 'hidden' ? (
                                                        <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic', padding: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>
                                                            🔒 Details hidden for academic integrity
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: '#d1d5db', marginTop: '0.2rem' }}>
                                                            {problem.sampleTestCases?.[tc.index - 1] && (
                                                                <>
                                                                    <div>
                                                                        <span style={{ color: '#9ca3af' }}>Input:</span>
                                                                        <pre style={{ margin: '0.2rem 0', padding: '0.4rem', background: '#090909', borderRadius: '4px', fontFamily: 'monospace' }}>
                                                                            {problem.sampleTestCases[tc.index - 1].input}
                                                                        </pre>
                                                                    </div>
                                                                    <div>
                                                                        <span style={{ color: '#9ca3af' }}>Expected Output:</span>
                                                                        <pre style={{ margin: '0.2rem 0', padding: '0.4rem', background: '#090909', borderRadius: '4px', fontFamily: 'monospace', color: '#34d399' }}>
                                                                            {problem.sampleTestCases[tc.index - 1].output}
                                                                        </pre>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {tc.stdout != null && tc.stdout !== '' && (
                                                                <div>
                                                                    <span style={{ color: '#9ca3af' }}>Actual Output:</span>
                                                                    <pre style={{ margin: '0.2rem 0', padding: '0.4rem', background: '#090909', borderRadius: '4px', fontFamily: 'monospace', color: hasPassed ? '#34d399' : '#ef4444' }}>
                                                                        {tc.stdout}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {tc.stderr && (
                                                                <div>
                                                                    <span style={{ color: '#ef4444' }}>Error:</span>
                                                                    <pre style={{ margin: '0.2rem 0', padding: '0.4rem', background: 'rgba(239,68,68,0.08)', borderRadius: '4px', fontFamily: 'monospace', color: '#fca5a5', whiteSpace: 'pre-wrap' }}>
                                                                        {tc.stderr}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                <div style={{ flex: 1, display: leftActiveTab === 'result' ? 'none' : 'flex', flexDirection: 'column', background: '#1a1a1e', minWidth: 0 }}>
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
                        
                        {/* Editor Top Bar with Font Controls */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.2rem 1rem', background: '#1e1e1e', borderBottom: '1px solid #333' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#888' }}>Font Size:</span>
                                <button onClick={() => setEditorFontSize(f => Math.max(10, f - 2))} style={{ background: 'none', border: '1px solid #444', color: '#ccc', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}><Minus size={14} /></button>
                                <span style={{ fontSize: '0.8rem', color: '#fff', minWidth: '20px', textAlign: 'center' }}>{editorFontSize}</span>
                                <button onClick={() => setEditorFontSize(f => Math.min(30, f + 2))} style={{ background: 'none', border: '1px solid #444', color: '#ccc', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}><Plus size={14} /></button>
                            </div>
                        </div>



                        <Editor
                            height="calc(100% - 30px)"
                            theme="premium-dark"
                            language={monacoLanguage(language)}
                            value={code}
                            onChange={(v) => compilerEnabled && setCode(v || '')}
                            onMount={handleEditorMount}
                            beforeMount={(monaco) => {
                                monaco.editor.defineTheme('premium-dark', {
                                    base: 'vs-dark',
                                    inherit: true,
                                    rules: [
                                        { token: 'keyword', foreground: '#4ec9b0', fontStyle: 'bold' },
                                        { token: 'keyword.control', foreground: '#4ec9b0', fontStyle: 'bold' },
                                        { token: 'keyword.operator', foreground: '#4ec9b0' },
                                        { token: 'keyword.other', foreground: '#4ec9b0' },
                                        { token: 'storage', foreground: '#4ec9b0', fontStyle: 'bold' },
                                        { token: 'storage.type', foreground: '#4ec9b0', fontStyle: 'bold' },
                                        { token: 'storage.modifier', foreground: '#4ec9b0' },
                                        { token: 'type', foreground: '#e5c07b' },
                                        { token: 'type.builtin', foreground: '#e5c07b' },
                                        { token: 'class', foreground: '#e5c07b' },
                                        { token: 'class.name', foreground: '#e5c07b' },
                                        { token: 'entity.name.type', foreground: '#e5c07b' },
                                        { token: 'entity.name.class', foreground: '#e5c07b', fontStyle: 'bold' },
                                        { token: 'entity.name.tag', foreground: '#e06c75' },
                                        { token: 'entity.name.function', foreground: '#61afef', fontStyle: 'bold' },
                                        { token: 'entity.other.attribute-name', foreground: '#d19a66' },
                                        { token: 'function', foreground: '#61afef', fontStyle: 'bold' },
                                        { token: 'function.builtin', foreground: '#61afef' },
                                        { token: 'support.function', foreground: '#61afef' },
                                        { token: 'support.class', foreground: '#e5c07b' },
                                        { token: 'support.type', foreground: '#e5c07b' },
                                        { token: 'support.constant', foreground: '#d19a66' },
                                        { token: 'variable', foreground: '#e06c75' },
                                        { token: 'variable.parameter', foreground: '#e06c75' },
                                        { token: 'variable.other', foreground: '#e06c75' },
                                        { token: 'variable.language', foreground: '#4ec9b0' },
                                        { token: 'constant', foreground: '#d19a66' },
                                        { token: 'constant.numeric', foreground: '#d19a66' },
                                        { token: 'constant.language', foreground: '#d19a66' },
                                        { token: 'constant.character', foreground: '#98c379' },
                                        { token: 'number', foreground: '#d19a66' },
                                        { token: 'string', foreground: '#98c379' },
                                        { token: 'string.quoted', foreground: '#98c379' },
                                        { token: 'string.key', foreground: '#98c379' },
                                        { token: 'string.regexp', foreground: '#56b6c2' },
                                        { token: 'string.template', foreground: '#98c379' },
                                        { token: 'comment', foreground: '#5c6370', fontStyle: 'italic' },
                                        { token: 'comment.block', foreground: '#5c6370', fontStyle: 'italic' },
                                        { token: 'comment.line', foreground: '#5c6370', fontStyle: 'italic' },
                                        { token: 'operator', foreground: '#d480aa' },
                                        { token: 'operator.arithmetic', foreground: '#d480aa' },
                                        { token: 'operator.logical', foreground: '#d480aa' },
                                        { token: 'operator.ternary', foreground: '#d480aa' },
                                        { token: 'delimiter', foreground: '#abb2bf' },
                                        { token: 'delimiter.parenthesis', foreground: '#abb2bf' },
                                        { token: 'delimiter.bracket', foreground: '#abb2bf' },
                                        { token: 'delimiter.curly', foreground: '#abb2bf' },
                                        { token: 'punctuation', foreground: '#abb2bf' },
                                        { token: 'tag', foreground: '#e06c75' },
                                        { token: 'attribute.name', foreground: '#d19a66' },
                                        { token: 'attribute.value', foreground: '#98c379' },
                                        { token: 'metatag', foreground: '#e06c75' },
                                        { token: 'markup.heading', foreground: '#61afef', fontStyle: 'bold' },
                                        { token: 'markup.bold', foreground: '#e5c07b', fontStyle: 'bold' },
                                        { token: 'markup.italic', foreground: '#e5c07b', fontStyle: 'italic' },
                                        { token: 'markup.list', foreground: '#e06c75' },
                                        { token: 'meta.import', foreground: '#56b6c2' },
                                        { token: 'keyword.control.import', foreground: '#56b6c2', fontStyle: 'bold' },
                                        { token: 'keyword.control.include', foreground: '#56b6c2', fontStyle: 'bold' },
                                        { token: 'keyword.control.from', foreground: '#56b6c2' },
                                        { token: 'entity.name.import', foreground: '#56b6c2' },
                                        { token: 'entity.name.module', foreground: '#56b6c2' },
                                        { token: 'entity.name.package', foreground: '#56b6c2' },
                                        { token: 'support.module', foreground: '#56b6c2' },
                                        { token: 'string.quoted.include', foreground: '#98c379' },
                                        { token: 'meta.preprocessor', foreground: '#56b6c2' },
                                        { token: 'meta.preprocessor.string', foreground: '#98c379' },
                                        { token: 'keyword.control.directive', foreground: '#56b6c2' },
                                    ],
                                    colors: {
                                        'editor.background': '#1a1a1e',
                                        'editor.foreground': '#abb2bf',
                                        'editorCursor.foreground': '#528bff',
                                        'editor.selectionBackground': '#3e4451',
                                        'editor.lineHighlightBackground': '#2c313a',
                                        'editorLineNumber.foreground': '#4b5363',
                                        'editorLineNumber.activeForeground': '#abb2bf',
                                        'editorIndentGuide.background': '#3b4048',
                                        'editorIndentGuide.activeBackground': '#4b5363',
                                        'editorBracketMatch.background': '#3b4048',
                                        'editorBracketMatch.border': '#528bff',
                                        'editor.selectionHighlightBackground': '#3e445180',
                                        'editorCursor.background': '#1a1a1e',
                                        'editorWhitespace.foreground': '#3b4048',
                                    }
                                });
                                monaco.editor.setTheme('premium-dark');
                            }}
                            options={{
                                readOnly: !compilerEnabled,
                                fontSize: editorFontSize + 4,
                                lineHeight: 28,
                                letterSpacing: 0.3,
                                smoothScrolling: true,
                                cursorBlinking: 'smooth',
                                cursorSmoothCaretAnimation: 'on',
                                cursorWidth: 2,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
                                fontWeight: '500',
                                fontLigatures: true,
                                formatOnType: true,
                                lineNumbers: 'on',
                                lineNumbersMinChars: 3,
                                autoIndent: 'full',
                                autoClosingBrackets: 'always',
                                autoClosingQuotes: 'always',
                                matchBrackets: 'always',
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 20, bottom: 20 },
                                contextmenu: false,
                                dragAndDrop: false,
                                selectionClipboard: false,
                                copyWithSyntaxHighlighting: false,
                                formatOnPaste: false,
                                wordWrap: 'off',
                                renderLineHighlight: 'all',
                                hideCursorInOverviewRuler: false,
                                overviewRulerBorder: false,
                                quickSuggestions: false,
                                suggestOnTriggerCharacters: false,
                                parameterHints: { enabled: false },
                                wordBasedSuggestions: 'off',
                                suggest: { showKeywords: false, showSnippets: false, showClasses: false, showFunctions: false, showMethods: false, showFields: false, showVariables: false, showConstants: false, showModules: false, showProperties: false, showReferences: false, showUnits: false, showValues: false, showInterfaces: false, showOperators: false, showTypes: false, showEnums: false, showEnumMembers: false, showIssues: false, showUsers: false, showFolders: false, showFiles: false, showColors: false, showEvents: false, showStructs: false, showTypeParameters: false },
                                hover: { enabled: false },
                                inlineSuggest: { enabled: false },
                                autoClosingBrackets: 'never',
                                autoClosingQuotes: 'never',
                                autoSurround: 'never',
                            }}
                        />
                    </div>

                    <div style={{ height: '34%', minHeight: '160px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(24,24,28,0.98)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        
                        {/* SUBMISSION ANIMATION OVERLAY */}
                        <AnimatePresence>
                            {submitState !== 'idle' && (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(24,24,28,0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}
                                >
                                    {submitState === 'verifying' && <div className="animate-slide-up" style={{ color: '#8254ee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}><Loader2 size={40} className="animate-spin" /><span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Verifying Solution...</span></div>}
                                    {submitState === 'running' && <div className="animate-slide-up" style={{ color: '#e7c965', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}><Loader2 size={40} className="animate-spin" /><span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Running Test Cases...</span></div>}
                                    {submitState === 'checking' && <div className="animate-slide-up" style={{ color: '#34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}><Loader2 size={40} className="animate-spin" /><span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Checking Memory & Performance...</span></div>}
                                    {submitState === 'done' && submitSummary && (
                                        <div className="animate-pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            {submitSummary.status === 'Accepted' ? (
                                                <><CheckCircle2 size={60} color="#34d399" /><span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>Accepted</span></>
                                            ) : (
                                                <><XCircle size={60} color="#ef4444" /><span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{submitSummary.status}</span></>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                                        ['Base Points', `${submitSummary.basePoints || 0} pts`],
                                                        ['Speed Bonus', `${submitSummary.speedBonus < 0 ? '' : '+'}${submitSummary.speedBonus || 0} pts`],
                                                        ['Accuracy Bonus', `+${submitSummary.accuracyBonus || 0} pts`],
                                                        ['Total Earned', `+${submitSummary.earnedPoints || 0} pts`],
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
            
            {/* Grand Rotating Coin Animation Overlay */}
            <SubmissionSuccessAnimation
                show={showCoinAnimation}
                points={animationEarnedPoints}
                onComplete={() => {}}
            />

            {/* Flying Gold Coins Animation Layer */}
            {coinParticles.map((coin) => (
                <div
                    key={coin.id}
                    className="coin-particle"
                    style={{
                        '--start-x': coin.startX,
                        '--start-y': coin.startY,
                        '--mid-x': coin.midX,
                        '--mid-y': coin.midY,
                        '--end-x': coin.endX,
                        '--end-y': coin.endY,
                        animationDelay: coin.delay
                    }}
                >
                    🪙
                </div>
            ))}

            {/* Exploding Gold Particles Burst */}
            {burstParticles.map((p) => (
                <div
                    key={p.id}
                    className="coin-burst-particle"
                    style={{
                        '--x': p.x,
                        '--y': p.y,
                        '--dx': p.dx,
                        '--dy': p.dy
                    }}
                />
            ))}

            <SecurityModule 
                problem={problem} 
                isCompilerEnabled={compilerEnabled} 
                setCompilerLocked={setCompilerLocked} 
                clearCode={() => setCode('')}
            />
        </div>
    );
};

export default ProblemDetail;
