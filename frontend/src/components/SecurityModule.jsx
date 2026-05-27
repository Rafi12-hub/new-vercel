import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SecurityModule = ({ problem, isCompilerEnabled, setCompilerLocked, clearCode }) => {
    const { user } = useAuth();
    const [examModeActive, setExamModeActive] = useState(false);
    const socketRef = useRef(null);
    const [toast, setToast] = useState(null); // Keep for critical UI errors, not warnings

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const reportViolation = useCallback(async (type, details) => {
        try {
            if (clearCode) clearCode(); // IMMEDAITELY CLEAR CODE
            
            const token = localStorage.getItem('token');
            const uid = user?._id || user?.id;
            if (!uid) return;
            
            await axios.post('http://localhost:5000/api/security/violation', {
                userId: uid,
                type,
                details,
                labName: problem?.labName || 'Compiler Lab',
                severity: 'critical'
            }, {
                headers: { 'x-auth-token': token }
            });

            setCompilerLocked(true); // Auto-lock
            
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
    }, [user, problem, setCompilerLocked, clearCode]);

    // SCREENSHOT & TAB SWITCH SECURITY
    useEffect(() => {
        if (!examModeActive) return;

        const handleKeyDown = (e) => {
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                reportViolation('PrintScreen Detected', 'User attempted to use PrintScreen key.');
                navigator.clipboard.writeText('');
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key)) {
                e.preventDefault();
                reportViolation('Screenshot Shortcut', 'User attempted screenshot via keyboard shortcut.');
                navigator.clipboard.writeText('');
            }
            if (e.key === 'Escape' || e.key === 'F11' || e.key === 'Tab' || e.key === 'Meta' || e.key === 'Windows') {
                e.preventDefault();
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                reportViolation('Tab Switch / Minimize', 'User switched tabs or minimized window.');
            }
        };

        const handleBlur = () => {
            reportViolation('Window Blur / Focus Loss', 'Window lost focus.');
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
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
    }, [examModeActive, reportViolation]);

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
                    background: '#090909',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c1cfc1',
                    padding: '2rem'
                }}>
                    <ShieldAlert size={64} color="#8254ee" style={{ marginBottom: '1.5rem' }} />
                    <h1 style={{ marginBottom: '1rem', textAlign: 'center', color: '#e7c965' }}>Secure Compiler Ready</h1>
                    <p style={{ textAlign: 'center', maxWidth: '500px', color: '#82717b', marginBottom: '2rem', lineHeight: 1.5 }}>
                        This lab requires strict focus. Switching tabs, minimizing the window, or exiting fullscreen will immediately CLEAR your code, log a violation, and notify the HOD.
                    </p>
                    <button
                        onClick={enterExamMode}
                        style={{
                            background: 'linear-gradient(135deg, #8254ee 0%, #82717b 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 30px',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(130, 84, 238, 0.4)'
                        }}
                    >
                        Enter Fullscreen Mode
                    </button>
                </div>
            )}
        </>
    );
};

export default SecurityModule;
