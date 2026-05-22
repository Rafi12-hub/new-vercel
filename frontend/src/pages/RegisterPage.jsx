import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, BookOpen, UserCheck, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const LAB_OPTIONS = [
    'C', 
    'DS', 
    'ADSAA', 
    'JAVA', 
    'PYTHON', 
    'DBMS', 
    'OS', 
    'CN', 
    'AI', 
    'ML', 
    'FSAD'
];

const YEAR_OPTIONS = [
    '1st Year', '2nd Year', '3rd Year', '4th Year'
];

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [regNo, setRegNo] = useState('');
    const [classAndYear, setClassAndYear] = useState('2nd Year');
    const [selectedLab, setSelectedLab] = useState('DBMS');
    const [facultyName, setFacultyName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic Client validations
        if (!name || !email || !regNo || !classAndYear || !selectedLab || !facultyName || !password) {
            setError('All fields are required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            // Trim regNo and clean it up
            const cleanedRegNo = String(regNo).trim();

            await register({
                name,
                email,
                regNo: cleanedRegNo,
                classAndYear,
                selectedLab,
                facultyName,
                password
            });

            setSuccess('Registration successful! Redirecting to dashboard...');
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                padding: '40px 20px',
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
                style={{ 
                    width: '100%', 
                    maxWidth: '520px', 
                    zIndex: 1, 
                    padding: '2.5rem', 
                    background: 'rgba(9,9,9,0.85)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '1rem', 
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)' 
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <motion.img
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            src="/logos/rgm-logo.jpeg"
                            alt="RGM Logo"
                            style={{
                                height: '55px',
                                width: '55px',
                                objectFit: 'contain',
                                borderRadius: '14px',
                                padding: '4px',
                                background: 'rgba(255,255,255,0.08)',
                                boxShadow: '0 0 20px rgba(130,84,238,0.4)',
                                display: 'block',
                            }}
                            onError={(e) => {
                                e.currentTarget.src = '/logos/default-logo.png';
                            }}
                        />
                        <div style={{ width: '2px', height: '35px', background: 'rgba(255,255,255,0.1)' }} />
                        <motion.img
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            src="/logos/ripple-logo.png"
                            alt="Ripple Logo"
                            style={{
                                height: '55px',
                                width: '55px',
                                objectFit: 'contain',
                                borderRadius: '14px',
                                padding: '4px',
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
                            fontSize: '1.6rem',
                            fontWeight: '800',
                            background: 'linear-gradient(to right, #8254ee, #82717b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            letterSpacing: '1px',
                        }}
                    >
                        STUDENT REGISTRATION
                    </h1>
                    <p style={{ color: '#c1cfc1', margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>
                        Create your RGMCSE compiler account to start coding
                    </p>
                </div>

                {error && <div style={{ color: '#ff5c5c', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
                {success && <div style={{ color: '#c1cfc1', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    
                    {/* Full Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                            <input
                                type="text"
                                className="card"
                                style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                            <input
                                type="email"
                                className="card"
                                style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                placeholder="yourname@college.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Reg No & Password side-by-side */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Registration Number</label>
                            <div style={{ position: 'relative' }}>
                                <Award size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <input
                                    type="text"
                                    className="card"
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    placeholder="e.g. 24091A0514"
                                    value={regNo}
                                    onChange={(e) => setRegNo(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <input
                                    type="password"
                                    className="card"
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Year & Assigned Lab side-by-side */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Year</label>
                            <div style={{ position: 'relative' }}>
                                <BookOpen size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <select
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                    value={classAndYear}
                                    onChange={(e) => setClassAndYear(e.target.value)}
                                >
                                    {YEAR_OPTIONS.map(yr => (
                                        <option key={yr} value={yr} style={{ background: '#090909' }}>{yr}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Assigned Lab</label>
                            <div style={{ position: 'relative' }}>
                                <BookOpen size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <select
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                    value={selectedLab}
                                    onChange={(e) => setSelectedLab(e.target.value)}
                                >
                                    {LAB_OPTIONS.map(lab => (
                                        <option key={lab} value={lab} style={{ background: '#090909' }}>{lab}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Faculty Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.95rem' }}>Faculty Name</label>
                        <div style={{ position: 'relative' }}>
                            <UserCheck size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                            <input
                                type="text"
                                className="card"
                                style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                placeholder="Faculty member in charge"
                                value={facultyName}
                                onChange={(e) => setFacultyName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="btn btn-primary"
                        style={{ 
                            width: '100%', 
                            justifyContent: 'center', 
                            padding: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            background: 'linear-gradient(135deg, #8254ee, #3b353c)', 
                            border: 'none', 
                            color: 'white', 
                            fontWeight: 'bold',
                            marginTop: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        Register Account
                    </motion.button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <span style={{ color: '#c1cfc1', fontSize: '0.9rem' }}>Already registered? </span>
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
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
                        Login here
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
