import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Users,
    LogOut,
    Edit,
    Trash,
    BarChart2,
    BookOpen,
    Activity,
    AlertCircle,
    RefreshCw,
    ClipboardList,
    AlertTriangle,
    UserX,
    Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';

const socket = io('http://localhost:5000');

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Lab Admin dashboard: questions, student tracking, weekly progress, pending students, violations.
 */
const LabAdminDashboard = () => {
    const { user, logout, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [violations, setViolations] = useState([]);
    const [activeTab, setActiveTab] = useState('questions');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [questionForm, setQuestionForm] = useState({
        title: '',
        description: '',
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        sampleInput: '',
        sampleOutput: '',
        hiddenInput: '',
        hiddenOutput: '',
        difficulty: 'Easy',
        primaryLanguage: 'C',
        weekNumber: '',
        isFinalWeek: false,
        tags: '',
        unlockDate: '',
        deadlineDate: '',
    });
    const [violationForm, setViolationForm] = useState({
        studentId: '',
        title: '',
        details: '',
        severity: 'medium',
    });
    const [unlockForm, setUnlockForm] = useState({ weeklyUnlockDay: 'Monday', weeklyUnlockTime: '10:30' });
    const [toast, setToast] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        if (!user || user.role !== 'labadmin') return;
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };
            const [statsRes, studentsRes, questionsRes, violRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/stats', { headers }),
                axios.get('http://localhost:5000/api/admin/students', { headers }),
                axios.get('http://localhost:5000/api/admin/questions', { headers }),
                axios.get('http://localhost:5000/api/admin/violations', { headers }),
            ]);
            setStats(statsRes.data);
            setStudents(studentsRes.data);
            setQuestions(questionsRes.data);
            setViolations(violRes.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Failed to load');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role !== 'labadmin') {
            if (user.role === 'student') navigate('/dashboard', { replace: true });
            else if (user.role === 'superadmin') navigate('/super-admin', { replace: true });
            else if (user.role === 'admin') navigate('/admin', { replace: true });
            else navigate('/login', { replace: true });
            return;
        }
        const t = window.setTimeout(() => {
            void fetchDashboardData();
        }, 0);
        const handleViolationAlert = (report) => {
            if (user?.assignedLab && report.labName === user.assignedLab) {
                setToast(`🚨 Security Alert: ${report.student?.name} - ${report.title}`);
                setTimeout(() => setToast(null), 5000);
                fetchDashboardData();
            }
        };

        socket.on('submissionAdded', fetchDashboardData);
        socket.on('progressUpdated', fetchDashboardData);
        socket.on('questionAdded', fetchDashboardData);
        socket.on('questionDeleted', fetchDashboardData);
        socket.on('weekUnlocked', fetchDashboardData);
        socket.on('violationAlert', handleViolationAlert);
        return () => {
            window.clearTimeout(t);
            socket.off('submissionAdded', fetchDashboardData);
            socket.off('progressUpdated', fetchDashboardData);
            socket.off('questionAdded', fetchDashboardData);
            socket.off('questionDeleted', fetchDashboardData);
            socket.off('weekUnlocked', fetchDashboardData);
            socket.off('violationAlert', handleViolationAlert);
        };
    }, [user, navigate, fetchDashboardData]);

    useEffect(() => {
        if (user?.weeklyUnlockDay) {
            setUnlockForm({
                weeklyUnlockDay: user.weeklyUnlockDay,
                weeklyUnlockTime: user.weeklyUnlockTime || '10:30',
            });
        }
    }, [user?.weeklyUnlockDay, user?.weeklyUnlockTime]);

    const saveWeeklyUnlock = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                'http://localhost:5000/api/admin/me/weekly-unlock',
                {
                    weeklyUnlockDay: unlockForm.weeklyUnlockDay,
                    weeklyUnlockTime: unlockForm.weeklyUnlockTime,
                },
                { headers: { 'x-auth-token': token } }
            );
            await refreshUser();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not save schedule');
        }
    };

    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        
        const { title, description, inputFormat, outputFormat, sampleInput, sampleOutput, primaryLanguage, weekNumber } = questionForm;
        
        if (!title || !description || !inputFormat || !outputFormat || !sampleInput || !sampleOutput || !primaryLanguage || !weekNumber) {
            alert('Please fill all required fields');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const lab = user.assignedLab;
            
            // Following the requested API payload format exactly
            const payload = {
                title: questionForm.title,
                description: questionForm.description,
                inputFormat: questionForm.inputFormat,
                outputFormat: questionForm.outputFormat,
                constraints: questionForm.constraints,
                sampleInput: questionForm.sampleInput,
                sampleOutput: questionForm.sampleOutput,
                hiddenInput: questionForm.hiddenInput,
                hiddenOutput: questionForm.hiddenOutput,
                difficulty: questionForm.difficulty,
                primaryLanguage: questionForm.primaryLanguage,
                weekNumber: questionForm.weekNumber,
                isFinalWeek: questionForm.isFinalWeek,
                tags: questionForm.tags,
                unlockStartTime: questionForm.unlockDate,
                unlockEndTime: questionForm.deadlineDate,
                labName: lab
            };
            
            if (isEditing) {
                // If editing, keep old endpoint or map correctly (assuming old endpoint is kept for edits)
                const editPayload = {
                    ...questionForm,
                    tags: questionForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
                    labName: lab,
                    sampleTestCases: [{ input: questionForm.sampleInput, output: questionForm.sampleOutput }],
                    hiddenTestCases: [{ input: questionForm.hiddenInput || '0', output: questionForm.hiddenOutput || '0' }],
                };
                await axios.put(`http://localhost:5000/api/admin/questions/${questionForm._id}`, editPayload, {
                    headers: { 'x-auth-token': token },
                });
            } else {
                await axios.post('http://localhost:5000/api/questions/create', payload, {
                    headers: { 'x-auth-token': token },
                });
            }
            
            setQuestionForm({
                title: '',
                description: '',
                inputFormat: '',
                outputFormat: '',
                constraints: '',
                sampleInput: '',
                sampleOutput: '',
                hiddenInput: '',
                hiddenOutput: '',
                difficulty: 'Easy',
                primaryLanguage: '',
                weekNumber: '',
                isFinalWeek: false,
                tags: '',
                unlockDate: '',
                deadlineDate: '',
            });
            setIsEditing(false);
            fetchDashboardData();
            setToast('Question saved successfully');
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Database connection failed');
        }
    };

    const handleDeleteQuestion = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/questions/${id}`, { headers: { 'x-auth-token': token } });
            fetchDashboardData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleViolationSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:5000/api/admin/violations',
                {
                    studentId: violationForm.studentId,
                    title: violationForm.title,
                    details: violationForm.details,
                    severity: violationForm.severity,
                },
                { headers: { 'x-auth-token': token } }
            );
            setViolationForm({ studentId: '', title: '', details: '', severity: 'medium' });
            fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not create report');
        }
    };

    const updateViolationStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`http://localhost:5000/api/admin/violations/${id}`, { status }, { headers: { 'x-auth-token': token } });
            fetchDashboardData();
        } catch (err) {
            console.error(err);
        }
    };

    const pendingStudents = students.filter((s) => (s.pendingCount ?? 0) > 0 || (s.solvedCount ?? 0) === 0);

    const tabBtn = (id, label) => (
        <button
            type="button"
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
                padding: '12px 20px',
                borderRadius: '12px 12px 0 0',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                background: activeTab === id ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
            }}
        >
            {label}
        </button>
    );

    if (isLoading && !stats) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <PremiumHeader />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '4rem' }}>
                    <RefreshCw size={40} className="spin text-primary" />
                    <p style={{ color: 'gray' }}>Loading lab dashboard…</p>
                </div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                <PremiumHeader />
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <AlertCircle size={40} color="#ef4444" />
                    <p style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>
                    <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => fetchDashboardData()}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <PremiumHeader />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Lab Admin</h1>
                    <p style={{ margin: '0.25rem 0 0', color: 'gray', fontSize: '0.95rem' }}>
                        {user?.assignedLab ? `${user.assignedLab} · ` : ''}
                        {user?.name || user?.email}
                    </p>
                </div>
                <button type="button" className="btn glass" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LogOut size={18} /> Logout
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <motion.div whileHover={{ y: -3 }} className="card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6' }}>
                    <Users size={22} color="#3b82f6" />
                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem' }}>{stats?.studentsCount ?? 0}</h3>
                    <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>Students in lab</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="card" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6' }}>
                    <BookOpen size={22} color="#8b5cf6" />
                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem' }}>{stats?.questionsCount ?? 0}</h3>
                    <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>Questions</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
                    <Activity size={22} color="#10b981" />
                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem' }}>{stats?.completedCurrentWeek ?? 0}</h3>
                    <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>Completed current week</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
                    <UserX size={22} color="#f59e0b" />
                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem' }}>{pendingStudents.length}</h3>
                    <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>Pending students</p>
                </motion.div>
            </div>

            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(231,201,101,0.25)' }}>
                <h2 style={{ margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <Clock size={20} style={{ color: '#e7c965' }} /> Weekly unlock scheduler
                </h2>
                <p style={{ margin: '0 0 1rem', color: 'gray', fontSize: '0.88rem' }}>
                    When the server clock reaches this day and time, the next locked week for <strong>{user?.assignedLab || 'your lab'}</strong> is unlocked automatically (checked every minute).
                </p>
                <form onSubmit={saveWeeklyUnlock} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'gray', marginBottom: '0.35rem' }}>Unlock day</label>
                        <select
                            className="glass"
                            value={unlockForm.weeklyUnlockDay}
                            onChange={(e) => setUnlockForm({ ...unlockForm, weeklyUnlockDay: e.target.value })}
                            style={{ padding: '10px 12px', borderRadius: '8px', minWidth: '160px' }}
                        >
                            {WEEKDAYS.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'gray', marginBottom: '0.35rem' }}>Unlock time</label>
                        <input
                            type="time"
                            className="glass"
                            value={unlockForm.weeklyUnlockTime}
                            onChange={(e) => setUnlockForm({ ...unlockForm, weeklyUnlockTime: e.target.value })}
                            style={{ padding: '10px 12px', borderRadius: '8px' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
                        Save schedule
                    </button>
                </form>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                {tabBtn('questions', 'Question management')}
                {tabBtn('students', 'Student tracking')}
                {tabBtn('weekly', 'Weekly progress')}
                {tabBtn('pending', 'Pending students')}
                {tabBtn('violations', 'Violation reports')}
            </div>

            {activeTab === 'questions' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ marginTop: 0 }}>{isEditing ? 'Edit question' : 'Add question'}</h2>
                        <form onSubmit={handleQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <input
                                className="glass"
                                placeholder="Title"
                                value={questionForm.title}
                                onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                                required
                                style={{ padding: '10px' }}
                            />
                            <textarea
                                className="glass"
                                placeholder="Description"
                                value={questionForm.description}
                                onChange={(e) => setQuestionForm({ ...questionForm, description: e.target.value })}
                                required
                                style={{ padding: '10px', minHeight: '80px' }}
                            />
                            <input
                                className="glass"
                                placeholder="Input format"
                                value={questionForm.inputFormat}
                                onChange={(e) => setQuestionForm({ ...questionForm, inputFormat: e.target.value })}
                                required
                                style={{ padding: '10px' }}
                            />
                            <input
                                className="glass"
                                placeholder="Output format"
                                value={questionForm.outputFormat}
                                onChange={(e) => setQuestionForm({ ...questionForm, outputFormat: e.target.value })}
                                required
                                style={{ padding: '10px' }}
                            />
                            <input
                                className="glass"
                                placeholder="Constraints"
                                value={questionForm.constraints}
                                onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                                required
                                style={{ padding: '10px' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <textarea
                                    className="glass"
                                    placeholder="Sample input"
                                    value={questionForm.sampleInput}
                                    onChange={(e) => setQuestionForm({ ...questionForm, sampleInput: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                                <textarea
                                    className="glass"
                                    placeholder="Sample output"
                                    value={questionForm.sampleOutput}
                                    onChange={(e) => setQuestionForm({ ...questionForm, sampleOutput: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <textarea
                                    className="glass"
                                    placeholder="Hidden input"
                                    value={questionForm.hiddenInput}
                                    onChange={(e) => setQuestionForm({ ...questionForm, hiddenInput: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                                <textarea
                                    className="glass"
                                    placeholder="Hidden output"
                                    value={questionForm.hiddenOutput}
                                    onChange={(e) => setQuestionForm({ ...questionForm, hiddenOutput: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                <select
                                    className="glass"
                                    value={questionForm.difficulty}
                                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                                    style={{ padding: '10px' }}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                                <select
                                    className="glass"
                                    value={questionForm.primaryLanguage}
                                    onChange={(e) => setQuestionForm({ ...questionForm, primaryLanguage: e.target.value })}
                                    style={{ padding: '10px' }}
                                    required
                                >
                                    <option value="" disabled>Select Primary Language</option>
                                    <option value="C">C</option>
                                    <option value="C++">C++</option>
                                    <option value="Java">Java</option>
                                    <option value="Python">Python</option>
                                </select>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', alignItems: 'center' }}>
                                    <input
                                        className="glass"
                                        type="number"
                                        placeholder="Week #"
                                        value={questionForm.weekNumber}
                                        onChange={(e) => setQuestionForm({ ...questionForm, weekNumber: e.target.value })}
                                        style={{ padding: '10px' }}
                                    />
                                </div>
                                <input
                                    className="glass"
                                    placeholder="Tags (comma)"
                                    value={questionForm.tags}
                                    onChange={(e) => setQuestionForm({ ...questionForm, tags: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    type="datetime-local"
                                    className="glass"
                                    value={questionForm.unlockDate}
                                    onChange={(e) => setQuestionForm({ ...questionForm, unlockDate: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                                <input
                                    type="datetime-local"
                                    className="glass"
                                    value={questionForm.deadlineDate}
                                    onChange={(e) => setQuestionForm({ ...questionForm, deadlineDate: e.target.value })}
                                    style={{ padding: '10px' }}
                                />
                                </div>
                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: '#d6d6d6', marginBottom: '0.3rem', display: 'block' }}>Is This Final Week?</label>
                                <select 
                                    className="glass" 
                                    style={{ width: '100%', padding: '10px' }}
                                    value={questionForm.isFinalWeek ? 'true' : 'false'} 
                                    onChange={(e) => setQuestionForm({...questionForm, isFinalWeek: e.target.value === 'true'})}
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary">
                                {isEditing ? 'Update' : 'Publish'}
                            </button>
                            {isEditing && (
                                <button type="button" className="btn glass" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </button>
                            )}
                        </form>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', maxHeight: '720px', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>Existing questions</h3>
                        {questions.map((q) => (
                            <div
                                key={q._id}
                                className="card"
                                style={{
                                    marginBottom: '0.75rem',
                                    padding: '0.75rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <div>
                                    <strong>{q.title}</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'gray' }}>
                                        {q.difficulty} · Week linked via task
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button
                                        type="button"
                                        className="btn glass"
                                        onClick={() => {
                                            setIsEditing(true);
                                            setQuestionForm({
                                                ...q,
                                                sampleInput: q.sampleTestCases?.[0]?.input || '',
                                                sampleOutput: q.sampleTestCases?.[0]?.output || '',
                                                hiddenInput: q.hiddenTestCases?.[0]?.input || '',
                                                hiddenOutput: q.hiddenTestCases?.[0]?.output || '',
                                                primaryLanguage: q.primaryLanguage || 'C',
                                                tags: q.tags?.join(', ') || '',
                                                weekNumber: '',
                                                isFinalWeek: false,
                                                unlockDate: '',
                                                deadlineDate: '',
                                            });
                                        }}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button type="button" className="btn glass" style={{ color: '#ef4444' }} onClick={() => handleDeleteQuestion(q._id)}>
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                    <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={22} /> Student tracking
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', color: 'gray' }}>
                                <th style={{ padding: '0.75rem 0' }}>Student</th>
                                <th>Solved / Pending</th>
                                <th>Class</th>
                                <th>Section</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem 0' }}>
                                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'gray' }}>{s.regNo}</div>
                                    </td>
                                    <td>
                                        <span style={{ color: '#10b981' }}>{s.solvedCount}</span> /{' '}
                                        <span style={{ color: '#f87171' }}>{s.pendingCount}</span>
                                    </td>
                                    <td>{s.classAndYear || '—'}</td>
                                    <td>{s.section || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'students' && stats?.latestSubmissions?.length > 0 && (
                <div className="card" style={{ padding: '1.5rem', overflowX: 'auto', marginTop: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#e7c965' }}>Recent Submissions History</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', color: 'gray' }}>
                                <th style={{ padding: '0.75rem 0' }}>Student</th>
                                <th>Question</th>
                                <th>Languages Used</th>
                                <th>Attempts</th>
                                <th>Latest Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.latestSubmissions.map((sub) => (
                                <tr key={sub._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem 0' }}>
                                        <div style={{ fontWeight: 600 }}>{sub.user?.name || 'Unknown'}</div>
                                    </td>
                                    <td>{sub.question?.title || 'Unknown'}</td>
                                    <td>{sub.languagesUsed?.join(', ') || sub.language || 'N/A'}</td>
                                    <td>{sub.attempts || 1}</td>
                                    <td>
                                        <span style={{ color: sub.status === 'Accepted' ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                            {sub.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'weekly' && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={22} /> Weekly progress
                    </h2>
                    <p style={{ color: 'gray', fontSize: '0.9rem' }}>Completed vs pending learners per week for your lab cohort.</p>
                    <div style={{ height: 360 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.weeklyCompletionData || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                                <XAxis dataKey="name" stroke="#ccc" />
                                <YAxis stroke="#ccc" />
                                <Tooltip contentStyle={{ background: '#1a1528', border: '1px solid #333' }} />
                                <Legend />
                                <Bar dataKey="completed" fill="#8254ee" name="Completed" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pending" fill="#f97316" name="Pending" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === 'pending' && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList size={22} /> Pending students
                    </h2>
                    <p style={{ color: 'gray', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Students with remaining problems or no accepted submissions in this lab.
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', color: 'gray', textAlign: 'left' }}>
                                <th style={{ padding: '0.5rem 0' }}>Student</th>
                                <th>Pending</th>
                                <th>Solved</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingStudents.map((s) => (
                                <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <td style={{ padding: '0.65rem 0' }}>
                                        <strong>{s.name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: 'gray' }}>{s.regNo}</div>
                                    </td>
                                    <td style={{ color: '#fb923c', fontWeight: 600 }}>{s.pendingCount}</td>
                                    <td style={{ color: '#34d399' }}>{s.solvedCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {pendingStudents.length === 0 && <p style={{ color: 'gray' }}>No pending students in this lab.</p>}
                </div>
            )}

            {activeTab === 'violations' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={20} color="#fbbf24" /> New report
                        </h3>
                        <form onSubmit={handleViolationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <select
                                className="glass"
                                required
                                value={violationForm.studentId}
                                onChange={(e) => setViolationForm({ ...violationForm, studentId: e.target.value })}
                                style={{ padding: '10px' }}
                            >
                                <option value="">Select student</option>
                                {students.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        {s.name} ({s.regNo})
                                    </option>
                                ))}
                            </select>
                            <input
                                className="glass"
                                placeholder="Short title"
                                value={violationForm.title}
                                onChange={(e) => setViolationForm({ ...violationForm, title: e.target.value })}
                                required
                                style={{ padding: '10px' }}
                            />
                            <textarea
                                className="glass"
                                placeholder="Details"
                                value={violationForm.details}
                                onChange={(e) => setViolationForm({ ...violationForm, details: e.target.value })}
                                style={{ padding: '10px', minHeight: '80px' }}
                            />
                            <select
                                className="glass"
                                value={violationForm.severity}
                                onChange={(e) => setViolationForm({ ...violationForm, severity: e.target.value })}
                                style={{ padding: '10px' }}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                            <button type="submit" className="btn btn-primary">
                                Submit report
                            </button>
                        </form>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', maxHeight: '640px', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>Reports</h3>
                        {violations.map((v) => (
                            <div
                                key={v._id}
                                className="card"
                                style={{ marginBottom: '0.75rem', padding: '0.85rem', background: 'rgba(255,255,255,0.04)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <strong>{v.title}</strong>
                                    <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{v.severity}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'gray', marginTop: '0.25rem' }}>
                                    {v.student?.name} · {v.status}
                                </div>
                                {v.details && <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0' }}>{v.details}</p>}
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    {['open', 'investigating', 'resolved'].map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            className="btn glass"
                                            style={{ fontSize: '0.75rem', padding: '4px 8px', opacity: v.status === st ? 1 : 0.6 }}
                                            onClick={() => updateViolationStatus(v._id, st)}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {violations.length === 0 && <p style={{ color: 'gray' }}>No violation reports yet.</p>}
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
                            <AlertTriangle size={24} />
                            {toast}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LabAdminDashboard;
