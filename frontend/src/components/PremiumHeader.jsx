import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, User as UserIcon, Code2, Check, User, Activity, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// ==========================================
// Socket Connection Initialization
// ==========================================
const socket = io('http://localhost:5000');

/**
 * Premium Header Component
 * Provides luxury branding, real-time notifications, and user profile management.
 */
const PremiumHeader = () => {
    // Context and routing
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Local state for interactive dropdowns
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, text: 'New Weekly Task unlocked!', unread: true, type: 'task' },
        { id: 2, text: 'System maintenance at midnight', unread: true, type: 'admin' },
        { id: 3, text: 'Your submission was accepted!', unread: false, type: 'success' }
    ]);

    // DOM References for outside-click detection
    const notifRef = useRef();
    const profileRef = useRef();

    // ==========================================
    // Real-Time Notification & Event Listeners
    // ==========================================
    useEffect(() => {
        // Listen for live updates via Socket.IO
        socket.on('notification', (notif) => {
            setNotifications(prev => [{ ...notif, unread: true, id: Date.now() }, ...prev]);
        });
        
        // Handle clicks outside of dropdowns to automatically close them
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        
        // Cleanup event listeners on component unmount
        return () => {
            socket.off('notification');
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Calculate unread badge count
    const unreadCount = notifications.filter(n => n.unread).length;

    // ==========================================
    // Component Render
    // ==========================================
    return (
        <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 2rem', 
            marginBottom: '2rem',
            background: 'var(--glass-gradient)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
            borderRadius: '16px',
            flexWrap: 'wrap',
            gap: '1rem',
            position: 'relative',
            zIndex: 100
        }}>
            {/* Left Side: Branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <motion.img 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    src="/logos/rgm-logo.jpeg" 
                    alt="RGM Logo" 
                    style={{ 
                        height: '60px', 
                        width: '60px', 
                        objectFit: 'contain', 
                        borderRadius: '18px',
                        padding: '6px',
                        background: 'rgba(255,255,255,0.08)',
                        boxShadow: '0 0 20px rgba(130,84,238,0.4)',
                        zIndex: 1000,
                        opacity: 1,
                        display: 'block'
                    }}
                    onError={(e) => { e.currentTarget.src = "/logos/default-logo.png"; }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            RGMCET COMPILER
                        </h1>
                        <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '1rem', fontWeight: 'bold' }}>PRO</span>
                    </div>
                    <p style={{ color: 'var(--text)', margin: 0, fontSize: '1.2rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                        Rajeev Gandhi Memorial College Of Engineering And Technology
                    </p>
                    <p style={{ color: 'var(--primary-hover)', margin: 0, fontSize: '0.8rem', fontWeight: '500' }}>
                        Department Of Computer Science and Engineering
                    </p>
                </div>
                <motion.img 
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    src="/logos/ripple-logo.png" 
                    alt="Ripple Logo" 
                    style={{ 
                        height: '60px', 
                        width: '60px', 
                        objectFit: 'contain', 
                        marginLeft: '1rem',
                        borderRadius: '18px',
                        padding: '6px',
                        background: 'rgba(255,255,255,0.08)',
                        boxShadow: '0 0 20px rgba(130,84,238,0.4)',
                        zIndex: 1000,
                        opacity: 1,
                        display: 'block'
                    }}
                    onError={(e) => { e.currentTarget.src = "/logos/default-logo.png"; }}
                />
            </div>

            {/* Right Side: Profile & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right', display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text)' }}>{user?.name || user?.email}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'gray' }}>
                        {user?.role === 'superadmin'
                            ? 'Super Admin (HOD)'
                            : user?.role === 'labadmin'
                              ? 'Lab Admin'
                              : user?.role === 'admin'
                                ? 'Faculty / Admin'
                                : 'Student'}
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                    <div ref={notifRef} style={{ position: 'relative' }}>
                        <motion.button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            className="btn glass" 
                            style={{ padding: '10px', borderRadius: '50%', position: 'relative' }}
                        >
                            <Bell size={20} color="var(--primary)" />
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--error)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </motion.button>
                        
                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10, scale: 0.96 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                                    style={{ 
                                        position: 'absolute', 
                                        right: 0, 
                                        top: '70px', 
                                        width: '340px', 
                                        maxWidth: '90vw', 
                                        background: 'linear-gradient(135deg, #1b1830, #241f45, #2d2755)', 
                                        border: '1px solid rgba(255,255,255,0.08)', 
                                        borderRadius: '20px', 
                                        boxShadow: '0 10px 35px rgba(0,0,0,0.45)', 
                                        zIndex: 9999, 
                                        overflow: 'hidden', 
                                        isolation: 'isolate', 
                                        pointerEvents: 'auto',
                                        padding: '18px'
                                    }}
                                >
                                    <div style={{ padding: '0 0 15px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Notifications</h3>
                                        <button onClick={() => setNotifications(n => n.map(x => ({ ...x, unread: false })))} style={{ background: 'none', border: 'none', color: '#e7c965', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Mark all read</button>
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '0 -18px -18px -18px' }}>
                                        {notifications.map(n => (
                                            <div key={n.id} style={{ padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', background: n.unread ? 'rgba(231, 201, 101, 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                                {n.type === 'task' ? <Code2 size={18} color="#10b981" /> : n.type === 'admin' ? <Info size={18} color="#e7c965" /> : <Check size={18} color="#3b82f6" />}
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ margin: 0, fontSize: '0.88rem', color: n.unread ? '#ffffff' : '#d6d6d6', lineHeight: '1.4' }}>{n.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div ref={profileRef} style={{ position: 'relative' }}>
                        <motion.button 
                            onClick={() => setShowProfile(!showProfile)}
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            className="btn glass" 
                            style={{ padding: '10px', borderRadius: '50%' }}
                        >
                            <UserIcon size={20} color="var(--primary)" />
                        </motion.button>

                        <AnimatePresence>
                            {showProfile && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10, scale: 0.96 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                                    style={{ position: 'absolute', right: 0, top: '75px', width: '260px', maxWidth: '90vw', background: 'rgba(20,20,20,0.92)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', zIndex: 9999, overflow: 'hidden', isolation: 'isolate', pointerEvents: 'auto' }}
                                >
                                    <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', color: 'white' }}>{user?.name || 'User'}</p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'gray' }}>{user?.selectedLab || user?.assignedLab || 'Student'}</p>
                                    </div>
                                    <div style={{ padding: '10px 0' }}>
                                        <button onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 20px', background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background='none'}><User size={16} /> My Profile</button>
                                        <button onClick={() => navigate('/progress')} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 20px', background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background='none'}><Activity size={16} /> My Progress</button>
                                        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 20px', background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background='none'}><Settings size={16} /> Settings</button>
                                    </div>
                                    <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', justifyContent: 'center' }}><LogOut size={16} /> Logout</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PremiumHeader;
