import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const ADMIN_PORTALS = [
    { id: 'hod', label: 'HOD' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'labadmin', label: 'Lab Admin' },
    { id: 'admin', label: 'Admin' },
];

/**
 * Login: students use Registration Number + DOB; staff use email + password with a role portal.
 */
const LoginPage = () => {
    const [isStudent, setIsStudent] = useState(true);
    const [regNo, setRegNo] = useState('');
    const [adminPortal, setAdminPortal] = useState('hod');
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
                const trimmedRegNo = String(regNo).trim();
                await login(trimmedRegNo, password);
                navigate('/dashboard');
            } else {
                const data = await loginAdmin(email, password, adminPortal);
                const role = data.role || data.admin?.role;
                if (role === 'superadmin' || role === 'hod') navigate('/super-admin');
                else if (role === 'labadmin') navigate('/lab-admin');
                else if (role === 'admin' || role === 'faculty') navigate('/admin');
                else navigate('/login');
            }
        } catch (err) {
            if (isStudent && err.response?.status === 404) {
                setError('Student account not found. Please register first.');
                setTimeout(() => {
                    navigate('/register');
                }, 2000);
            } else {
                setError(err.response?.data?.message || 'Invalid credentials');
            }
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
                fontFamily: 'Times New Roman, serif',
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
                style={{ width: '100%', maxWidth: '460px', zIndex: 1, paddingTop: '2.5rem', background: 'rgba(9,9,9,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' }}
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
                            background: 'linear-gradient(to right, #8254ee, #82717b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            letterSpacing: '1px',
                        }}
                    >
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
                    <button
                        type="button"
                        onClick={() => setIsStudent(true)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: isStudent ? '#8254ee' : 'transparent',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: isStudent ? 'bold' : 'normal',
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
                            backgroundColor: !isStudent ? '#8254ee' : 'transparent',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontWeight: !isStudent ? 'bold' : 'normal',
                        }}
                    >
                        Staff
                    </button>
                </div>
 
                {error && <div style={{ color: '#ff5c5c', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
 
                <form onSubmit={handleSubmit}>
                    {isStudent ? (
                        <>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Registration number</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="text"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        placeholder="e.g. 24091a0514"
                                        value={regNo}
                                        onChange={(e) => setRegNo(e.target.value)}
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="password"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: '#c1cfc1', textAlign: 'center', padding: '10px', background: 'rgba(0, 208, 132, 0.1)', borderRadius: '8px', border: '1px solid rgba(0, 208, 132, 0.3)' }}>
                                <strong>Test Credentials:</strong><br/>
                                Reg/Email: <b>syedamanmirzanulla@gmail.com</b> · Pass: <b>Syed@123</b><br/>
                                Staff/HOD: <b>syedamanmirzanulla@gmail.com</b> / <b>Syed@123</b>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Sign in as</label>
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
                                                border: adminPortal === p.id ? '2px solid #8254ee' : '1px solid rgba(255,255,255,0.1)',
                                                background: adminPortal === p.id ? 'rgba(130,84,238,0.2)' : '#090909',
                                                color: 'white',
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
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="email"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        placeholder="you@college.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#c1cfc1' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                    <input
                                        type="password"
                                        className="card"
                                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
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
                        style={{ width: '100%', justifyContent: 'center', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8254ee, #3b353c)', border: 'none', color: 'white', fontWeight: 'bold' }}
                    >
                        <LogIn size={18} />
                        Login
                    </motion.button>
                </form>

                {isStudent && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <span style={{ color: '#c1cfc1', fontSize: '0.9rem' }}>New student? </span>
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#8254ee',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                padding: 0
                            }}
                        >
                            Register here
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default LoginPage;
