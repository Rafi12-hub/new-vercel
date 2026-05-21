import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SecurityModule = ({ problem, isCompilerEnabled, setCompilerLocked }) => {
    const { user } = useAuth();
    const [toast, setToast] = useState(null);
    const [violationCount, setViolationCount] = useState(0);
    const [examModeActive, setExamModeActive] = useState(false);
    const socketRef = useRef(null);

    const showWarning = useCallback((msg) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const reportViolation = useCallback(async (type, details, lockInstantly = false) => {
        try {
            const token = localStorage.getItem('token');
            const uid = user?._id || user?.id;
            if (!uid) return;
            
            await axios.post('http://localhost:5000/api/security/violation', {
                userId: uid,
                type,
                details,
                labName: problem?.labName || 'Compiler Lab',
                severity: lockInstantly ? 'critical' : 'high'
            }, {
                headers: { 'x-auth-token': token }
            });

            setViolationCount(prev => {
                const next = prev + 1;
                if (next >= 3 || lockInstantly) {
                    setCompilerLocked(true); // Auto-lock
                    showWarning(`Critical Violation: ${type}. Compilation locked.`);
                }
                return next;
            });
            
            if (socketRef.current) {
                socketRef.current.emit('securityViolation', {
                    userId: uid,
                    type,
                    details,
                    userName: user?.name,
                    regNo: user?.regNo
                });
            }
        } catch (err) {
            console.error('Failed to report violation:', err);
        }
    }, [user, problem, setCompilerLocked, showWarning]);

    // SCREENSHOT & TAB SWITCH SECURITY
    useEffect(() => {
        if (!examModeActive) return;

        const handleKeyDown = (e) => {
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                showWarning("Unauthorized photo capture detected. Compilation locked.");
                reportViolation('PrintScreen Detected', 'User attempted to use PrintScreen key.', true);
                navigator.clipboard.writeText('');
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key)) {
                e.preventDefault();
                showWarning("Unauthorized photo capture detected. Compilation locked.");
                reportViolation('Screenshot Shortcut', 'User attempted screenshot via keyboard shortcut.', true);
                navigator.clipboard.writeText('');
            }
            if (e.key === 'Escape' || e.key === 'F11' || e.key === 'Tab' || e.key === 'Meta' || e.key === 'Windows') {
                e.preventDefault();
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                showWarning("Tab switching is prohibited during lab.");
                reportViolation('Tab Switch / Minimize', 'User switched tabs or minimized window.');
            }
        };

        const handleBlur = () => {
            showWarning("Tab switching is prohibited during lab.");
            reportViolation('Window Blur / Focus Loss', 'Window lost focus.');
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                showWarning("Fullscreen exit detected. You must remain in fullscreen.");
                reportViolation('Fullscreen Exit', 'User exited fullscreen mode.');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [examModeActive, reportViolation, showWarning]);

    const enterExamMode = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
            setExamModeActive(true);
        } catch (err) {
            alert("Failed to enter fullscreen. Please ensure your browser allows fullscreen mode.");
        }
    };

    return (
        <>
            {!examModeActive && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    padding: '2rem'
                }}>
                    <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                    <h1 style={{ marginBottom: '1rem', textAlign: 'center' }}>Secure Exam Mode Required</h1>
                    <p style={{ textAlign: 'center', maxWidth: '500px', color: 'gray', marginBottom: '2rem', lineHeight: 1.5 }}>
                        This lab requires strict exam security. Fullscreen is mandatory. Tab switching, minimizing the window, or exiting fullscreen will result in immediate violations and compiler lock.
                    </p>
                    <button
                        onClick={enterExamMode}
                        style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        Enter Fullscreen Exam Mode
                    </button>
                </div>
            )}
            
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        style={{ position: 'fixed', top: '1.25rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}
                        className="no-mirror"
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                background: '#090909',
                                color: '#e7c965',
                                border: '1px solid #ef4444',
                                padding: '16px 24px',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(239, 68, 68, 0.4)',
                                fontWeight: 600,
                                fontSize: '1rem',
                            }}
                        >
                            <ShieldAlert size={24} color="#ef4444" />
                            {toast}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SecurityModule;
