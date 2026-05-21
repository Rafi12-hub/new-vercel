import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Target, CheckCircle, Clock, Activity } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const MyProgress = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ solved: 0, pending: 0, accuracy: 0, submissionsData: [] });

    const fetchProgress = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'x-auth-token': token }
                });
                
                const submissions = res.data.submissions || [];
                const accepted = submissions.filter(s => s.status === 'Accepted');
                const uniqueSolved = new Set(accepted.map(s => s.question?._id || s.question)).size;
                const totalAttempted = new Set(submissions.map(s => s.question?._id || s.question)).size;
                const pending = totalAttempted > uniqueSolved ? totalAttempted - uniqueSolved : 0;
                const accuracy = submissions.length > 0 ? Math.round((accepted.length / submissions.length) * 100) : 0;

                
                const labQuery = res.data?.selectedLab ? `?labName=${encodeURIComponent(res.data.selectedLab)}` : '';
                const questionsRes = await axios.get(`http://localhost:5000/api/questions${labQuery}`);
                const questions = questionsRes.data || [];

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

                const submissionsData = unlockedWeeks.map(w => {
                    const solved = w.questions.filter(q => {
                        const qIdStr = String(q._id);
                        return accepted.some(s => {
                            const subQId = s.question?._id || s.question;
                            return String(subQId) === qIdStr;
                        });
                    }).length;
                    return { name: `Week ${w.weekNumber}`, solved };
                });

                setStats({ solved: uniqueSolved, pending, accuracy, submissionsData });
            } catch (err) {
                console.error(err);
            }
        };

    useEffect(() => {
        const t = window.setTimeout(() => fetchProgress(), 0);

        const onSubmissionAdded = (populated) => {
            const subUser = populated?.user?._id || populated?.user;
            if (user && subUser && String(subUser) !== String(user._id)) return;
            fetchProgress();
        };

        socket.on('submissionAdded', onSubmissionAdded);
        socket.on('progressUpdated', fetchProgress);
        socket.on('questionAdded', fetchProgress);
        socket.on('weekUnlocked', fetchProgress);

        return () => {
            window.clearTimeout(t);
            socket.off('submissionAdded', onSubmissionAdded);
            socket.off('progressUpdated', fetchProgress);
            socket.off('questionAdded', fetchProgress);
            socket.off('weekUnlocked', fetchProgress);
        };
    }, [user]);

    const pieData = [
        { name: 'Solved', value: stats.solved || 1 },
        { name: 'Pending', value: stats.pending || 0 }
    ];
    const COLORS = ['#10b981', '#ef4444'];

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <PremiumHeader />
            
            <h1 style={{ marginBottom: '2rem' }}>My Progress Analytics</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><CheckCircle size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0 }}>{stats.solved}</h3><p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Questions Solved</p></div>
                </motion.div>
                
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Clock size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0 }}>{stats.pending}</h3><p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Pending Questions</p></div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ padding: '15px', borderRadius: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Target size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0 }}>{stats.accuracy}%</h3><p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted-dark)' }}>Overall Accuracy</p></div>
                </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '2rem' }}>Weekly Completion Trend</h2>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.submissionsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted-dark)" />
                                <YAxis stroke="var(--text-muted-dark)" />
                                <RechartsTooltip contentStyle={{ background: 'var(--surface-dark)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                <Bar dataKey="solved" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>Success Rate</h2>
                    <div style={{ height: '250px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ background: 'var(--surface-dark)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Solved</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                            <span style={{ fontSize: '0.9rem' }}>Pending</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProgress;
