import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Play, Send, Layout, ShieldAlert, ChevronLeft, Clock, Code2, Terminal, Info, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProblemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, theme } = useAuth();
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showWarning, setShowWarning] = useState(false);

    const triggerWarning = () => {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
    };

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/questions/${id}`);
                setProblem(res.data);
                // Set default code boilerplate
                setCode(getBoilerplate('javascript'));
            } catch (err) {
                setError("Problem not found");
            }
        };
        fetchProblem();

        const handleClipboard = (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerWarning();
            console.warn("Copy/Paste is disabled during coding assessment");
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            triggerWarning();
            console.warn("Copy/Paste is disabled during coding assessment");
        };

        const handleKeyDown = (e) => {
            // Block Ctrl/Cmd + C, V, X
            if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'C', 'V', 'X'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                triggerWarning();
                console.warn("Copy/Paste is disabled during coding assessment");
            }
            // Block developer tools (F12, Ctrl+Shift+I)
            if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
                e.preventDefault();
                e.stopPropagation();
                triggerWarning();
                console.warn("Copy/Paste is disabled during coding assessment");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning();
                console.warn("WARNING: Tab switching detected! This action has been recorded.");
            }
        };

        // Use capture phase (true) to intercept before other handlers
        window.addEventListener('copy', handleClipboard, true);
        window.addEventListener('paste', handleClipboard, true);
        window.addEventListener('cut', handleClipboard, true);
        window.addEventListener('contextmenu', handleContextMenu, true);
        window.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('copy', handleClipboard, true);
            window.removeEventListener('paste', handleClipboard, true);
            window.removeEventListener('cut', handleClipboard, true);
            window.removeEventListener('contextmenu', handleContextMenu, true);
            window.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [id]);

    const getBoilerplate = (lang) => {
        switch(lang) {
            case 'javascript': return '// Write your solution here\nfunction solution() {\n  \n}';
            case 'python': return '# Write your solution here\ndef solution():\n    pass';
            case 'java': return 'public class Solution {\n    public static void main(String[] args) {\n        \n    }\n}';
            default: return '';
        }
    };

    const handleRun = async () => {
        setSubmitting(true);
        try {
            const res = await axios.post('http://localhost:5000/api/execute/run', {
                code,
                language,
                questionId: id
            });
            setResults(res.data.results);
            console.log("Run completed successfully");
        } catch (err) {
            console.error("Error running code");
        }
        setSubmitting(false);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await axios.post('http://localhost:5000/api/execute/submit', {
                code,
                language,
                questionId: id,
                userId: user.id
            });
            setResults([res.data]);
            console.log("Submission successful");
        } catch (err) {
            console.error("Error submitting code");
        }
        setSubmitting(false);
    };

    const handleEditorDidMount = (editor, monaco) => {
        // Block keyboard shortcuts directly in the Monaco Editor
        editor.onKeyDown((e) => {
            const isModifier = e.ctrlKey || e.metaKey;
            const key = e.browserEvent.key.toLowerCase();
            if (isModifier && (key === 'c' || key === 'v' || key === 'x')) {
                e.preventDefault();
                e.stopPropagation();
                triggerWarning();
                console.warn("Copy/Paste is disabled during coding assessment");
            }
        });

        // Block clipboard actions strictly on the editor DOM node
        const editorNode = editor.getDomNode();
        if (editorNode) {
            const blockEvent = (e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerWarning();
                console.warn("Copy/Paste is disabled during coding assessment");
            };
            editorNode.addEventListener('copy', blockEvent, true);
            editorNode.addEventListener('paste', blockEvent, true);
            editorNode.addEventListener('cut', blockEvent, true);
            editorNode.addEventListener('contextmenu', blockEvent, true);
            editorNode.addEventListener('drop', blockEvent, true);
        }
    };

    if (error) return <div style={{ padding: '2rem', textAlign: 'center' }}>{error}</div>;
    if (!problem) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg)', overflow: 'hidden' }}>
            {/* Top Navbar */}
            <header style={{ height: '70px', background: 'var(--glass-gradient)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', zIndex: 100, boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
                        <ChevronLeft size={24} />
                    </motion.button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginRight: '1rem' }}>
                            <motion.img 
                                whileHover={{ scale: 1.1 }} 
                                src="/logos/rgm-logo.jpeg" 
                                alt="RGM Logo" 
                                style={{ 
                                    height: '40px', 
                                    width: '40px', 
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    padding: '4px',
                                    background: 'rgba(255,255,255,0.08)',
                                    boxShadow: '0 0 15px rgba(130,84,238,0.3)',
                                    zIndex: 1000,
                                    opacity: 1,
                                    display: 'block'
                                }} 
                                onError={(e) => { e.currentTarget.src = "/logos/default-logo.png"; }} 
                            />
                            <div style={{ width: '2px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <motion.img 
                                whileHover={{ scale: 1.1 }} 
                                src="/logos/ripple-logo.png" 
                                alt="Ripple Logo" 
                                style={{ 
                                    height: '40px', 
                                    width: '40px', 
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    padding: '4px',
                                    background: 'rgba(255,255,255,0.08)',
                                    boxShadow: '0 0 15px rgba(130,84,238,0.3)',
                                    zIndex: 1000,
                                    opacity: 1,
                                    display: 'block'
                                }} 
                                onError={(e) => { e.currentTarget.src = "/logos/default-logo.png"; }} 
                            />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{problem.title}</h2>
                            <p style={{ fontSize: '0.75rem', color: 'gray', margin: 0 }}>Difficulty: <span style={{ color: problem.difficulty === 'Easy' ? '#10b981' : problem.difficulty === 'Medium' ? '#f59e0b' : '#ef4444' }}>{problem.difficulty}</span></p>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <select 
                            value={language} 
                            onChange={(e) => {setLanguage(e.target.value); setCode(getBoilerplate(e.target.value))}}
                            className="glass" 
                            style={{ padding: '8px 15px', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                        </select>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn glass" onClick={handleRun} disabled={submitting} style={{ padding: '8px 20px', borderRadius: '12px' }}>
                        <Play size={16} /> Run
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 25px', borderRadius: '12px' }}>
                        <Send size={16} /> Submit
                    </motion.button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Side: Problem Content */}
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ width: '40%', padding: '2rem', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: '600' }}>
                        <Info size={20} /> Description
                    </div>
                    
                    <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', marginBottom: '2rem' }}>
                        <p style={{ lineHeight: '1.7', fontSize: '1rem', opacity: 0.9 }}>{problem.description}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', marginBottom: '1rem' }}><Layout size={18} className="text-primary"/> Requirements</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                    <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'gray' }}>Input Format</p>
                                    <p style={{ fontSize: '0.9rem' }}>{problem.inputFormat}</p>
                                </div>
                                <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                    <p style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'gray' }}>Output Format</p>
                                    <p style={{ fontSize: '0.9rem' }}>{problem.outputFormat}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', marginBottom: '1rem' }}><ShieldAlert size={18} className="text-primary"/> Constraints</h3>
                            <pre style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.05)', color: '#d1d5db' }}>{problem.constraints}</pre>
                        </div>

                        <div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', marginBottom: '1rem' }}><CheckCircle2 size={18} className="text-primary"/> Examples</h3>
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {problem.sampleTestCases?.map((tc, i) => (
                                    <div key={i} className="card" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'gray', marginBottom: '0.4rem' }}>Input {i+1}</p>
                                            <pre style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>{tc.input}</pre>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'gray', marginBottom: '0.4rem' }}>Output {i+1}</p>
                                            <pre style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>{tc.output}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Editor & Console */}
                <div style={{ width: '60%', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '10px', right: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'gray', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '20px' }}>
                            <Clock size={14} /> Time Remaining: 45:00
                        </div>
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={language}
                            value={code}
                            onChange={(val) => setCode(val)}
                            onMount={handleEditorDidMount}
                            options={{
                                fontSize: 15,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 30 },
                                fontFamily: "'JetBrains Mono', monospace",
                                cursorSmoothCaretAnimation: true,
                                smoothScrolling: true,
                                lineNumbersMinChars: 3,
                                contextmenu: false,
                                dragAndDrop: false,
                                selectionClipboard: false,
                                formatOnPaste: false,
                                suggestOnTriggerCharacters: false,
                            }}
                        />
                    </div>
                    
                    {/* Console Panel */}
                    <motion.div initial={{ y: 20 }} animate={{ y: 0 }} style={{ height: '35%', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30, 30, 30, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'gray' }}>
                            <Terminal size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Execution Console</span>
                        </div>
                        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                            {results ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {results.map((res, i) => (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="card" style={{ padding: '1.2rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    {(res.status?.description === 'Accepted' || res.status === 'Accepted') ? 
                                                        <CheckCircle2 size={20} color="#10b981" /> : 
                                                        <XCircle size={20} color="#ef4444" />
                                                    }
                                                    <span style={{ fontWeight: 'bold', fontSize: '1rem', color: (res.status?.description === 'Accepted' || res.status === 'Accepted') ? '#10b981' : '#ef4444' }}>
                                                        {res.status?.description || res.status}
                                                    </span>
                                                </div>
                                                {res.timeComplexity && (
                                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'gray' }}>
                                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>⏱️ {res.timeComplexity}</span>
                                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>💾 {res.spaceComplexity}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {res.stdout && (
                                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'gray', marginBottom: '0.5rem' }}>Standard Output</p>
                                                    <pre style={{ margin: 0, fontSize: '0.85rem', color: '#e5e7eb' }}>{res.stdout}</pre>
                                                </div>
                                            )}
                                            {res.compile_output && (
                                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '0.5rem' }}>Compilation Error</p>
                                                    <pre style={{ margin: 0, fontSize: '0.85rem', color: '#fca5a5' }}>{res.compile_output}</pre>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'gray', gap: '1rem' }}>
                                    <Terminal size={48} style={{ opacity: 0.2 }} />
                                    <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Execute your code to see the results here</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Warning Overlay */}
            <AnimatePresence>
                {showWarning && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 50 }}
                        style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)', fontWeight: 'bold' }}>
                            <ShieldAlert size={20} /> Security Violation Detected!
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProblemDetail;
