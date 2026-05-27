import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Mail, Lock, Calendar, Layers, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { auth, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const ADMIN_PORTALS = [
    { id: 'hod', label: 'HOD' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'labadmin', label: 'Lab Admin' },
];

const LoginPage = () => {
    const [isStudent, setIsStudent] = useState(true);
    const [regNo, setRegNo] = useState('');
    const [studentInfo, setStudentInfo] = useState(null);
    const [assignedLabs, setAssignedLabs] = useState([]);
    const [selectedLab, setSelectedLab] = useState('');
    const [labStatuses, setLabStatuses] = useState({});
    const [checkingLab, setCheckingLab] = useState(false);
    const [adminPortal, setAdminPortal] = useState('hod');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginAdmin } = useAuth();
    const navigate = useNavigate();

    const fetchStudentLabs = useCallback(async (reg) => {
        const trimmed = String(reg).trim();
        if (!trimmed || trimmed.length < 3) return;
        setCheckingLab(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/check-lab', { regNo: trimmed });
            const data = res.data;
            setStudentInfo(data);
            const labs = data.assignedLabs || [];
            setAssignedLabs(labs);
            if (labs.length > 0) {
                setSelectedLab(labs[0]);
                // Check status of each lab
                const statuses = {};
                for (const lab of labs) {
                    try {
                        const sres = await axios.get(`http://localhost:5000/api/auth/lab-active?lab=${encodeURIComponent(lab)}`);
                        statuses[lab] = sres.data;
                    } catch { statuses[lab] = { active: false, reason: 'Could not verify' }; }
                }
                setLabStatuses(statuses);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setStudentInfo(null);
                setAssignedLabs([]);
                setSelectedLab('');
                setError('Student not found. Please register first.');
                setTimeout(() => navigate('/register'), 2000);
            } else {
                setError(err.response?.data?.message || 'Could not fetch student info');
            }
        } finally {
            setCheckingLab(false);
        }
    }, [navigate]);

    // Fetch labs when regNo stabilizes (on blur)
    const handleRegNoBlur = () => {
        if (String(regNo).trim().length >= 3) {
            fetchStudentLabs(regNo);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!isStudent && (!isFirebaseConfigured || !auth)) {
            setError('Firebase configuration missing. Set VITE_FIREBASE_* in frontend/.env and restart.');
            setIsLoading(false);
            return;
        }

        try {
            if (isStudent) {
                const trimmedRegNo = String(regNo).trim();
                if (!selectedLab) {
                    setError('Please select a lab to continue.');
                    setIsLoading(false);
                    return;
                }
                await login(trimmedRegNo, password, selectedLab);
                setIsLoading(false);
                navigate('/dashboard');
            } else {
                // Step 1: Verify credentials via Firebase client SDK
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    console.log('[LOGIN] Firebase OK:', userCredential.user.email);
                } catch (fbErr) {
                    console.error('[LOGIN] Firebase Auth failed:', fbErr.code);
                    const code = fbErr.code;
                    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                        setError('Invalid email or password');
                    } else if (code === 'auth/invalid-email') {
                        setError('Invalid email format');
                    } else if (code === 'auth/too-many-requests') {
                        setError('Too many attempts. Try again later.');
                    } else if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key') {
                        setError('Firebase configuration missing. Check your .env file.');
                    } else if (code === 'auth/network-request-failed') {
                        setError('Network error. Check your connection.');
                    } else {
                        setError('Invalid email or password');
                    }
                    setIsLoading(false);
                    return;
                }

                // Step 2: Call backend for role lookup
                const data = await loginAdmin(email, password, adminPortal);
                const role = data.role || data.admin?.role;

                // Step 3: Redirect based on role
                if (role === 'hod') navigate('/hod-dashboard');
                else if (role === 'faculty') navigate('/faculty-dashboard');
                else if (role === 'labadmin' || role === 'labAdmin') navigate('/lab-admin-dashboard');
                else navigate('/login');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Invalid email or password';
            if (msg.includes('Network Error') || err.message === 'Network Error') {
                setError('Network error. Check your connection.');
            } else {
                setError(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegNoChange = (e) => {
        const val = e.target.value;
        setRegNo(val);
        if (!val.trim()) {
            setStudentInfo(null);
            setAssignedLabs([]);
            setSelectedLab('');
            setLabStatuses({});
        }
    };

    return (
        <div
            className="login-container"
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 20, repeat: Infinity }}
                style={{
                    position: 'absolute',
                    width: '50vw',
                    height: '50vw',
                    background: 'radial-gradient(circle, rgba(130,84,238,0.15) 0%, rgba(0,0,0,0) 70%)',
                    top: '-10%',
                    left: '-10%',
                    zIndex: 0,
                }}
            />
            <motion.div
                animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
                transition={{ duration: 25, repeat: Infinity }}
                style={{
                    position: 'absolute',
                    width: '40vw',
                    height: '40vw',
                    background: 'radial-gradient(circle, rgba(130,84,238,0.15) 0%, rgba(0,0,0,0) 70%)',
                    bottom: '-10%',
                    right: '-10%',
                    zIndex: 0,
                }}
            />
 
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="card"
                style={{ width: '100%', maxWidth: '480px', zIndex: 1, paddingTop: '2.5rem', background: 'rgba(9,9,9,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <motion.img
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            src="/logos/rgm-logo.jpeg"
                            alt="RGM Logo"
                            style={{
                                height: '65px',
                                width: '65px',
                                objectFit: 'contain',
                                borderRadius: '18px',
                                padding: '6px',
                                background: 'rgba(255,255,255,0.08)',
                                boxShadow: '0 0 20px rgba(130,84,238,0.4)',
                            }}
                            onError={(e) => { e.currentTarget.src = '/logos/default-logo.png'; }}
                        />
                        <div style={{ width: '2px', height: '45px', background: 'rgba(255,255,255,0.1)' }} />
                        <motion.img
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            src="/logos/ripple-logo.png"
                            alt="Ripple Logo"
                            style={{
                                height: '65px',
                                width: '65px',
                                objectFit: 'contain',
                                borderRadius: '18px',
                                padding: '6px',
                                background: 'rgba(255,255,255,0.08)',
                                boxShadow: '0 0 20px rgba(130,84,238,0.4)',
                            }}
                            onError={(e) => { e.currentTarget.src = '/logos/default-logo.png'; }}
                        />
                    </div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(to right, #8254ee, #82717b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: '1px' }}>
                        RGMCSE COMPILER
                    </h1>
                    <p style={{ color: '#ffffff', margin: '0.5rem 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        Rajeev Gandhi Memorial College Of Engineering And Technology
                    </p>
                    <p style={{ color: '#e7c965', margin: '0.2rem 0', fontWeight: '600', fontSize: '0.85rem' }}>
                        Department of Computer Science and Engineering
                    </p>
                </div>
 
                <div style={{ display: 'flex', marginBottom: '1.5rem', backgroundColor: '#090909', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button type="button" onClick={() => { setIsStudent(true); setError(''); }} style={{ flex: 1, padding: '10px', backgroundColor: isStudent ? '#8254ee' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: isStudent ? 'bold' : 'normal' }}>
                        Student
                    </button>
                    <button type="button" onClick={() => { setIsStudent(false); setError(''); }} style={{ flex: 1, padding: '10px', backgroundColor: !isStudent ? '#8254ee' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: !isStudent ? 'bold' : 'normal' }}>
                        Staff
                    </button>
                </div>
 
                {error && <div style={{ color: '#ff5c5c', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
 
                <form onSubmit={handleSubmit}>
                    {isStudent ? (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.85rem' }}>Registration Number</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="text"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        placeholder="e.g. 24091a0514"
                                        value={regNo}
                                        onChange={handleRegNoChange}
                                        onBlur={handleRegNoBlur}
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Lab Selection Dropdown - Shows after regNo entered */}
                            {checkingLab && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#9ca3af', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(130,84,238,0.08)', borderRadius: '8px' }}>
                                    <Loader2 size={16} className="animate-spin" />
                                    Checking lab assignments...
                                </div>
                            )}

                            {assignedLabs.length > 0 && !checkingLab && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.85rem' }}>
                                        <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        Select Lab
                                    </label>
                                    <select
                                        className="card"
                                        style={{ width: '100%', padding: '10px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                        value={selectedLab}
                                        onChange={(e) => setSelectedLab(e.target.value)}
                                    >
                                        {assignedLabs.map(lab => {
                                            const status = labStatuses[lab];
                                            const isActive = status?.active;
                                            return (
                                                <option key={lab} value={lab} disabled={!isActive} style={{ background: '#090909' }}>
                                                    {lab} {isActive ? '🟢' : '🔴'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {selectedLab && labStatuses[selectedLab] && (
                                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: labStatuses[selectedLab].active ? '#34d399' : '#f87171' }}>
                                            {labStatuses[selectedLab].active ? (
                                                <><CheckCircle2 size={12} /><span>Lab is active</span></>
                                            ) : (
                                                <><AlertCircle size={12} /><span>{labStatuses[selectedLab].reason || 'Lab is not currently active'}</span></>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {studentInfo && !checkingLab && (
                                <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#9ca3af', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                    Welcome, <strong style={{ color: '#e7c965' }}>{studentInfo.name}</strong> — {studentInfo.semester || studentInfo.year || ''}
                                </div>
                            )}
 
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.85rem' }}>Password (Date of Birth)</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="password"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        placeholder="DD-MM-YYYY"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', padding: '6px 10px', background: 'rgba(52, 211, 153, 0.08)', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
                                <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Your password is your Date of Birth in <strong>DD-MM-YYYY</strong> format (e.g., 12-08-2005)
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Sign in as</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {ADMIN_PORTALS.map((p) => (
                                        <button key={p.id} type="button" onClick={() => setAdminPortal(p.id)} style={{ flex: '1 1 120px', padding: '8px', borderRadius: '8px', border: adminPortal === p.id ? '2px solid #8254ee' : '1px solid rgba(255,255,255,0.1)', background: adminPortal === p.id ? 'rgba(130,84,238,0.2)' : '#090909', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input type="email" className="card" style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input type="password" className="card" style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                                </div>
                            </div>
                        </>
                    )}
 
                    <motion.button
                        whileHover={isLoading ? {} : { scale: 1.02 }}
                        whileTap={isLoading ? {} : { scale: 0.98 }}
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: assignedLabs.length > 0 && selectedLab && labStatuses[selectedLab] && !labStatuses[selectedLab].active ? 'linear-gradient(135deg, #666, #444)' : 'linear-gradient(135deg, #8254ee, #3b353c)', border: 'none', color: 'white', fontWeight: 'bold', opacity: (assignedLabs.length > 0 && selectedLab && labStatuses[selectedLab] && !labStatuses[selectedLab].active) || isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                        disabled={isLoading || (assignedLabs.length > 0 && selectedLab && labStatuses[selectedLab] && !labStatuses[selectedLab].active)}
                    >
                        {isLoading ? (
                            <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                        ) : (
                            <><LogIn size={18} /> Login</>
                        )}
                    </motion.button>
                </form>
 
                {isStudent && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <span style={{ color: '#c1cfc1', fontSize: '0.9rem' }}>New student? </span>
                        <button type="button" onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: '#8254ee', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0 }}>Register here</button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default LoginPage;
