import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';
import axios from 'axios';
import { User, Settings, Lock, Eye, Bell, Shield, LogOut, Code, ChevronRight, Activity, Award, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const SETTINGS_TABS = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'account', label: 'Account Settings', icon: Settings },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Eye },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
];

const MyProfile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [pwdState, setPwdState] = useState({ current: '', new: '', confirm: '', loading: false, msg: '', error: false });
    const [stats, setStats] = useState({
        easy: 0, medium: 0, hard: 0, totalSolved: 0,
        totalSubmissions: 0, acceptedSubmissions: 0, successPercentage: 0,
        rank: 'Novice', points: 0, weeklyProgress: '80%', monthlyProgress: '65%'
    });

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            const userData = res.data;
            const submissions = userData.submissions || [];
            
            const accepted = submissions.filter(s => s.status === 'Accepted');
            const totalSubmissions = submissions.length;
            const acceptedSubmissions = accepted.length;
            const successPercentage = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;
            
            // Track unique solved by difficulty
            const solvedSet = new Map();
            accepted.forEach(s => {
                const qId = s.question?._id || s.question;
                const diff = s.question?.difficulty || 'Medium';
                if (!solvedSet.has(qId)) {
                    solvedSet.set(String(qId), diff);
                }
            });
            
            let easy = 0, medium = 0, hard = 0;
            solvedSet.forEach(diff => {
                if (diff === 'Easy') easy++;
                else if (diff === 'Hard') hard++;
                else medium++;
            });
            
            const totalSolved = solvedSet.size;
            const points = (easy * 10) + (medium * 20) + (hard * 30);
            
            let rank = 'Novice';
            if (points > 100) rank = 'Beginner';
            if (points > 500) rank = 'Intermediate';
            if (points > 1000) rank = 'Advanced';
            if (points > 2000) rank = 'Expert';

            // Fetch questions to calculate weekly/monthly progress
            const labQuery = userData?.selectedLab ? `?labName=${encodeURIComponent(userData.selectedLab)}` : '';
            const questionsRes = await axios.get(`http://localhost:5000/api/questions${labQuery}`);
            const questions = questionsRes.data || [];

            // Group questions by week to find current week and current month
            const grouped = questions.reduce((acc, q) => {
                if (q.weeklyTask) {
                    const weekId = q.weeklyTask._id;
                    if (!acc[weekId]) acc[weekId] = { ...q.weeklyTask, questions: [] };
                    acc[weekId].questions.push(q);
                }
                return acc;
            }, {});
            const weeks = Object.values(grouped).sort((a, b) => a.weekNumber - b.weekNumber);
            const unlockedWeeks = weeks.filter(w => w.isUnlocked);
            
            let weeklyProgress = '0%';
            let monthlyProgress = '0%';

            if (unlockedWeeks.length > 0) {
                // Current week is the highest unlocked week
                const currentWeek = unlockedWeeks[unlockedWeeks.length - 1];
                const currentWeekQs = currentWeek.questions;
                const currentWeekTotal = currentWeekQs.length;
                const currentWeekSolved = currentWeekQs.filter(q => solvedSet.has(String(q._id))).length;
                weeklyProgress = currentWeekTotal > 0 ? `${Math.round((currentWeekSolved / currentWeekTotal) * 100)}%` : '0%';

                // Current month: assume a month is a block of 4 weeks ending with the current week (e.g. week 1-4, 5-8)
                const currentMonthIndex = Math.floor((currentWeek.weekNumber - 1) / 4);
                const currentMonthWeeks = unlockedWeeks.filter(w => Math.floor((w.weekNumber - 1) / 4) === currentMonthIndex);
                
                let monthTotalQs = 0;
                let monthSolvedQs = 0;
                currentMonthWeeks.forEach(w => {
                    monthTotalQs += w.questions.length;
                    monthSolvedQs += w.questions.filter(q => solvedSet.has(String(q._id))).length;
                });
                monthlyProgress = monthTotalQs > 0 ? `${Math.round((monthSolvedQs / monthTotalQs) * 100)}%` : '0%';
            }

            setStats({
                easy, medium, hard, totalSolved, totalSubmissions, acceptedSubmissions, successPercentage,
                rank, points, weeklyProgress, monthlyProgress
            });

        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const t = window.setTimeout(() => fetchStats(), 0);

        const onSubmissionAdded = (populated) => {
            const subUser = populated?.user?._id || populated?.user;
            if (user && subUser && String(subUser) !== String(user._id)) return;
            fetchStats();
        };

        socket.on('submissionAdded', onSubmissionAdded);
        socket.on('progressUpdated', fetchStats);
        socket.on('questionAdded', fetchStats);
        socket.on('weekUnlocked', fetchStats);

        return () => {
            window.clearTimeout(t);
            socket.off('submissionAdded', onSubmissionAdded);
            socket.off('progressUpdated', fetchStats);
            socket.off('questionAdded', fetchStats);
            socket.off('weekUnlocked', fetchStats);
        };
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handlePwdChange = async (e) => {
        e.preventDefault();
        if (pwdState.new !== pwdState.confirm) {
            return setPwdState(p => ({ ...p, msg: "New passwords do not match", error: true }));
        }
        setPwdState(p => ({ ...p, loading: true, msg: '', error: false }));
        try {
            await axios.put('http://localhost:5000/api/auth/change-password', {
                currentPassword: pwdState.current,
                newPassword: pwdState.new
            }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setPwdState({ current: '', new: '', confirm: '', loading: false, msg: "Password updated successfully!", error: false });
            setTimeout(() => setPwdState(p => ({ ...p, msg: '' })), 4000);
        } catch(err) {
            setPwdState(p => ({ ...p, loading: false, msg: err.response?.data?.message || "Failed to update password", error: true }));
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <PremiumHeader />
            <div style={{ display: 'flex', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '2rem', gap: '2rem' }}>
                
                {/* Sidebar (LeetCode Style Settings) */}
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="card"
                    style={{ width: '280px', padding: '1rem 0', alignSelf: 'flex-start', background: 'var(--surface)' }}
                >
                    <div style={{ padding: '0 1.5rem 1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-heading-dark)' }}>{user?.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)' }}>{user?.regNo}</div>
                            </div>
                        </div>
                    </div>
                    
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {SETTINGS_TABS.map(tab => {
                            const active = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <li key={tab.id} style={{ marginBottom: '0.25rem' }}>
                                    <button
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: active ? 'rgba(130, 84, 238, 0.15)' : 'transparent',
                                            border: 'none',
                                            padding: '1rem 1.5rem',
                                            color: active ? 'var(--primary-hover)' : 'var(--text)',
                                            borderLeft: active ? '4px solid var(--primary)' : '4px solid transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '0.95rem',
                                            fontWeight: active ? '600' : '400',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => { if(!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                        onMouseOut={(e) => { if(!active) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Icon size={18} />
                                            {tab.label}
                                        </div>
                                        {active && <ChevronRight size={16} />}
                                    </button>
                                </li>
                            );
                        })}
                        <li style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '1rem 1.5rem',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </li>
                    </ul>
                </motion.div>

                {/* Main Content Area */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                    {activeTab === 'profile' && (
                        <>
                            <div className="card" style={{ padding: '2rem' }}>
                                <h2 style={{ margin: '0 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-heading-dark)' }}>My Profile</h2>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Full Name</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.name || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Email Address</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.email || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Registration Number</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.regNo || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Branch & Year</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.classAndYear || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Section</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.section || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Assigned Labs</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.selectedLab || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Weekly Progress</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: stats.weeklyProgress, height: '100%', background: 'var(--primary)' }}></div>
                                                </div>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)' }}>{stats.weeklyProgress}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted-dark)', marginBottom: '0.25rem' }}>Monthly Progress</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: stats.monthlyProgress, height: '100%', background: '#e7c965' }}></div>
                                                </div>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#e7c965' }}>{stats.monthlyProgress}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <Star size={40} color="#e7c965" style={{ marginBottom: '1rem' }} />
                                    <div style={{ fontSize: '1rem', color: 'var(--text-muted-dark)' }}>Rank & Points</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-heading-dark)' }}>{stats.rank}</div>
                                    <div style={{ color: '#e7c965', fontWeight: 'bold', marginTop: '0.5rem' }}>{stats.points} XP</div>
                                </div>

                                <div className="card" style={{ padding: '2rem' }}>
                                    <h3 style={{ margin: '0 0 1.5rem', color: 'var(--text-heading-dark)' }}>Submission Statistics</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted-dark)' }}>Total Submissions</span>
                                        <span style={{ fontWeight: 'bold' }}>{stats.totalSubmissions}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted-dark)' }}>Accepted Submissions</span>
                                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{stats.acceptedSubmissions}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted-dark)' }}>Success Percentage</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{stats.successPercentage}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted-dark)' }}>Total Solved</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.totalSolved}</span>
                                    </div>
                                </div>
                                
                                <div className="card" style={{ padding: '2rem' }}>
                                    <h3 style={{ margin: '0 0 1.5rem', color: 'var(--text-heading-dark)' }}>Solved by Difficulty</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Easy</span>
                                                <span>{stats.easy}</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, stats.easy * 5)}%`, height: '100%', background: '#10b981' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ color: '#e7c965', fontWeight: 'bold' }}>Medium</span>
                                                <span>{stats.medium}</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, stats.medium * 5)}%`, height: '100%', background: '#e7c965' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Hard</span>
                                                <span>{stats.hard}</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, stats.hard * 5)}%`, height: '100%', background: '#ef4444' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'password' && (
                        <div className="card" style={{ padding: '2rem', maxWidth: '600px' }}>
                            <h2 style={{ margin: '0 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-heading-dark)' }}>Change Password</h2>
                            
                            <form onSubmit={handlePwdChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Current Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={pwdState.current}
                                        onChange={e => setPwdState(p => ({ ...p, current: e.target.value }))}
                                        className="form-control"
                                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>New Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={pwdState.new}
                                        onChange={e => setPwdState(p => ({ ...p, new: e.target.value }))}
                                        className="form-control"
                                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={pwdState.confirm}
                                        onChange={e => setPwdState(p => ({ ...p, confirm: e.target.value }))}
                                        className="form-control"
                                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                    />
                                </div>
                                
                                {pwdState.msg && (
                                    <div style={{ padding: '10px', borderRadius: '8px', background: pwdState.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: pwdState.error ? '#ef4444' : '#10b981', fontSize: '0.9rem' }}>
                                        {pwdState.msg}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={pwdState.loading}
                                    className="btn btn-primary"
                                    style={{ padding: '12px', marginTop: '0.5rem', fontWeight: 'bold' }}
                                >
                                    {pwdState.loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ margin: '0 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-heading-dark)' }}>Appearance</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Theme</div>
                                        <div style={{ color: 'var(--text-muted-dark)', fontSize: '0.9rem' }}>Select your preferred interface theme</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn" style={{ background: 'var(--primary)', color: 'white' }}>Dark Mode</button>
                                        <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'gray', cursor: 'not-allowed' }}>Light Mode</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Global Font</div>
                                        <div style={{ color: 'var(--text-muted-dark)', fontSize: '0.9rem' }}>The entire platform uses Times New Roman as requested</div>
                                    </div>
                                    <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'Times New Roman' }}>Times New Roman</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ margin: '0 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-heading-dark)' }}>Account Settings</h2>
                            <p style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>Profile updates are disabled by the Lab Administrator. Please contact your HOD to update your Name, Email, or Registration Number.</p>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ margin: '0 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-heading-dark)' }}>Privacy & Security</h2>
                            <p style={{ color: 'var(--text-muted-dark)' }}>Your session is active and secure. Lab submissions are strictly monitored.</p>
                            <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <Shield color="#10b981" />
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Active Session</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Current IP Address: 127.0.0.1 (Localhost)</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Last Login: {new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ margin: '0 0 1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-heading-dark)' }}>Notifications</h2>
                            <p style={{ color: 'var(--text-muted-dark)' }}>Notification preferences are managed globally by the institution. You will receive alerts for new tasks, submission results, and lab updates automatically.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default MyProfile;
