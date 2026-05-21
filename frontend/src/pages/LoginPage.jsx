import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Mail, Lock, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const ADMIN_PORTALS = [
    { id: 'superadmin', label: 'Super Admin' },
    { id: 'labadmin', label: 'Lab Admin' },
    { id: 'admin', label: 'Faculty / Admin' },
];

/**
 * Login: students use Registration Number + DOB; staff use email + password with a role portal.
 */
const LoginPage = () => {
    const [isStudent, setIsStudent] = useState(true);
    const [regNo, setRegNo] = useState('');
    const [dob, setDob] = useState('');
    const [adminPortal, setAdminPortal] = useState('superadmin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loginAdmin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isStudent) {
                await login(regNo, dob);
                navigate('/dashboard');
            } else {
                const data = await loginAdmin(email, password, adminPortal);
                const role = data.role || data.admin?.role;
                if (role === 'superadmin') navigate('/super-admin');
                else if (role === 'labadmin') navigate('/lab-admin');
                else if (role === 'admin') navigate('/admin');
                else navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
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
                    background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(0,0,0,0) 70%)',
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
                    background: 'radial-gradient(circle, rgba(186,230,253,0.15) 0%, rgba(0,0,0,0) 70%)',
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
                style={{ width: '100%', maxWidth: '460px', zIndex: 1, paddingTop: '2.5rem', background: 'rgba(255,255,255,0.08)' }}
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
                                display: 'block',
                            }}
                            onError={(e) => {
                                e.currentTarget.src = '/logos/default-logo.png';
                            }}
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
                                display: 'block',
                            }}
                            onError={(e) => {
                                e.currentTarget.src = '/logos/default-logo.png';
                            }}
                        />
                    </div>
                    <h1
                        style={{
                            fontSize: '1.8rem',
                            fontWeight: '800',
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            letterSpacing: '1px',
                        }}
                    >
                        RGMCET COMPILER
                    </h1>
                    <p style={{ color: '#ffffff', margin: '0.5rem 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        Rajeev Gandhi Memorial College Of Engineering And Technology
                    </p>
                    <p style={{ color: '#e7c965', margin: '0.2rem 0', fontWeight: '600', fontSize: '0.85rem' }}>
                        Department of Computer Science and Engineering
                    </p>
                </div>

                <div style={{ display: 'flex', marginBottom: '1.5rem', backgroundColor: 'var(--bg)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <button
                        type="button"
                        onClick={() => setIsStudent(true)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: isStudent ? 'var(--primary)' : 'transparent',
                            color: isStudent ? 'white' : 'var(--text)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                        }}
                    >
                        Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsStudent(false)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: !isStudent ? 'var(--primary)' : 'transparent',
                            color: !isStudent ? 'white' : 'var(--text)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                        }}
                    >
                        Staff
                    </button>
                </div>

                {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    {isStudent ? (
                        <>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Registration number</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="text"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem' }}
                                        placeholder="e.g. 24091a0514 (case insensitive)"
                                        value={regNo}
                                        onChange={(e) => setRegNo(e.target.value)}
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date of birth</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="text"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem' }}
                                        placeholder="DD/MM/YYYY (e.g. 26/03/2006)"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        required
                                        autoComplete="bday"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'gray', textAlign: 'center', padding: '10px', background: 'var(--bg)', borderRadius: '8px' }}>
                                Demo: Reg <b>24091A0514</b> · DOB <b>26/03/2006</b>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Sign in as</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {ADMIN_PORTALS.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setAdminPortal(p.id)}
                                            style={{
                                                flex: '1 1 120px',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: adminPortal === p.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                background: adminPortal === p.id ? 'rgba(130,84,238,0.2)' : 'transparent',
                                                color: 'var(--text)',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="email"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem' }}
                                        placeholder="you@college.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="password"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem' }}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <LogIn size={18} />
                        Login
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default LoginPage;
