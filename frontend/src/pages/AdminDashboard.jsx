import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, FileText, CheckSquare, LogOut, Edit, Trash, BarChart2, Briefcase, Shield, BookOpen, Activity, AlertCircle, RefreshCw, Check, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';

const formatIST = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '-');
    const timePart = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
};

// ==========================================
// Socket Connection Initialization
// ==========================================
const socket = io('http://localhost:5000');

/**
 * Super Admin & Lab Admin Dashboard Component
 * Handles user tracking, faculty management, lab admin creation, and analytics.
 */
const AdminDashboard = () => {
    // Authentication context
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [adminList, setAdminList] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Forms state
    const [isEditing, setIsEditing] = useState(false);
    const [questionForm, setQuestionForm] = useState({
        title: '', description: '', inputFormat: '', outputFormat: '', 
        constraints: '', sampleInput: '', sampleOutput: '', hiddenInput: '', hiddenOutput: '',
        difficulty: 'Easy', weekNumber: '', tags: '', labName: '',
        unlockDate: '', deadlineDate: '', primaryLanguage: '', isFinalWeek: false
    });

    const [facultyForm, setFacultyForm] = useState({ 
        name: '', email: '', password: '', role: 'admin', subject: '',
        assignedLab: '', assignedSections: '', assignedYear: '', 
        labDay: 'Thursday', startTime: '10:30', endTime: '12:30' 
    });
    const [studentForm, setStudentForm] = useState({
        name: '', regNo: '', dob: '', password: '', classAndYear: '', subjectName: '', selectedLab: '', facultyName: '', section: ''
    });
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', assignedLab: '', phone: '' });
    const [toast, setToast] = useState(null);

    const LABS = ["C", "DS", "ADSAA", "JAVA", "PYTHON", "DBMS", "OS", "CN", "AI", "ML", "FSAD"];

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role === 'labadmin') {
            navigate('/lab-admin', { replace: true });
            return;
        }
        if (user.role !== 'superadmin' && user.role !== 'admin') {
            navigate('/login');
            return;
        }
        fetchDashboardData();

        const handleViolationAlert = (report) => {
            if (user.role === 'superadmin' || (user.assignedLab && report.labName === user.assignedLab)) {
                setToast(`🚨 Security Alert: ${report.student?.name} - ${report.title}`);
                setTimeout(() => setToast(null), 5000);
            }
        };

        socket.on('submissionAdded', fetchDashboardData);
        socket.on('progressUpdated', fetchDashboardData);
        socket.on('questionAdded', fetchDashboardData);
        socket.on('questionDeleted', fetchDashboardData);
        socket.on('weekUnlocked', fetchDashboardData);
        socket.on('violationAlert', handleViolationAlert);

        return () => {
            socket.off('submissionAdded', fetchDashboardData);
            socket.off('progressUpdated', fetchDashboardData);
            socket.off('questionAdded', fetchDashboardData);
            socket.off('questionDeleted', fetchDashboardData);
            socket.off('weekUnlocked', fetchDashboardData);
            socket.off('violationAlert', handleViolationAlert);
        };
    }, [user, navigate]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [statsRes, studentsRes, questionsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/stats', { headers: { 'x-auth-token': token } }),
                axios.get('http://localhost:5000/api/admin/students', { headers: { 'x-auth-token': token } }),
                axios.get('http://localhost:5000/api/admin/questions', { headers: { 'x-auth-token': token } })
            ]);
            setStats(statsRes.data);
            setStudents(studentsRes.data);
            setQuestions(questionsRes.data);

            if (user.role === 'superadmin') {
                const [facRes, admRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/admin/faculty', { headers: { 'x-auth-token': token } }),
                    axios.get('http://localhost:5000/api/admin/admins', { headers: { 'x-auth-token': token } })
                ]);
                setFacultyList(facRes.data);
                setAdminList(admRes.data);
            }
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            if (err.code === 'ERR_NETWORK') {
                setError("Network error: Cannot connect to the server. Please ensure the backend is running on port 5000.");
            } else {
                setError(`Failed to load dashboard data: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!questionForm.primaryLanguage) {
            alert('Please select primary language');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...questionForm,
                tags: questionForm.tags.split(',').map(t => t.trim()),
                labName: (user.role === 'labadmin' || user.role === 'admin') ? user.assignedLab : questionForm.labName,
                sampleTestCases: [{ input: questionForm.sampleInput, output: questionForm.sampleOutput }],
                hiddenTestCases: [{ input: questionForm.hiddenInput, output: questionForm.hiddenOutput }],
            };

            if (isEditing) {
                await axios.put(`http://localhost:5000/api/admin/questions/${questionForm._id}`, payload, { headers: { 'x-auth-token': token } });
            } else {
                // If it's a new week, create/update the task with the schedule
                if (questionForm.weekNumber) {
                    await axios.post('http://localhost:5000/api/admin/tasks', { 
                        weekNumber: questionForm.weekNumber, 
                        unlockDateTime: questionForm.unlockDate,
                        deadlineDateTime: questionForm.deadlineDate,
                        labName: payload.labName
                    }, { headers: { 'x-auth-token': token } });
                }
                await axios.post('http://localhost:5000/api/admin/questions', payload, { headers: { 'x-auth-token': token } });
            }
            setQuestionForm({ 
                title: '', description: '', inputFormat: '', outputFormat: '', constraints: '', 
                sampleInput: '', sampleOutput: '', hiddenInput: '', hiddenOutput: '', 
                difficulty: 'Easy', weekNumber: '', tags: '', labName: '',
                unlockDate: '', deadlineDate: '', primaryLanguage: '', isFinalWeek: false
            });
            setIsEditing(false);
            fetchDashboardData();
        } catch (err) { console.error("Error saving question"); }
    };

    const handleDeleteQuestion = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/questions/${id}`, { headers: { 'x-auth-token': token } });
            fetchDashboardData();
        } catch (err) {}
    };

    const handleFacultySubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = { 
                ...facultyForm, 
                assignedSections: facultyForm.assignedSections.split(',').map(s=>s.trim()) 
            };
            await axios.post('http://localhost:5000/api/admin/faculty', payload, { headers: { 'x-auth-token': token } });
            setFacultyForm({ name: '', email: '', password: '', role: 'admin', assignedLab: '', assignedSections: '', assignedYear: '', labDay: 'Thursday', unlockTime: '10:30' });
            fetchDashboardData();
        } catch (err) {
            alert("Failed to add faculty: " + (err.response?.data?.message || err.message));
        }
    };

    const handleStudentSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/admin/students', studentForm, { headers: { 'x-auth-token': token } });
            setStudentForm({ name: '', regNo: '', dob: '', password: '', classAndYear: '', subjectName: '', selectedLab: '', facultyName: '', section: '' });
            fetchDashboardData();
        } catch (err) {
            alert("Failed to add student: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteFaculty = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/faculty/${id}`, { headers: { 'x-auth-token': token } });
            fetchDashboardData();
        } catch (err) {}
    };

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/admin/admins', adminForm, { headers: { 'x-auth-token': token } });
            setAdminForm({ name: '', email: '', password: '', assignedLab: '', phone: '' });
            fetchDashboardData();
        } catch (err) {}
    };

    const handleDeleteAdmin = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/admins/${id}`, { headers: { 'x-auth-token': token } });
            fetchDashboardData();
        } catch (err) {}
    };

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <PremiumHeader />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                    <RefreshCw size={48} className="spin text-primary" />
                    <p style={{ color: 'gray', fontSize: '1.2rem' }}>Loading HOD Dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <PremiumHeader />
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
                    <AlertCircle size={48} color="#ef4444" />
                    <h2 style={{ color: '#ef4444' }}>Error Loading Data</h2>
                    <p style={{ color: 'gray' }}>{error || "Unknown error occurred"}</p>
                    <button onClick={fetchDashboardData} className="btn btn-primary" style={{ marginTop: '1rem' }}><RefreshCw size={18} /> Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <PremiumHeader />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Users size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.studentsCount}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Total Students</p></div>
                </motion.div>
                
                {(user.role === 'superadmin' || user.role === 'labadmin' || user.role === 'admin') && (
                    <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                        <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Briefcase size={28} /></div>
                        <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{facultyList.length || 0}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Total Active Labs: {LABS.length}</p></div>
                    </motion.div>
                )}
                
                {user.role === 'superadmin' && (
                    <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ec4899', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                        <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}><Shield size={28} /></div>
                        <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{LABS.length}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Total Labs</p></div>
                    </motion.div>
                )}

                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8b5cf6', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><BookOpen size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.questionsCount}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Total Questions</p></div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Activity size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.completedCurrentWeek}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Completed Current Week</p></div>
                </motion.div>
                
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #06b6d4', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}><BarChart2 size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.submissionsCount}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Total Submissions</p></div>
                </motion.div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', paddingBottom: '0.5rem' }}>
                <button onClick={() => setActiveTab('overview')} style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px 12px 0 0', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    background: activeTab === 'overview' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    boxShadow: activeTab === 'overview' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                }}>Overview</button>
                <button onClick={() => setActiveTab('reports')} style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px 12px 0 0', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    background: activeTab === 'reports' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    boxShadow: activeTab === 'reports' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                }}>Reports Analytics</button>
                <button onClick={() => setActiveTab('questions')} style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px 12px 0 0', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    background: activeTab === 'questions' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    boxShadow: activeTab === 'questions' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                }}>Question Management</button>
                <button onClick={() => setActiveTab('students')} style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px 12px 0 0', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    background: activeTab === 'students' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    boxShadow: activeTab === 'students' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                }}>Student Tracking</button>
                {user.role === 'superadmin' && (
                    <>
                        <button onClick={() => setActiveTab('faculty')} style={{ 
                            padding: '12px 24px', 
                            borderRadius: '12px 12px 0 0', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            transition: 'all 0.3s ease',
                            background: activeTab === 'faculty' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                            color: '#ffffff',
                            boxShadow: activeTab === 'faculty' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                        }}>Faculty Management</button>
                        <button onClick={() => setActiveTab('labs')} style={{ 
                            padding: '12px 24px', 
                            borderRadius: '12px 12px 0 0', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            transition: 'all 0.3s ease',
                            background: activeTab === 'labs' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                            color: '#ffffff',
                            boxShadow: activeTab === 'labs' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                        }}>Lab Scheduling</button>
                        <button onClick={() => setActiveTab('admins')} style={{ 
                            padding: '12px 24px', 
                            borderRadius: '12px 12px 0 0', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            transition: 'all 0.3s ease',
                            background: activeTab === 'admins' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                            color: '#ffffff',
                            boxShadow: activeTab === 'admins' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                        }}>Lab Admins</button>
                    </>
                )}
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.5rem', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.4rem' }}>
                                <Clock size={24} style={{ color: '#e7c965' }} /> Upcoming Auto-Unlocks
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {stats.upcomingUnlocks?.length > 0 ? stats.upcomingUnlocks.map((u, i) => (
                                    <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '4px solid #e7c965' }}>
                                        <div style={{ fontWeight: 'bold', color: '#ffffff' }}>Week {u.weekNumber} - {u.labName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#d6d6d6' }}>Next Unlock: <span style={{ color: '#e7c965' }}>{u.unlockAt === "According to Lab Schedule" ? u.unlockAt : formatIST(u.unlockAt)}</span></div>
                                    </div>
                                )) : <p style={{ color: 'gray' }}>No pending unlocks scheduled.</p>}
                            </div>
                        </div>

                        {/* Removed duplicate Faculty Assignment Status */}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '2rem' }}>Weekly Completion Analytics</h2>
                        <div style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.weeklyCompletionData || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                                    <XAxis dataKey="name" stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                                    <YAxis stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }} />
                                    <Legend wrapperStyle={{ color: '#ffffff' }} />
                                    <Bar dataKey="completed" fill="#8254ee" name="Completed" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pending" fill="#ff5c5c" name="Pending" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '2rem', overflowY: 'auto', maxHeight: '500px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Latest Submissions</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {stats.latestSubmissions?.map(sub => (
                                <div key={sub._id} style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{sub.user?.name || 'Unknown'}</span>
                                        <span style={{ color: sub.status === 'Accepted' ? '#00ffb3' : '#ff5c5c', fontSize: '0.9rem', fontWeight: 'bold' }}>{sub.status}</span>
                                    </div>
                                    <div style={{ color: '#d6d6d6', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                        <strong>Question:</strong> {sub.question?.title}
                                    </div>
                                    <div style={{ color: '#d6d6d6', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span><strong>Attempts:</strong> {sub.attempts || 1}</span>
                                        <span><strong>Languages:</strong> {sub.languagesUsed?.join(', ') || sub.language || 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Year-wise Analytics</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {stats.yearWise?.map(y => (
                                <div key={y.name} style={{ padding: '1.5rem', background: 'var(--glass-gradient)', border: '1px solid var(--border)', borderRadius: '1rem', backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} className="text-primary"/> {y.name}</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'gray' }}>Total Students:</span>
                                        <span style={{ fontWeight: 'bold' }}>{y.students}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'gray' }}>Solved Problems:</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{y.solved}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'gray' }}>Avg Accuracy:</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{y.students ? Math.round((y.solved / (y.students * 5)) * 100) : 0}%</span>
                                    </div>
                                    <div style={{ marginTop: '1rem', width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${y.students ? Math.round((y.solved / (y.students * 5)) * 100) : 0}%`, background: 'var(--gradient-primary)', borderRadius: '4px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Section-wise Analytics</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {stats.sectionWise?.map(s => (
                                <div key={s.name} style={{ padding: '1rem', background: 'var(--glass-gradient)', border: '1px solid var(--border)', borderRadius: '1rem' }}>
                                    <h3>Section {s.name}</h3>
                                    <p>Students: {s.students}</p>
                                    <p>Solved: {s.solved}</p>
                                    <p>Completion: {s.students ? Math.round((s.solved / (s.students * 5)) * 100) : 0}%</p>
                                    <div style={{ marginTop: '0.5rem', width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                                        <div style={{ height: '100%', width: `${s.students ? Math.round((s.solved / (s.students * 5)) * 100) : 0}%`, background: 'var(--gradient-primary)', borderRadius: '3px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Lab-wise Performance</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {stats.labWise?.map(l => (
                                <div key={l.name} style={{ padding: '1.5rem', background: 'var(--glass-gradient)', border: '1px solid var(--border)', borderRadius: '1rem', backdropFilter: 'blur(10px)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} className="text-primary"/> {l.name} Lab</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'gray' }}>Students Enrolled:</span>
                                        <span style={{ fontWeight: 'bold' }}>{l.students}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'gray' }}>Problems Solved:</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{l.solved}</span>
                                    </div>
                                    <div style={{ marginTop: '1rem', width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${l.students ? Math.min(100, Math.round((l.solved / (l.students * 5)) * 100)) : 0}%`, background: 'var(--gradient-primary)', borderRadius: '4px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'questions' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2>{isEditing ? 'Edit Question' : 'Add New Question'}</h2>
                        <form onSubmit={handleQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            {user.role === 'superadmin' && (
                                <select value={questionForm.labName} onChange={e => setQuestionForm({...questionForm, labName: e.target.value})} required className="glass" style={{ padding: '10px' }}>
                                    <option value="" disabled>Select Lab</option>
                                    {LABS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                                </select>
                            )}
                            <input placeholder="Question Title" value={questionForm.title} onChange={e => setQuestionForm({...questionForm, title: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            <textarea placeholder="Description" value={questionForm.description} onChange={e => setQuestionForm({...questionForm, description: e.target.value})} required className="glass" style={{ padding: '10px', minHeight: '80px' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input placeholder="Input Format" value={questionForm.inputFormat} onChange={e => setQuestionForm({...questionForm, inputFormat: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                                <input placeholder="Output Format" value={questionForm.outputFormat} onChange={e => setQuestionForm({...questionForm, outputFormat: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            </div>
                            <input placeholder="Constraints" value={questionForm.constraints} onChange={e => setQuestionForm({...questionForm, constraints: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <textarea placeholder="Sample Input" value={questionForm.sampleInput} onChange={e => setQuestionForm({...questionForm, sampleInput: e.target.value})} className="glass" style={{ padding: '10px' }} />
                                <textarea placeholder="Sample Output" value={questionForm.sampleOutput} onChange={e => setQuestionForm({...questionForm, sampleOutput: e.target.value})} className="glass" style={{ padding: '10px' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <textarea placeholder="Hidden Input" value={questionForm.hiddenInput} onChange={e => setQuestionForm({...questionForm, hiddenInput: e.target.value})} className="glass" style={{ padding: '10px' }} />
                                <textarea placeholder="Hidden Output" value={questionForm.hiddenOutput} onChange={e => setQuestionForm({...questionForm, hiddenOutput: e.target.value})} className="glass" style={{ padding: '10px' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <select value={questionForm.difficulty} onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value})} className="glass" style={{ padding: '10px' }}>
                                    <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                                </select>
                                <select value={questionForm.primaryLanguage} onChange={e => setQuestionForm({...questionForm, primaryLanguage: e.target.value})} required className="glass" style={{ padding: '10px' }}>
                                    <option value="" disabled>Select Primary Language</option>
                                    <option value="C">C</option>
                                    <option value="C++">C++</option>
                                    <option value="Java">Java</option>
                                    <option value="Python">Python</option>
                                </select>
                                <input placeholder="Week Number (e.g. 1)" type="number" value={questionForm.weekNumber} onChange={e => setQuestionForm({...questionForm, weekNumber: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <input placeholder="Tags (comma separated)" value={questionForm.tags} onChange={e => setQuestionForm({...questionForm, tags: e.target.value})} className="glass" style={{ padding: '10px' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.8rem', color: '#d6d6d6', marginBottom: '0.3rem', display: 'block' }}>Unlock Date & Time</label>
                                    <input type="datetime-local" value={questionForm.unlockDate} onChange={e => setQuestionForm({...questionForm, unlockDate: e.target.value})} className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.8rem', color: '#d6d6d6', marginBottom: '0.3rem', display: 'block' }}>Deadline Date & Time</label>
                                    <input type="datetime-local" value={questionForm.deadlineDate} onChange={e => setQuestionForm({...questionForm, deadlineDate: e.target.value})} className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: '#d6d6d6', marginBottom: '0.3rem', display: 'block' }}>Is This Final Week?</label>
                                <select value={questionForm.isFinalWeek ? 'true' : 'false'} onChange={e => setQuestionForm({...questionForm, isFinalWeek: e.target.value === 'true'})} className="glass" style={{ width: '100%', padding: '10px' }}>
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{isEditing ? 'Update Question' : 'Publish & Schedule'}</button>
                                {isEditing && <button type="button" onClick={() => setIsEditing(false)} className="btn glass">Cancel</button>}
                            </div>
                        </form>
                    </div>

                    <div className="card" style={{ padding: '2rem', overflowY: 'auto', maxHeight: '800px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Existing Questions</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {questions.map(q => (
                                <div key={q._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--glass-gradient)' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.2rem' }}>{q.title}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'gray' }}>{q.difficulty} • Lab: {q.labName || 'N/A'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => {
                                            setIsEditing(true);
                                            setQuestionForm({...q, sampleInput: q.sampleTestCases[0]?.input || '', sampleOutput: q.sampleTestCases[0]?.output || '', hiddenInput: q.hiddenTestCases[0]?.input || '', hiddenOutput: q.hiddenTestCases[0]?.output || '', tags: q.tags?.join(', ') || '', weekNumber: q.weekNumber || '', primaryLanguage: q.primaryLanguage || '', isFinalWeek: q.isFinalWeek || false});
                                        }} className="btn glass" style={{ color: 'var(--primary)', padding: '8px' }}><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteQuestion(q._id)} className="btn glass" style={{ color: 'var(--error)', padding: '8px' }}><Trash size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {user?.role === 'superadmin' && (
                        <div className="card" style={{ padding: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Student Registration</h2>
                            <form onSubmit={handleStudentSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Student Name</label>
                                    <input placeholder="Enter Name" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} required className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Registration Number</label>
                                    <input placeholder="e.g. 24091A0514" value={studentForm.regNo} onChange={e => setStudentForm({...studentForm, regNo: e.target.value})} required className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Date of birth (login)</label>
                                    <input placeholder="DD/MM/YYYY" value={studentForm.dob} onChange={e => setStudentForm({...studentForm, dob: e.target.value})} required className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Password (optional)</label>
                                    <input type="password" placeholder="Leave blank if using DOB only" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Year</label>
                                    <input placeholder="e.g. 2nd Year" value={studentForm.classAndYear} onChange={e => setStudentForm({...studentForm, classAndYear: e.target.value})} required className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Section</label>
                                    <input placeholder="e.g. A" value={studentForm.section} onChange={e => setStudentForm({...studentForm, section: e.target.value})} className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Subject</label>
                                    <input placeholder="e.g. DBMS" value={studentForm.subjectName} onChange={e => setStudentForm({...studentForm, subjectName: e.target.value})} required className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Lab</label>
                                    <select value={studentForm.selectedLab} onChange={e => setStudentForm({...studentForm, selectedLab: e.target.value})} required className="glass" style={{ width: '100%', padding: '10px' }}>
                                        <option value="" disabled>Select Lab</option>
                                        {LABS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Assigned Faculty</label>
                                    <input placeholder="Faculty Name" value={studentForm.facultyName} onChange={e => setStudentForm({...studentForm, facultyName: e.target.value})} className="glass" style={{ width: '100%', padding: '10px' }} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>Register Student</button>
                                </div>
                            </form>
                        </div>
                    )}
                    <div className="card" style={{ padding: '2rem', overflowX: 'auto' }}>
                        <h2 style={{ marginBottom: '2rem' }}>Student Tracking System</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', color: 'gray' }}>
                                <th style={{ padding: '1rem 0' }}>Name & Reg No</th>
                                <th>Solved / Pending</th>
                                <th>Class & Year</th>
                                <th>Section</th>
                                <th>Assigned Lab</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 0' }}>
                                        <div style={{ fontWeight: 'bold' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'gray' }}>{student.regNo}</div>
                                    </td>
                                    <td><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{student.solvedCount}</span> / <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>{student.pendingCount}</span></td>
                                    <td>{student.classAndYear || 'N/A'}</td>
                                    <td>{student.section || 'N/A'}</td>
                                    <td>{student.selectedLab || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {activeTab === 'labs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: '#e7c965' }}>Lab & Faculty Scheduling</h2>
                        <p style={{ color: 'gray', marginBottom: '2rem' }}>Configure weekly unlock schedules for each lab. The system will automatically open coding challenges on the selected day and time.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                            {facultyList.filter(f => user.role === 'superadmin' || f.assignedLab === user.assignedLab).map(f => (
                                <div key={f._id} className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#ffffff' }}>{f.assignedLab} Lab</h3>
                                            <p style={{ margin: 0, color: '#8254ee', fontSize: '0.9rem' }}>Faculty: {f.name}</p>
                                        </div>
                                        <div style={{ padding: '6px 12px', background: 'rgba(231, 201, 101, 0.1)', color: '#e7c965', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {f.labDay} @ {f.startTime} - {f.endTime}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#d6d6d6' }}>
                                        <div><strong>Sections:</strong> {f.assignedSections?.join(', ') || 'N/A'}</div>
                                        <div><strong>Academic Year:</strong> {f.assignedYear || 'N/A'}</div>
                                    </div>
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
                                        <button className="btn glass" style={{ flex: 1, fontSize: '0.85rem' }} onClick={() => { setFacultyForm(f); setActiveTab('faculty'); }}>Edit Schedule</button>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#10b981' }}>
                                            <Check size={16} /> Auto-Unlock Active
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {user.role === 'superadmin' && activeTab === 'faculty' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Briefcase size={28} style={{ color: '#8254ee' }} /> Faculty Management
                        </h2>
                        <form onSubmit={handleFacultySubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Faculty Name</label>
                                <input placeholder="Enter Name" value={facultyForm.name} onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} required className="glass" style={{ width: '100%', padding: '12px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                                <input placeholder="Enter Email" type="email" value={facultyForm.email} onChange={e => setFacultyForm({...facultyForm, email: e.target.value})} required className="glass" style={{ width: '100%', padding: '12px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Initial Password</label>
                                <input placeholder="Set Password" type="password" value={facultyForm.password} onChange={e => setFacultyForm({...facultyForm, password: e.target.value})} required className="glass" style={{ width: '100%', padding: '12px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Role</label>
                                <select value={facultyForm.role} onChange={e => setFacultyForm({...facultyForm, role: e.target.value})} className="glass" style={{ width: '100%', padding: '12px' }}>
                                    <option value="admin">Faculty</option>
                                    <option value="labadmin">Lab Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Assigned Lab</label>
                                <select value={facultyForm.assignedLab} onChange={e => setFacultyForm({...facultyForm, assignedLab: e.target.value})} required className="glass" style={{ width: '100%', padding: '12px' }}>
                                    <option value="" disabled>Select Lab</option>
                                    {LABS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Assigned Sections</label>
                                <input placeholder="e.g. A, B, C" value={facultyForm.assignedSections} onChange={e => setFacultyForm({...facultyForm, assignedSections: e.target.value})} className="glass" style={{ width: '100%', padding: '12px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Assigned Year</label>
                                <input placeholder="e.g. 3rd Year" value={facultyForm.assignedYear} onChange={e => setFacultyForm({...facultyForm, assignedYear: e.target.value})} className="glass" style={{ width: '100%', padding: '12px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Weekly Unlock Day</label>
                                <select value={facultyForm.labDay} onChange={e => setFacultyForm({...facultyForm, labDay: e.target.value})} className="glass" style={{ width: '100%', padding: '12px' }}>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#d6d6d6', marginBottom: '0.5rem', display: 'block' }}>Unlock Time</label>
                                <input type="time" value={facultyForm.unlockTime} onChange={e => setFacultyForm({...facultyForm, unlockTime: e.target.value})} className="glass" style={{ width: '100%', padding: '12px' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1rem' }}>Create Faculty Profile</button>
                            </div>
                        </form>
                    </div>

                    <div className="card" style={{ padding: '2rem', overflowX: 'auto' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Active Faculty Members</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: '#d6d6d6' }}>
                                    <th style={{ padding: '1rem' }}>Faculty Details</th>
                                    <th>Assigned Lab</th>
                                    <th>Sections/Year</th>
                                    <th>Schedule</th>
                                    <th>Analytics</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facultyList.map(f => (
                                    <tr key={f._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{f.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#d6d6d6' }}>{f.email}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#8254ee', textTransform: 'uppercase' }}>{f.role}</div>
                                        </td>
                                        <td style={{ color: '#ffffff' }}>{f.assignedLab}</td>
                                        <td>
                                            <div style={{ color: '#ffffff' }}>{f.assignedSections?.join(', ')}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#d6d6d6' }}>{f.assignedYear}</div>
                                        </td>
                                        <td>
                                            <div style={{ color: '#e7c965' }}>{f.labDay}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#d6d6d6' }}>at {f.unlockTime}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: '#d6d6d6' }}>Questions: <span style={{ color: '#ffffff' }}>{f.totalQuestionsAdded || 0}</span></div>
                                            <div style={{ fontSize: '0.85rem', color: '#d6d6d6' }}>Completed: <span style={{ color: '#ffffff' }}>{f.totalStudentsCompleted || 0}</span></div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                <button className="btn glass" style={{ padding: '8px', color: '#8254ee' }}><Edit size={18} /></button>
                                                <button onClick={() => handleDeleteFaculty(f._id)} className="btn glass" style={{ padding: '8px', color: '#ff5c5c' }}><Trash size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {user.role === 'superadmin' && activeTab === 'admins' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2>Create Lab Admin</h2>
                        <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            <input placeholder="Admin Name" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            <input placeholder="Email" type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            <input placeholder="Password" type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            <select value={adminForm.assignedLab} onChange={e => setAdminForm({...adminForm, assignedLab: e.target.value})} required className="glass" style={{ padding: '10px' }}>
                                <option value="" disabled>Assign Lab</option>
                                {LABS.map(lab => <option key={lab} value={lab}>{lab}</option>)}
                            </select>
                            <input placeholder="Phone Number" value={adminForm.phone} onChange={e => setAdminForm({...adminForm, phone: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Admin</button>
                        </form>
                    </div>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2>Active Lab Admins</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            {adminList.map(a => (
                                <div key={a._id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>{a.name || 'Lab Admin'}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'gray', margin: 0 }}>{a.email}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--primary)', margin: 0 }}>Assigned Lab: {a.assignedLab}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'gray', margin: 0 }}>Phone: {a.phone || 'N/A'} • Status: <span style={{ color: a.disabled ? 'var(--error)' : 'var(--accent)' }}>{a.disabled ? 'Disabled' : 'Active'}</span></p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleDeleteAdmin(a._id)} className="btn glass" style={{ color: 'var(--error)' }}><Trash size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
                                color: '#fff',
                                padding: '16px 24px',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(220, 38, 38, 0.4)',
                                fontWeight: 600,
                                fontSize: '1rem',
                            }}
                        >
                            <AlertCircle size={24} />
                            {toast}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
