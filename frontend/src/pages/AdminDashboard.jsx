import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, FileText, CheckSquare, LogOut, Edit, Trash, BarChart2, Briefcase, Shield, BookOpen, Activity, AlertCircle, RefreshCw, Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';

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
    const [activeTab, setActiveTab] = useState('analytics');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Forms state
    const [isEditing, setIsEditing] = useState(false);
    const [questionForm, setQuestionForm] = useState({
        title: '', description: '', inputFormat: '', outputFormat: '', 
        constraints: '', sampleInput: '', sampleOutput: '', hiddenInput: '', hiddenOutput: '',
        difficulty: 'Easy', weekNumber: '', tags: '', labName: '', basePoints: 100,
        unlockDate: '', deadlineDate: '', primaryLanguage: '', isFinalWeek: false,
        assignedYear: '', assignedSection: '', facultyName: '', subjectName: '', published: false
    });

    const [facultyForm, setFacultyForm] = useState({ 
        name: '', email: '', password: '', role: 'faculty', subject: '',
        assignedLab: '', assignedSections: '', assignedYear: '', 
        labDay: 'Thursday', startTime: '10:30', endTime: '12:30' 
    });
    const [studentForm, setStudentForm] = useState({
        name: '', regNo: '', dob: '', password: '', classAndYear: '', subjectName: '', selectedLab: 'Data Structures Lab', facultyName: '', section: ''
    });
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', assignedLab: '', phone: '' });
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [analyticsFilters, setAnalyticsFilters] = useState({ year: '', section: '', lab: '', language: '', branch: '', status: '', minPoints: '', minAccuracy: '' });

    // Enhanced analytics state
    const [hodData, setHodData] = useState(null);
    const [studentAnalytics, setStudentAnalytics] = useState([]);
    const [hodFilters, setHodFilters] = useState({ year: '', section: '', lab: '', language: '', branch: '' });
    const [labStudentsData, setLabStudentsData] = useState([]);

    // Advanced filter state
    const [advancedFilters, setAdvancedFilters] = useState({ search: '', year: '', section: '', branch: '', lab: '', language: '', timeSolved: '', timeSolvedOrder: '', languageProficiency: '', solvedFilter: '', solvedOrder: '', pointsFilter: '', pointsOrder: '', accuracyFilter: '', accuracyValue: '', consistencyFilter: '', page: 1, limit: 50 });
    const [filteredResults, setFilteredResults] = useState(null);
    const [filterLoading, setFilterLoading] = useState(false);

    // Account Management State
    const [manageUsers, setManageUsers] = useState([]);
    const [managePagination, setManagePagination] = useState(null);
    const [managePage, setManagePage] = useState(1);
    const [manageLoading, setManageLoading] = useState(false);
    const [accountSearch, setAccountSearch] = useState('');
    const [accountRoleFilter, setAccountRoleFilter] = useState('');
    const [editingUserId, setEditingUserId] = useState(null);
    const [editField, setEditField] = useState('');
    const [editValue, setEditValue] = useState('');

    // Fetch manage accounts
    const fetchManageAccounts = useCallback(async () => {
        if (user?.role !== 'hod') return;
        setManageLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ page: managePage, limit: 50 });
            if (accountSearch) params.append('search', accountSearch);
            if (accountRoleFilter) params.append('role', accountRoleFilter);
            const res = await axios.get(`http://localhost:5000/api/admin/manage/users?${params}`, {
                headers: { 'x-auth-token': token }
            });
            setManageUsers(res.data.users);
            setManagePagination(res.data.pagination);
        } catch (err) {
            console.error('Error fetching manage users:', err);
        } finally {
            setManageLoading(false);
        }
    }, [user, managePage, accountSearch, accountRoleFilter]);

    const startEdit = (userId, field, value) => {
        setEditingUserId(userId);
        setEditField(field);
        setEditValue(value);
    };

    const handleChangeEmail = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/admin/manage/change-email', { userId, newEmail: editValue }, {
                headers: { 'x-auth-token': token }
            });
            setToast('Email updated successfully');
            setTimeout(() => setToast(null), 3000);
            setEditingUserId(null);
            fetchManageAccounts();
        } catch (err) {
            alert(err.response?.data?.message || 'Error changing email');
        }
    };

    const handleChangePassword = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/admin/manage/change-password', { userId, newPassword: editValue }, {
                headers: { 'x-auth-token': token }
            });
            setToast('Password reset successfully');
            setTimeout(() => setToast(null), 3000);
            setEditingUserId(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Error changing password');
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/admin/manage/toggle-status', { userId }, {
                headers: { 'x-auth-token': token }
            });
            setToast('Account status toggled');
            setTimeout(() => setToast(null), 3000);
            fetchManageAccounts();
        } catch (err) {
            alert(err.response?.data?.message || 'Error toggling status');
        }
    };

    const LABS = ["Data Structures Lab", "C", "DS", "ADSAA", "JAVA", "PYTHON", "DBMS", "OS", "CN", "AI", "ML", "FSAD"];

    // Fetch manage accounts when search/filter/page changes
    useEffect(() => {
        if (user?.role === 'hod') fetchManageAccounts();
    }, [managePage, accountSearch, accountRoleFilter, user?.role]);

    // Client-side filtering for Student Analytics
    const filteredStudents = (labStudentsData || []).filter(s => {
        const sq = searchQuery.toLowerCase();
        if (sq && !s.name?.toLowerCase().includes(sq) && !s.regNo?.toLowerCase().includes(sq) && !(s.assignedLab || s.selectedLab || '').toLowerCase().includes(sq) && !(s.branch || '').toLowerCase().includes(sq)) return false;
        if (analyticsFilters.year && s.year !== analyticsFilters.year) return false;
        if (analyticsFilters.section && s.section !== analyticsFilters.section) return false;
        if (analyticsFilters.branch && s.branch !== analyticsFilters.branch) return false;
        if (analyticsFilters.lab && (s.assignedLab || s.selectedLab) !== analyticsFilters.lab) return false;
        if (analyticsFilters.language && s.bestLanguage !== analyticsFilters.language) return false;
        if (analyticsFilters.minPoints && (s.totalPoints || 0) < parseInt(analyticsFilters.minPoints)) return false;
        if (analyticsFilters.minAccuracy && (s.accuracy || s.successRate || 0) < parseInt(analyticsFilters.minAccuracy)) return false;
        return true;
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role === 'labadmin') {
            navigate('/lab-admin', { replace: true });
            return;
        }
        const allowedRoles = ['hod', 'faculty'];
        if (!allowedRoles.includes(user.role)) {
            navigate('/login');
            return;
        }
        // Pre-populate faculty name from logged-in user
        if (user.name && !questionForm.facultyName) {
            setQuestionForm(prev => ({ ...prev, facultyName: user.name }));
        }
        fetchDashboardData();
        if (user.role === 'hod') fetchManageAccounts();

        const handleViolationAlert = (report) => {
        const isSuperOrHOD = user.role === 'hod';
            if (isSuperOrHOD || (user.assignedLab && report.labName === user.assignedLab)) {
                setToast(`🚨 Security Alert: ${report.student?.name} - ${report.title}`);
                setTimeout(() => setToast(null), 5000);
            }
        };

        socket.on('submissionAdded', () => fetchDashboardData(true));
        socket.on('progressUpdated', () => fetchDashboardData(true));
        socket.on('questionAdded', () => fetchDashboardData(true));
        socket.on('questionDeleted', () => fetchDashboardData(true));
        socket.on('weekUnlocked', () => fetchDashboardData(true));
        socket.on('violationAlert', handleViolationAlert);

        return () => {
            socket.off('submissionAdded');
            socket.off('progressUpdated');
            socket.off('questionAdded');
            socket.off('questionDeleted');
            socket.off('weekUnlocked');
            socket.off('violationAlert', handleViolationAlert);
        };
    }, [user, navigate]);

    const fetchDashboardData = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const isSuperOrHOD = user.role === 'hod';

        const timeoutPromise = (promise, ms = 10000) =>
            Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
            ]);

        try {
            const [statsRes, studentsRes, questionsRes] = await Promise.all([
                timeoutPromise(axios.get('http://localhost:5000/api/admin/stats', { headers: { 'x-auth-token': token } })),
                timeoutPromise(axios.get('http://localhost:5000/api/admin/students', { headers: { 'x-auth-token': token } })),
                timeoutPromise(axios.get('http://localhost:5000/api/admin/questions', { headers: { 'x-auth-token': token } }))
            ]);
            setStats(statsRes.data);
            setStudents(studentsRes.data);
            setQuestions(questionsRes.data);

            if (isSuperOrHOD) {
                const results = await Promise.allSettled([
                    timeoutPromise(axios.get('http://localhost:5000/api/admin/faculty', { headers: { 'x-auth-token': token } })),
                    timeoutPromise(axios.get('http://localhost:5000/api/admin/admins', { headers: { 'x-auth-token': token } })),
                    timeoutPromise(axios.get('http://localhost:5000/api/analytics/hod/dashboard', { params: hodFilters, headers: { 'x-auth-token': token } })),
                    timeoutPromise(axios.get('http://localhost:5000/api/analytics/lab/students', { headers: { 'x-auth-token': token } })),
                    timeoutPromise(axios.get('http://localhost:5000/api/analytics/advanced', { params: advancedFilters, headers: { 'x-auth-token': token } }))
                ]);
                if (results[0].status === 'fulfilled') setFacultyList(results[0].value.data);
                if (results[1].status === 'fulfilled') setAdminList(results[1].value.data);
                if (results[2].status === 'fulfilled') setHodData(results[2].value.data);
                if (results[3].status === 'fulfilled') setLabStudentsData(results[3].value.data);
                if (results[4].status === 'fulfilled') { setFilteredResults(results[4].value.data); setLabStudentsData(results[4].value.data.students); }
            } else {
                try {
                    const labRes = await timeoutPromise(axios.get('http://localhost:5000/api/analytics/advanced', { params: advancedFilters, headers: { 'x-auth-token': token } }));
                    setFilteredResults(labRes.data);
                    setLabStudentsData(labRes.data.students);
                } catch (e) { /* advanced filter might not be available */ }
            }
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            if (err.code === 'ERR_NETWORK') {
                setError("Network error: Cannot connect to the server. Please ensure the backend is running on port 5000.");
            } else {
                setError(`Failed to load dashboard data: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAdvancedFilteredData = useCallback(async (filters) => {
        setFilterLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = { ...filters };
            // Remove empty values
            Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
            const res = await axios.get('http://localhost:5000/api/analytics/advanced', { params, headers: { 'x-auth-token': token } });
            setFilteredResults(res.data);
            setLabStudentsData(res.data.students);
        } catch (err) {
            console.error('Advanced filter error:', err);
        } finally {
            setFilterLoading(false);
        }
    }, []);

    const handleFilterChange = (newFilters) => {
        setAdvancedFilters(newFilters);
        fetchAdvancedFilteredData(newFilters);
    };

    const handleResetFilters = () => {
        const reset = { search: '', year: '', section: '', branch: '', lab: '', language: '', timeSolved: '', timeSolvedOrder: '', languageProficiency: '', solvedFilter: '', solvedOrder: '', pointsFilter: '', pointsOrder: '', accuracyFilter: '', accuracyValue: '', consistencyFilter: '', page: 1, limit: 50 };
        setAdvancedFilters(reset);
        fetchAdvancedFilteredData(reset);
    };

    const handleSearch = (query) => {
        const updated = { ...advancedFilters, search: query, page: 1 };
        setAdvancedFilters(updated);
        fetchAdvancedFilteredData(updated);
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
                labName: (user.role === 'labadmin' || user.role === 'faculty') ? user.assignedLab : questionForm.labName,
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
                difficulty: 'Easy', weekNumber: '', tags: '', labName: '', basePoints: 100,
                unlockDate: '', deadlineDate: '', primaryLanguage: '', isFinalWeek: false,
                assignedYear: '', assignedSection: '', facultyName: '', subjectName: '', published: false
            });
            setIsEditing(false);
            setToast(`✅ Question "${questionForm.title}" published successfully! Students can now see it in their lab.`);
            setTimeout(() => setToast(null), 5000);
            fetchDashboardData();
        } catch (err) { 
            console.error("Error saving question");
            setToast(`❌ Failed to publish: ${err.response?.data?.message || err.message}`);
            setTimeout(() => setToast(null), 5000);
        }
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
            setFacultyForm({ name: '', email: '', password: '', role: 'faculty', assignedLab: '', assignedSections: '', assignedYear: '', labDay: 'Thursday', unlockTime: '10:30' });
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
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
                <PremiumHeader />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <RefreshCw size={48} className="spin text-primary" />
                    <h2 style={{ color: 'var(--text)' }}>Loading Dashboard...</h2>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
                <PremiumHeader />
                <div className="card" style={{ display: 'inline-block', padding: '2rem 3rem' }}>
                    <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Failed to Load Dashboard</h2>
                    <p style={{ color: 'gray', marginBottom: '1.5rem' }}>{error || "No data available"}</p>
                    <button onClick={fetchDashboardData} className="btn btn-primary" style={{ padding: '10px 20px', fontWeight: 'bold' }}>
                        <RefreshCw size={18} style={{ marginRight: '8px' }} /> Retry Connection
                    </button>
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
                
                {(user.role === 'hod' || user.role === 'labadmin' || user.role === 'faculty') && (
                    <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)' }}>
                        <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><Briefcase size={28} /></div>
                        <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{facultyList.length || 0}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem' }}>Total Active Labs: {LABS.length}</p></div>
                    </motion.div>
                )}
                
                {user.role === 'hod' && (
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
                <button onClick={() => setActiveTab('analytics')} style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px 12px 0 0', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    background: activeTab === 'analytics' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    boxShadow: activeTab === 'analytics' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
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
                <button onClick={() => setActiveTab('analytics')} style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px 12px 0 0', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    background: activeTab === 'analytics' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    boxShadow: activeTab === 'analytics' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                }}>Student Analytics</button>
                {user.role === 'hod' && (
                    <button onClick={() => setActiveTab('hod')} style={{ 
                        padding: '12px 24px', 
                        borderRadius: '12px 12px 0 0', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        background: activeTab === 'hod' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        boxShadow: activeTab === 'hod' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                    }}>HOD Analytics</button>
                )}
                {user.role === 'hod' && (
                    <button onClick={() => setActiveTab('accounts')} style={{ 
                        padding: '12px 24px', 
                        borderRadius: '12px 12px 0 0', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        background: activeTab === 'accounts' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        boxShadow: activeTab === 'accounts' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                    }}>Manage Accounts</button>
                )}
                {(user.role === 'faculty') && (
                    <button onClick={() => setActiveTab('facultyView')} style={{ 
                        padding: '12px 24px', 
                        borderRadius: '12px 12px 0 0', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        background: activeTab === 'facultyView' ? 'linear-gradient(135deg, #8254ee, #e7c965)' : 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        boxShadow: activeTab === 'facultyView' ? '0 4px 15px rgba(130, 84, 238, 0.3)' : 'none'
                    }}>Faculty Dashboard</button>
                )}
                {user.role === 'hod' && (
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

            {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <AdvancedFilterPanel
                        filters={advancedFilters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        onSearch={handleSearch}
                        totalResults={filteredResults?.pagination?.total}
                    />
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
                            {user.role === 'hod' && (
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
                                    <option value="JavaScript">JavaScript</option>
                                </select>
                                <input placeholder="Week (e.g. 1)" type="number" value={questionForm.weekNumber} onChange={e => setQuestionForm({...questionForm, weekNumber: e.target.value})} required className="glass" style={{ padding: '10px' }} />
                            </div>
                            {/* Custom Points Reward - Faculty Defined */}
                            <div style={{ 
                                background: 'linear-gradient(135deg, rgba(231,201,101,0.08), rgba(130,84,238,0.08))', 
                                border: '1px solid rgba(231,201,101,0.2)', 
                                borderRadius: '12px', 
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                <label style={{ fontSize: '0.85rem', color: '#e7c965', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    💎 Custom Points Reward (Faculty Defined)
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                                    Set the base points for this question. Students earn these points when they solve it correctly, with time-based bonuses.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <input 
                                        placeholder="Enter points (e.g. 25)" 
                                        type="number" 
                                        value={questionForm.basePoints} 
                                        onChange={e => setQuestionForm({...questionForm, basePoints: Number(e.target.value) || 0})} 
                                        required 
                                        className="glass" 
                                        style={{ 
                                            padding: '12px 16px', 
                                            border: '2px solid #e7c965', 
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            width: '200px',
                                            color: '#e7c965',
                                        }} 
                                    />
                                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                                        Base: {questionForm.basePoints} pts | 
                                        Speed bonus available: +{Math.round(questionForm.basePoints * 0.15)} pts
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <input placeholder="Tags (comma separated)" value={questionForm.tags} onChange={e => setQuestionForm({...questionForm, tags: e.target.value})} className="glass" style={{ padding: '10px' }} />
                            </div>
                            {/* Assignment Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                                <input placeholder="Assigned Year (e.g. 2nd Year)" value={questionForm.assignedYear} onChange={e => setQuestionForm({...questionForm, assignedYear: e.target.value})} className="glass" style={{ padding: '10px' }} />
                                <input placeholder="Assigned Section (e.g. A)" value={questionForm.assignedSection} onChange={e => setQuestionForm({...questionForm, assignedSection: e.target.value})} className="glass" style={{ padding: '10px' }} />
                                <input placeholder="Faculty Name" value={questionForm.facultyName} onChange={e => setQuestionForm({...questionForm, facultyName: e.target.value})} className="glass" style={{ padding: '10px' }} />
                                <input placeholder="Subject Name" value={questionForm.subjectName} onChange={e => setQuestionForm({...questionForm, subjectName: e.target.value})} className="glass" style={{ padding: '10px' }} />
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
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {isEditing ? 'Update Question' : '📢 Publish & Schedule'}
                                    {!isEditing && <span style={{ fontSize: '0.7rem', marginLeft: '0.3rem', opacity: 0.8 }}>• Published</span>}
                                </button>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                                <h4 style={{ margin: 0 }}>{q.title}</h4>
                                                {q.published ? (
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(52,211,153,0.3)' }}>
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(245,158,11,0.3)' }}>
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'gray', margin: '0.1rem 0' }}>{q.difficulty} • Lab: {q.labName || 'N/A'}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#e7c965', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                💎 {q.basePoints || 100} pts | Week {q.weekNumber || '—'} | {q.primaryLanguage || '—'}
                                                {q.assignedYear && <span style={{ color: '#9ca3af' }}>| Year: {q.assignedYear}</span>}
                                                {q.assignedSection && <span style={{ color: '#9ca3af' }}>| Sec: {q.assignedSection}</span>}
                                                {q.facultyName && <span style={{ color: '#9ca3af' }}>| {q.facultyName}</span>}
                                            </p>
                                        </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => {
                                            setIsEditing(true);
                                            setQuestionForm({...q, sampleInput: q.sampleTestCases?.[0]?.input || '', sampleOutput: q.sampleTestCases?.[0]?.output || '', hiddenInput: q.hiddenTestCases?.[0]?.input || '', hiddenOutput: q.hiddenTestCases?.[0]?.output || '', tags: q.tags?.join(', ') || '', weekNumber: q.weekNumber || '', primaryLanguage: q.primaryLanguage || '', isFinalWeek: q.isFinalWeek || false, basePoints: q.basePoints || 100, assignedYear: q.assignedYear || '', assignedSection: q.assignedSection || '', facultyName: q.facultyName || '', subjectName: q.subjectName || '', published: q.published || false});
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
                    {user?.role === 'hod' && (
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
                    <AdvancedFilterPanel
                        filters={advancedFilters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        onSearch={handleSearch}
                        totalResults={filteredResults?.pagination?.total}
                    />
                    <div className="card" style={{ padding: '2rem', overflowX: 'auto' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Student Tracking System</h2>
                        {filterLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                                Filtering students...
                            </div>
                        ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', color: 'gray' }}>
                                    <th style={{ padding: '1rem 0' }}>Name & Reg No</th>
                                    <th>Solved / Pending</th>
                                    <th>Year</th>
                                    <th>Section</th>
                                    <th>Lab</th>
                                    <th>Accuracy</th>
                                    <th>Points</th>
                                    <th>Consistency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filteredResults?.students || []).length === 0 && (
                                    <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No students match your filters</td></tr>
                                )}
                                {(filteredResults?.students || []).map(s => (
                                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem 0' }}>
                                            <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'gray' }}>{s.regNo}</div>
                                        </td>
                                        <td><span style={{ color: '#34d399', fontWeight: 'bold' }}>{s.acceptedSubmissions}</span> / <span style={{ color: '#f87171', fontWeight: 'bold' }}>{(s.submissions || 0) - (s.acceptedSubmissions || 0)}</span></td>
                                        <td>{s.year || 'N/A'}</td>
                                        <td>{s.section || 'N/A'}</td>
                                        <td><span style={{ background: 'rgba(130,84,238,0.2)', color: '#8254ee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.assignedLab}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${s.accuracy || 0}%`, height: '100%', background: 'linear-gradient(90deg, #8254ee, #34d399)', borderRadius: '2px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem' }}>{s.accuracy}%</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#e7c965', fontWeight: 'bold' }}>{s.totalPoints}</td>
                                        <td>
                                            <span style={{ color: s.consistencyScore > 70 ? '#34d399' : s.consistencyScore > 40 ? '#e7c965' : '#ef4444', fontSize: '0.75rem' }}>{s.consistencyScore}%</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        )}
                        {filteredResults?.pagination && filteredResults.pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                                <button className="glass" disabled={advancedFilters.page <= 1} onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page - 1 })} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', opacity: advancedFilters.page <= 1 ? 0.4 : 1, cursor: advancedFilters.page <= 1 ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}>Previous</button>
                                <span style={{ fontSize: '0.8rem', color: '#888', padding: '6px 0' }}>Page {filteredResults.pagination.page} of {filteredResults.pagination.totalPages}</span>
                                <button className="glass" disabled={advancedFilters.page >= filteredResults.pagination.totalPages} onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page + 1 })} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', opacity: advancedFilters.page >= filteredResults.pagination.totalPages ? 0.4 : 1, cursor: advancedFilters.page >= filteredResults.pagination.totalPages ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}>Next</button>
                            </div>
                        )}
                </div>
            </div>
            )}

            {activeTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <AdvancedFilterPanel
                        filters={advancedFilters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        onSearch={handleSearch}
                        totalResults={filteredResults?.pagination?.total}
                    />
                    <div className="card" style={{ padding: '2rem', overflowX: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>Student Performance Analytics</h2>
                            {filteredResults?.summary && (
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#888' }}>
                                    <span>Avg Accuracy: <strong style={{ color: '#34d399' }}>{filteredResults.summary.averageAccuracy}%</strong></span>
                                    <span>Total Points: <strong style={{ color: '#e7c965' }}>{filteredResults.summary.totalPoints.toLocaleString()}</strong></span>
                                    <span>Accepted: <strong style={{ color: '#56b6c2' }}>{filteredResults.summary.totalAccepted}</strong> / {filteredResults.summary.totalSubmissions}</span>
                                </div>
                            )}
                        </div>
                        {filterLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                                <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
                                <span>Filtering students...</span>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)', color: '#aaa' }}>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Name</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Reg No</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Lab</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Solved</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Points</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Accuracy</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Best Lang</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Consistency</th>
                                            <th style={{ padding: '0.8rem 0.5rem' }}>Solve Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(labStudentsData || []).length === 0 && (
                                            <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No students match your filters</td></tr>
                                        )}
                                        {(labStudentsData || []).map(s => (
                                            <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold', color: '#fff' }}>{s.name}</td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#aaa' }}>{s.regNo}</td>
                                                <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ background: 'rgba(130,84,238,0.2)', color: '#8254ee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.assignedLab}</span></td>
                                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                                    <span style={{ color: '#34d399' }}>{s.acceptedSubmissions}</span>/{s.submissions}
                                                    {s.weeklySolved > 0 && <span style={{ color: '#e7c965', fontSize: '0.65rem', marginLeft: '0.4rem' }}>(w:{s.weeklySolved})</span>}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#e7c965', fontWeight: 'bold' }}>{s.totalPoints}</td>
                                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <div style={{ width: '60px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${s.accuracy || 0}%`, height: '100%', background: 'linear-gradient(90deg, #8254ee, #34d399)', borderRadius: '3px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem' }}>{s.accuracy}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                                    {s.bestLanguage ? (
                                                        <span style={{ background: 'rgba(86,182,194,0.2)', color: '#56b6c2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{s.bestLanguage}</span>
                                                    ) : <span style={{ color: '#555' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.5rem' }}>
                                                    {s.consistencyScore !== undefined ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            <div style={{ width: '40px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${s.consistencyScore}%`, height: '100%', background: s.consistencyScore > 70 ? '#34d399' : s.consistencyScore > 40 ? '#e7c965' : '#ef4444', borderRadius: '3px' }} />
            {user.role === 'hod' && activeTab === 'accounts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1rem', color: '#e7c965' }}>Account Management</h2>
                        <p style={{ color: 'gray', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Manage Faculty and Lab Admin accounts. You can change emails, reset passwords, and enable/disable accounts.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <input
                                placeholder="Search by name or email..."
                                className="glass"
                                style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                                value={accountSearch}
                                onChange={e => setAccountSearch(e.target.value)}
                            />
                            <select
                                className="glass"
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}
                                value={accountRoleFilter}
                                onChange={e => setAccountRoleFilter(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                <option value="faculty">Faculty</option>
                                <option value="labadmin">Lab Admin</option>
                            </select>
                            <button className="btn glass" onClick={fetchManageAccounts} style={{ padding: '10px 20px' }}>
                                <RefreshCw size={16} style={{ marginRight: '6px' }} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {manageUsers.length > 0 && (
                        <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border)', color: '#aaa' }}>
                                        <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>Name</th>
                                        <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>Email</th>
                                        <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>Role</th>
                                        <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>Lab</th>
                                        <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>Status</th>
                                        <th style={{ padding: '0.8rem 0.5rem', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {manageUsers.map(u => (
                                        <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold', color: '#fff' }}>{u.name}</td>
                                            <td style={{ padding: '0.6rem 0.5rem', color: '#aaa', fontSize: '0.8rem' }}>
                                                {editingUserId === u._id && editField === 'email' ? (
                                                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                        <input
                                                            type="email"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            className="glass"
                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', width: '180px', background: '#111', border: '1px solid #8254ee', borderRadius: '4px', color: '#fff' }}
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') handleChangeEmail(u._id); if (e.key === 'Escape') setEditingUserId(null); }}
                                                        />
                                                        <button onClick={() => handleChangeEmail(u._id)} style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Save</button>
                                                        <button onClick={() => setEditingUserId(null)} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <span>{u.email} <button onClick={() => startEdit(u._id, 'email', u.email)} style={{ background: 'none', border: 'none', color: '#8254ee', cursor: 'pointer', fontSize: '0.7rem', marginLeft: '4px' }}>[Edit]</button></span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.6rem 0.5rem' }}>
                                                <span style={{ background: u.role === 'faculty' ? 'rgba(130,84,238,0.15)' : 'rgba(86,182,194,0.15)', color: u.role === 'faculty' ? '#8254ee' : '#56b6c2', padding: '2px 10px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                    {u.role === 'faculty' ? 'Faculty' : 'Lab Admin'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.5rem', color: '#aaa', fontSize: '0.8rem' }}>{u.assignedLab || '—'}</td>
                                            <td style={{ padding: '0.6rem 0.5rem' }}>
                                                <span style={{ color: u.isActive !== false ? '#34d399' : '#ef4444', fontSize: '0.75rem' }}>
                                                    {u.isActive !== false ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {editingUserId === u._id && editField === 'password' ? (
                                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                            <input
                                                                type="password"
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                className="glass"
                                                                style={{ padding: '4px 8px', fontSize: '0.8rem', width: '120px', background: '#111', border: '1px solid #e7c965', borderRadius: '4px', color: '#fff' }}
                                                                placeholder="New password"
                                                                autoFocus
                                                                onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(u._id); if (e.key === 'Escape') setEditingUserId(null); }}
                                                            />
                                                            <button onClick={() => handleChangePassword(u._id)} style={{ background: 'rgba(231,201,101,0.15)', color: '#e7c965', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Save</button>
                                                            <button onClick={() => setEditingUserId(null)} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => startEdit(u._id, 'password', '')} style={{ background: 'rgba(231,201,101,0.1)', color: '#e7c965', border: '1px solid rgba(231,201,101,0.2)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>Reset Password</button>
                                                    )}
                                                    <button onClick={() => handleToggleStatus(u._id)} style={{ background: u.isActive !== false ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: u.isActive !== false ? '#ef4444' : '#34d399', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                                                        {u.isActive !== false ? 'Disable' : 'Enable'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {managePagination?.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button className="glass" disabled={managePage <= 1} onClick={() => { setManagePage(p => p - 1); setTimeout(fetchManageAccounts, 0); }} style={{ padding: '5px 12px', fontSize: '0.75rem', opacity: managePage <= 1 ? 0.4 : 1 }}>Previous</button>
                                    <span style={{ fontSize: '0.75rem', color: '#888', padding: '5px 0' }}>Page {managePage} of {managePagination.totalPages}</span>
                                    <button className="glass" disabled={managePage >= managePagination.totalPages} onClick={() => { setManagePage(p => p + 1); setTimeout(fetchManageAccounts, 0); }} style={{ padding: '5px 12px', fontSize: '0.75rem', opacity: managePage >= managePagination.totalPages ? 0.4 : 1 }}>Next</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

                </div>
                                                            <span style={{ fontSize: '0.7rem', color: s.consistencyScore > 70 ? '#34d399' : s.consistencyScore > 40 ? '#e7c965' : '#ef4444' }}>{s.consistencyScore}%</span>
                                                        </div>
                                                    ) : <span style={{ color: '#555' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.5rem', color: '#aaa', fontSize: '0.75rem' }}>
                                                    {s.bestSolveTime ? `${Math.floor(s.bestSolveTime / 60)}m` : s.avgSolveTime ? `${Math.floor(s.avgSolveTime / 60)}m` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {filteredResults?.pagination && filteredResults.pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                                <button
                                    className="glass"
                                    disabled={advancedFilters.page <= 1}
                                    onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page - 1 })}
                                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', opacity: advancedFilters.page <= 1 ? 0.4 : 1, cursor: advancedFilters.page <= 1 ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}
                                >Previous</button>
                                <span style={{ fontSize: '0.8rem', color: '#888', padding: '6px 0' }}>
                                    Page {filteredResults.pagination.page} of {filteredResults.pagination.totalPages}
                                </span>
                                <button
                                    className="glass"
                                    disabled={advancedFilters.page >= filteredResults.pagination.totalPages}
                                    onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page + 1 })}
                                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', opacity: advancedFilters.page >= filteredResults.pagination.totalPages ? 0.4 : 1, cursor: advancedFilters.page >= filteredResults.pagination.totalPages ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}
                                >Next</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {user.role === 'hod' && activeTab === 'hod' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <AdvancedFilterPanel
                        filters={advancedFilters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        onSearch={handleSearch}
                        totalResults={filteredResults?.pagination?.total}
                    />

                    {/* Overview Cards */}
                    {hodData && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                            <div className="card" style={{ padding: '1.2rem', textAlign: 'center', background: 'rgba(20,20,20,0.72)' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#8254ee' }}>{hodData.totalStudents}</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Total Students</div>
                            </div>
                            <div className="card" style={{ padding: '1.2rem', textAlign: 'center', background: 'rgba(20,20,20,0.72)' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399' }}>{hodData.totalSubmissions}</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Total Submissions</div>
                            </div>
                            <div className="card" style={{ padding: '1.2rem', textAlign: 'center', background: 'rgba(20,20,20,0.72)' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e7c965' }}>{hodData.successRate}%</div>
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Success Rate</div>
                            </div>
                        </div>
                    )}

                    {/* Leaderboards */}
                    {hodData?.topStudents && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            <LeaderboardCard title="Highest Points" color="#e7c965" students={hodData.topStudents.highestPoints} metric="totalPoints" metricLabel="pts" />
                            <LeaderboardCard title="Fastest Solve" color="#34d399" students={hodData.topStudents.fastestSolve} metric="bestSolveTime" metricLabel="min" formatter={(v) => v ? Math.floor(v / 60) + 'm' : '—'} />
                            <LeaderboardCard title="Most Consistent" color="#8254ee" students={hodData.topStudents.mostConsistent} metric="consistencyScore" metricLabel="%" />
                            <LeaderboardCard title="Highest Accuracy" color="#f59e0b" students={hodData.topStudents.highestAccuracy} metric="accuracy" metricLabel="%" />
                        </div>
                    )}

                    {/* Year/Section/Lab Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {hodData?.yearStats?.length > 0 && (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Year-wise Distribution</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {hodData.yearStats.map(ys => (
                                        <div key={ys._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{ys._id || 'N/A'}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '100px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min(100, (ys.count / Math.max(...hodData.yearStats.map(y => y.count))) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #8254ee, #e7c965)', borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ys.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hodData?.sectionStats?.length > 0 && (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Section-wise Distribution</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {hodData.sectionStats.map(ss => (
                                        <div key={ss._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem' }}>Section {ss._id || 'N/A'}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '100px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min(100, (ss.count / Math.max(...hodData.sectionStats.map(s => s.count))) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #34d399, #8254ee)', borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ss.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hodData?.labStats?.length > 0 && (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Lab-wise Performance</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {hodData.labStats.map(ls => (
                                        <div key={ls._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{ls._id || 'N/A'}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#e7c965' }}>{Math.round(ls.avgPoints || 0)} pts</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ls.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hodData?.branchStats?.length > 0 && (
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Branch-wise Distribution</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {hodData.branchStats.map(bs => (
                                        <div key={bs._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{bs._id || 'N/A'}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '100px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min(100, (bs.count / Math.max(...hodData.branchStats.map(b => b.count))) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #e7c965)', borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{bs.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Language Proficiency */}
                    {hodData?.topByLanguage && Object.keys(hodData.topByLanguage).length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Top Students by Language</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {Object.entries(hodData.topByLanguage).map(([lang, students]) => (
                                    <div key={lang} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: '#56b6c2', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{lang}</h4>
                                        {students.slice(0, 3).map((s, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.8rem', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                                <span>{s.name}</span>
                                                <span style={{ color: '#e7c965' }}>{s.solved} solved</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Student Performance Table */}
                    {(filteredResults?.students || hodData?.studentPerformance) && (
                        <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1rem' }}>All Students Performance</h3>
                                {filteredResults?.summary && (
                                    <span style={{ fontSize: '0.75rem', color: '#888' }}><strong style={{ color: '#34d399' }}>{filteredResults.summary.averageAccuracy}%</strong> avg accuracy | <strong style={{ color: '#e7c965' }}>{filteredResults.summary.totalPoints.toLocaleString()}</strong> total pts</span>
                                )}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Name</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Reg No</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Year</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Lab</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Solved/Failed</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Accuracy</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Points</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Language</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Solve Time</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Active Time</th>
                                    <th style={{ padding: '0.6rem 0.3rem' }}>Consistency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(filteredResults?.students || hodData?.studentPerformance || []).length === 0 && (
                                        <tr><td colSpan="11" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No students match your filters</td></tr>
                                    )}
                                    {(filteredResults?.students || hodData?.studentPerformance || []).map(s => (
                                        <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.5rem 0.3rem', fontWeight: 'bold', color: '#fff' }}>{s.name}</td>
                                            <td style={{ padding: '0.5rem 0.3rem', color: '#aaa', fontSize: '0.7rem' }}>{s.regNo}</td>
                                            <td style={{ padding: '0.5rem 0.3rem' }}>{s.year || '—'}</td>
                                            <td style={{ padding: '0.5rem 0.3rem' }}><span style={{ background: 'rgba(130,84,238,0.15)', color: '#8254ee', padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem' }}>{s.assignedLab}</span></td>
                                            <td style={{ padding: '0.5rem 0.3rem' }}>
                                                <span style={{ color: '#34d399' }}>{s.acceptedSubmissions}</span>
                                                {s.failedCount > 0 && <span style={{ color: '#ef4444', marginLeft: '0.2rem' }}>/{s.failedCount}</span>}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.3rem' }}>
                                                <div style={{ width: '50px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', marginRight: '0.3rem' }}>
                                                    <div style={{ width: `${s.accuracy}%`, height: '100%', background: 'linear-gradient(90deg, #8254ee, #34d399)', borderRadius: '2px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: s.accuracy > 70 ? '#34d399' : s.accuracy > 40 ? '#e7c965' : '#ef4444' }}>{s.accuracy}%</span>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.3rem', color: '#e7c965', fontWeight: 'bold' }}>{s.totalPoints}</td>
                                            <td style={{ padding: '0.5rem 0.3rem' }}>
                                                {s.bestLanguage ? <span style={{ background: 'rgba(86,182,194,0.15)', color: '#56b6c2', padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem' }}>{s.bestLanguage}</span> : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.3rem', color: '#aaa', fontSize: '0.65rem' }}>{s.bestSolveTime ? `${Math.floor(s.bestSolveTime / 60)}m ${s.bestSolveTime % 60}s` : '—'}</td>
                                            <td style={{ padding: '0.5rem 0.3rem', color: '#06b6d4', fontSize: '0.65rem' }}>{s.totalActiveSolveTime ? `${Math.floor(s.totalActiveSolveTime / 60)}m` : '—'}</td>
                                            <td style={{ padding: '0.5rem 0.3rem' }}>
                                                <span style={{ color: s.consistencyScore > 70 ? '#34d399' : s.consistencyScore > 40 ? '#e7c965' : '#ef4444', fontSize: '0.7rem' }}>{s.consistencyScore || 0}%</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredResults?.pagination && filteredResults.pagination.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button className="glass" disabled={advancedFilters.page <= 1} onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page - 1 })} style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.75rem', opacity: advancedFilters.page <= 1 ? 0.4 : 1, cursor: advancedFilters.page <= 1 ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}>Previous</button>
                                    <span style={{ fontSize: '0.75rem', color: '#888', padding: '5px 0' }}>Page {filteredResults.pagination.page} of {filteredResults.pagination.totalPages}</span>
                                    <button className="glass" disabled={advancedFilters.page >= filteredResults.pagination.totalPages} onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page + 1 })} style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.75rem', opacity: advancedFilters.page >= filteredResults.pagination.totalPages ? 0.4 : 1, cursor: advancedFilters.page >= filteredResults.pagination.totalPages ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}>Next</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(user.role === 'faculty' || user.role === 'faculty') && activeTab === 'facultyView' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <AdvancedFilterPanel
                        filters={advancedFilters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        onSearch={handleSearch}
                        totalResults={filteredResults?.pagination?.total}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1.2rem', textAlign: 'center', borderLeft: '4px solid #8254ee' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#8254ee' }}>{filteredResults?.summary?.totalStudents || stats?.studentsCount || 0}</div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Students</div>
                        </div>
                        <div className="card" style={{ padding: '1.2rem', textAlign: 'center', borderLeft: '4px solid #34d399' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399' }}>{filteredResults?.summary?.averageAccuracy || 0}%</div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Avg Accuracy</div>
                        </div>
                        <div className="card" style={{ padding: '1.2rem', textAlign: 'center', borderLeft: '4px solid #e7c965' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e7c965' }}>{filteredResults?.summary?.totalPoints?.toLocaleString() || 0}</div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Total Points</div>
                        </div>
                        <div className="card" style={{ padding: '1.2rem', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f59e0b' }}>{filteredResults?.summary?.totalAccepted || 0}</div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Accepted</div>
                        </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <span style={{ color: '#888', fontSize: '0.8rem', alignSelf: 'center' }}>Sort by:</span>
                            <button className="glass" onClick={() => handleFilterChange({ ...advancedFilters, timeSolved: 'fastest', timeSolvedOrder: 'asc' })} style={{ padding: '4px 12px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', borderRadius: '6px' }}>Fastest Solver</button>
                            <button className="glass" onClick={() => handleFilterChange({ ...advancedFilters, pointsFilter: 'highest' })} style={{ padding: '4px 12px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', borderRadius: '6px' }}>Highest Points</button>
                            <button className="glass" onClick={() => handleFilterChange({ ...advancedFilters, accuracyFilter: 'highest' })} style={{ padding: '4px 12px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', borderRadius: '6px' }}>Best Accuracy</button>
                            <button className="glass" onClick={() => handleFilterChange({ ...advancedFilters, consistencyFilter: 'streak' })} style={{ padding: '4px 12px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', borderRadius: '6px' }}>Most Consistent</button>
                            <button className="glass" onClick={() => handleFilterChange({ ...advancedFilters, solvedFilter: 'total', solvedOrder: 'desc' })} style={{ padding: '4px 12px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', borderRadius: '6px' }}>Most Solved</button>
                        </div>
                        <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Students Performance</h2>
                            {filteredResults?.summary && (
                                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                    <strong style={{ color: '#34d399' }}>{filteredResults.summary.averageAccuracy}%</strong> avg accuracy |
                                    <strong style={{ color: '#e7c965' }}> {filteredResults.summary.totalPoints.toLocaleString()}</strong> total pts
                                </span>
                            )}
                        </div>
                        {filterLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                                Loading...
                            </div>
                        ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', color: '#aaa' }}>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Name</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Reg No</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Lab</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Solved</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Failed</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Accuracy</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Points</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Language</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Solve Time</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Active Time</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Consistency</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Streak</th>
                                    <th style={{ padding: '0.8rem 0.5rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filteredResults?.students || []).length === 0 && (
                                    <tr><td colSpan="13" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No students match your filters</td></tr>
                                )}
                                {(filteredResults?.students || []).map(s => (
                                    <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 'bold', color: '#fff' }}>{s.name}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#aaa', fontSize: '0.75rem' }}>{s.regNo}</td>
                                        <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ background: 'rgba(130,84,238,0.15)', color: '#8254ee', padding: '1px 6px', borderRadius: '3px', fontSize: '0.65rem' }}>{s.assignedLab || '—'}</span></td>
                                        <td style={{ padding: '0.6rem 0.5rem' }}>
                                            <span style={{ color: '#34d399', fontWeight: 'bold' }}>{s.acceptedSubmissions}</span>/{s.submissions}
                                        </td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: s.failedCount > 0 ? '#ef4444' : '#666' }}>{s.failedCount || 0}</td>
                                        <td style={{ padding: '0.6rem 0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <div style={{ width: '50px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${s.accuracy}%`, height: '100%', background: 'linear-gradient(90deg, #8254ee, #34d399)', borderRadius: '2px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: s.accuracy > 70 ? '#34d399' : s.accuracy > 40 ? '#e7c965' : '#ef4444' }}>{s.accuracy}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#e7c965', fontWeight: 'bold' }}>{s.totalPoints}</td>
                                        <td style={{ padding: '0.6rem 0.5rem' }}>
                                            {s.bestLanguage ? (
                                                <span style={{ background: 'rgba(86,182,194,0.15)', color: '#56b6c2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>{s.bestLanguage}</span>
                                            ) : <span style={{ color: '#555' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#aaa', fontSize: '0.7rem' }}>{s.bestSolveTime ? `${Math.floor(s.bestSolveTime / 60)}m ${s.bestSolveTime % 60}s` : '—'}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#06b6d4', fontSize: '0.7rem' }}>{s.totalActiveSolveTime ? `${Math.floor(s.totalActiveSolveTime / 60)}m` : '—'}</td>
                                        <td style={{ padding: '0.6rem 0.5rem' }}>
                                            <span style={{ color: s.consistencyScore > 70 ? '#34d399' : s.consistencyScore > 40 ? '#e7c965' : '#ef4444', fontSize: '0.7rem' }}>{s.consistencyScore || 0}%</span>
                                        </td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#f59e0b', fontSize: '0.7rem' }}>{s.consistencyStreak || 0}d</td>
                                        <td style={{ padding: '0.6rem 0.5rem' }}>
                                            {s.isActive ? (
                                                <span style={{ color: '#34d399', fontSize: '0.65rem' }}>Active</span>
                                            ) : (
                                                <span style={{ color: '#666', fontSize: '0.65rem' }}>Inactive</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        )}
                        {filteredResults?.pagination && filteredResults.pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <button className="glass" disabled={advancedFilters.page <= 1} onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page - 1 })} style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.75rem', opacity: advancedFilters.page <= 1 ? 0.4 : 1, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}>Previous</button>
                                <span style={{ fontSize: '0.75rem', color: '#888', padding: '5px 0' }}>Page {filteredResults.pagination.page} of {filteredResults.pagination.totalPages}</span>
                                <button className="glass" disabled={advancedFilters.page >= filteredResults.pagination.totalPages} onClick={() => handleFilterChange({ ...advancedFilters, page: advancedFilters.page + 1 })} style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '0.75rem', opacity: advancedFilters.page >= filteredResults.pagination.totalPages ? 0.4 : 1, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#ccc' }}>Next</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'labs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', color: '#e7c965' }}>Lab & Faculty Scheduling</h2>
                        <p style={{ color: 'gray', marginBottom: '2rem' }}>Configure weekly unlock schedules for each lab. The system will automatically open coding challenges on the selected day and time.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                            {facultyList.filter(f => user.role === 'hod' || f.assignedLab === user.assignedLab).map(f => (
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

            {user.role === 'hod' && activeTab === 'faculty' && (
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

            {user.role === 'hod' && activeTab === 'admins' && (
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

// Leaderboard Card Sub-component
const LeaderboardCard = ({ title, color, students, metric, metricLabel, formatter }) => (
    <div className="card" style={{ padding: '1.5rem', background: 'rgba(20,20,20,0.72)' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(!students || students.length === 0) && <div style={{ color: '#555', fontSize: '0.85rem' }}>No data available</div>}
            {students?.slice(0, 5).map((s, i) => (
                <div key={s._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#555', width: '16px' }}>#{i + 1}</span>
                        <span style={{ fontSize: '0.85rem' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color }}>
                        {formatter ? formatter(s[metric]) : s[metric]}{metricLabel ? ` ${metricLabel}` : ''}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

export default AdminDashboard;


