import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Award, BookOpen, UserCheck, Calendar, Hash, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const SEMESTER_OPTIONS = ['2-1', '2-2', '3-1', '3-2'];

const SECTION_OPTIONS = ['A', 'B', 'C'];

const BRANCH_OPTIONS = ['CSE', 'CSM', 'CSD', 'ECE', 'EEE', 'MECH', 'CIVIL'];

const SEMESTER_LAB_MAP = {
    '2': {
        '2-1': ['ADSAA', 'JAVA', 'PYTHON'],
        '2-2': ['OS', 'DBMS']
    },
    '3': {
        '3-1': ['FSAD', 'AI', 'CN', 'TNK'],
        '3-2': ['ML', 'C&NS']
    }
};

function getYearNum(year) {
    const m = String(year).match(/^(\d+)/);
    return m ? m[1] : null;
}

function getAssignedLabs(year, semester) {
    const yn = getYearNum(year);
    if (!yn || !semester) return [];
    const ym = SEMESTER_LAB_MAP[yn];
    if (!ym) return [];
    return ym[semester] || [];
}

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [regNo, setRegNo] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [year, setYear] = useState('2nd Year');
    const [semester, setSemester] = useState('2-1');
    const [section, setSection] = useState('A');
    const [branch, setBranch] = useState('CSE');
    const [facultyName, setFacultyName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const assignedLabs = useMemo(() => getAssignedLabs(year, semester), [year, semester]);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name || !email || !regNo || !dateOfBirth || !year || !semester || !facultyName) {
            setError('All required fields must be filled');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dobRegex.test(dateOfBirth)) {
            setError('Date of Birth must be in DD-MM-YYYY format (e.g., 12-08-2005)');
            return;
        }

        const yn = getYearNum(year);
        if (!yn || !['2', '3'].includes(yn)) {
            setError('Lab assignments are available for 2nd and 3rd Year only');
            return;
        }

        try {
            const cleanedRegNo = String(regNo).trim();

            await register({
                name,
                email,
                regNo: cleanedRegNo,
                dateOfBirth,
                year,
                semester,
                section,
                branch,
                assignedLab: assignedLabs[0] || '',
                facultyName
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
                    maxWidth: '620px', 
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
                        First time? Create your RGMCSE compiler account
                    </p>
                </div>

                {error && <div style={{ color: '#ff5c5c', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
                {success && <div style={{ color: '#34d399', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Full Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Full Name *</label>
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

                    {/* Email & Reg No side-by-side */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Email Address *</label>
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

                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Registration Number *</label>
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
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Date of Birth *</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                            <input
                                type="text"
                                className="card"
                                style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                placeholder="DD-MM-YYYY (e.g. 12-08-2005)"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#34d399' }}>
                            Your password will be set to this date automatically. Use it to login.
                        </div>
                    </div>

                    {/* Year & Semester side-by-side */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Year *</label>
                            <div style={{ position: 'relative' }}>
                                <BookOpen size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <select
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                    value={year}
                                    onChange={(e) => { setYear(e.target.value); setSemester(''); }}
                                >
                                    {YEAR_OPTIONS.map(yr => (
                                        <option key={yr} value={yr} style={{ background: '#090909' }}>{yr}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Semester *</label>
                            <div style={{ position: 'relative' }}>
                                <Layers size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <select
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                    value={semester}
                                    onChange={(e) => setSemester(e.target.value)}
                                    required
                                >
                                    <option value="" style={{ background: '#090909' }}>Select Semester</option>
                                    {SEMESTER_OPTIONS.map(s => {
                                        const yn = getYearNum(year);
                                        const isDisabled = !yn || !SEMESTER_LAB_MAP[yn] || !SEMESTER_LAB_MAP[yn][s];
                                        return (
                                            <option key={s} value={s} disabled={isDisabled} style={{ background: '#090909' }}>
                                                {s}{isDisabled ? ' (N/A)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div style={{ flex: '1 1 120px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Section *</label>
                            <div style={{ position: 'relative' }}>
                                <Hash size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <select
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                    value={section}
                                    onChange={(e) => setSection(e.target.value)}
                                >
                                    {SECTION_OPTIONS.map(s => (
                                        <option key={s} value={s} style={{ background: '#090909' }}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ flex: '1 1 150px' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Branch *</label>
                            <div style={{ position: 'relative' }}>
                                <BookOpen size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#82717b' }} />
                                <select
                                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '0.5rem', background: '#090909', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', cursor: 'pointer' }}
                                    value={branch}
                                    onChange={(e) => setBranch(e.target.value)}
                                >
                                    {BRANCH_OPTIONS.map(b => (
                                        <option key={b} value={b} style={{ background: '#090909' }}>{b}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Assigned Labs Display */}
                    {assignedLabs.length > 0 && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(52, 211, 153, 0.08)',
                            border: '1px solid rgba(52, 211, 153, 0.25)',
                            borderRadius: '10px',
                        }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                                <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Automatically Assigned Labs
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {assignedLabs.map(lab => (
                                    <span key={lab} style={{
                                        padding: '4px 12px',
                                        background: 'rgba(130, 84, 238, 0.2)',
                                        color: '#c1cfc1',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        border: '1px solid rgba(130, 84, 238, 0.3)',
                                        fontWeight: 500,
                                    }}>
                                        {lab}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Faculty Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#c1cfc1', fontSize: '0.9rem' }}>Faculty Name *</label>
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
