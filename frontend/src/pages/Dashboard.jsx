import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Clock, BookOpen, User as UserIcon, Layout, ChevronRight, GraduationCap, MapPin, Tag, Users, Activity, Target, PieChart, Code, Monitor } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import PremiumHeader from '../components/PremiumHeader';

const socket = io('http://localhost:5000');

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [weeklyTasks, setWeeklyTasks] = useState([]);
    const [stats, setStats] = useState({ solved: 0, pending: 0, accuracy: 0 });
    const navigate = useNavigate();

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Fetch User Details to calculate stats if submissions are populated
            const userRes = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { 'x-auth-token': token }
            });
            
            const submissions = userRes.data.submissions || [];
            const accepted = submissions.filter(s => s.status === 'Accepted');
            const uniqueSolved = new Set(accepted.map(s => s.question?._id || s.question));
            
            const labQuery = user?.selectedLab ? `?labName=${encodeURIComponent(user.selectedLab)}` : '';
            const fallbackRes = await axios.get(`http://localhost:5000/api/questions${labQuery}`);
            const totalQ = fallbackRes.data.length;
            
            setStats({
                solved: uniqueSolved.size,
                pending: totalQ - uniqueSolved.size,
                accuracy: submissions.length > 0 ? Math.round((accepted.length / submissions.length) * 100) : 0
            });

            const grouped = fallbackRes.data.reduce((acc, q) => {
                if (q.weeklyTask) {
                    const weekId = q.weeklyTask._id;
                    if (!acc[weekId]) {
                        acc[weekId] = { ...q.weeklyTask, questions: [] };
                    }
                    acc[weekId].questions.push(q);
                }
                return acc;
            }, {});
            setWeeklyTasks(Object.values(grouped).sort((a,b) => a.weekNumber - b.weekNumber));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchTasks();

        // Socket listeners for real-time updates
        socket.on('submissionAdded', fetchTasks);
        socket.on('progressUpdated', fetchTasks);
        socket.on('questionAdded', fetchTasks);
        socket.on('questionUpdated', fetchTasks);
        socket.on('questionDeleted', fetchTasks);
        socket.on('weekUnlocked', fetchTasks);

        return () => {
            socket.off('submissionAdded', fetchTasks);
            socket.off('progressUpdated', fetchTasks);
            socket.off('questionAdded', fetchTasks);
            socket.off('questionUpdated', fetchTasks);
            socket.off('questionDeleted', fetchTasks);
            socket.off('weekUnlocked', fetchTasks);
        };
    }, []);

    const isReleased = (unlockDate) => {
        return new Date() >= new Date(unlockDate);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <PremiumHeader />

            {/* Premium Stat Flash Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)' }}>
                    <div style={{ padding: '15px', borderRadius: '12px', background: 'var(--gradient-primary)', color: 'white', boxShadow: '0 4px 14px 0 rgba(130, 84, 238, 0.4)' }}><CheckCircle size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.solved}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Solved Problems</p></div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)' }}>
                    <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Activity size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.pending}</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Pending Problems</p></div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'rgba(20,20,20,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)' }}>
                    <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Target size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.accuracy}%</h3><p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Accuracy</p></div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'var(--glass-gradient)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
                    <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><PieChart size={28} /></div>
                    <div><h3 style={{ fontSize: '1.8rem', margin: 0 }}>Week 2</h3><p style={{ color: 'gray', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Current Active Week</p></div>
                </motion.div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
                {/* Left Sidebar - Profile & Stats */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', background: 'var(--gradient-primary)', opacity: 0.8 }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30px', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '4px solid var(--surface)', boxShadow: 'var(--shadow)' }}>
                                <UserIcon size={40} />
                            </div>
                            <h3 style={{ marginTop: '10px', fontSize: '1.2rem' }}>{user?.name}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'gray', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '20px', marginTop: '5px', color: 'var(--primary)' }}>{user?.regNo}</p>
                            <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '5px' }}>{user?.email}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}><MapPin size={18} style={{ color: 'gray' }}/> <span>{user?.collegeName || 'Rajeev Gandhi Memorial College Of Engineering'}</span></div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}><GraduationCap size={18} style={{ color: 'gray' }}/> <span>{user?.branch || 'CSE'} - {user?.section || 'A'}</span></div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}><Tag size={18} style={{ color: 'gray' }}/> <span>{user?.classAndYear || '3rd Year'}</span></div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}><BookOpen size={18} style={{ color: 'gray' }}/> <span>{user?.subjectName || 'Data Structures'}</span></div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}><Users size={18} style={{ color: 'gray' }}/> <span>Prof. {user?.facultyName || 'Smith'}</span></div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)', marginTop: '0.5rem' }}>
                                <Monitor size={18} style={{ color: 'var(--primary)' }}/> 
                                <select 
                                    className="glass"
                                    value={user?.selectedLab || ''} 
                                    onChange={async (e) => {
                                        try {
                                            const token = localStorage.getItem('token');
                                            const newLab = e.target.value;
                                            await axios.put('http://localhost:5000/api/auth/update-lab', { lab: newLab }, {
                                                headers: { 'x-auth-token': token }
                                            });
                                            if (user) user.selectedLab = newLab;
                                            fetchTasks(); // Fetch dynamically without refresh
                                        } catch(err) {
                                            console.error("Error updating lab", err);
                                        }
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    <option value="" disabled>Select Lab</option>
                                    <option value="C">C</option>
                                    <option value="DS">DS</option>
                                    <option value="ADSAA">ADSAA</option>
                                    <option value="OS">OS</option>
                                    <option value="CN">CN</option>
                                    <option value="OOPS through Java">OOPS through Java</option>
                                    <option value="Python">Python</option>
                                    <option value="DBMS">DBMS</option>
                                    <option value="ML">ML</option>
                                    <option value="CNS">CNS</option>
                                    <option value="FSAD">FSAD</option>
                                    <option value="AI">AI</option>
                                    <option value="Thinkering Lab">Thinkering Lab</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={20} className="text-primary"/> Monthly Progress</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ width: '60px', fontSize: '0.85rem', fontWeight: '500' }}>{week}</span>
                                    <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: idx < 2 ? '100%' : '0%', background: 'var(--gradient-primary)', borderRadius: '4px', transition: 'width 1s ease-in-out' }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'gray', width: '30px', textAlign: 'right' }}>{idx < 2 ? '100%' : '0%'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Right Main - Weekly Tasks */}
                <main>
                    <div className="card" style={{ minHeight: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.5rem' }}>
                                <Layout size={28} style={{ color: 'var(--primary)' }} />
                                Weekly Challenges
                            </h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {weeklyTasks.map((task) => (
                                <div key={task._id}>
                                    <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ background: task.isUnlocked ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)', color: task.isUnlocked ? 'white' : 'gray', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>Week {task.weekNumber}</span>
                                        {!task.isUnlocked && (
                                            <span style={{ fontSize: '0.85rem', color: '#e7c965', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={14}/> {task.unlockDateTime ? `Unlocks at ${new Date(task.unlockDateTime).toLocaleString()}` : "Scheduled by Lab Admin"}
                                            </span>
                                        )}
                                    </h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {task.questions?.map(q => (
                                            <motion.div whileHover={task.isUnlocked ? { scale: 1.02 } : {}} key={q._id} className="card" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: task.isUnlocked ? 1 : 0.6, cursor: task.isUnlocked ? 'pointer' : 'default', background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                    {task.isUnlocked ? (
                                                        <div style={{ color: 'var(--accent)', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '50%' }}><CheckCircle size={24} /></div>
                                                    ) : (
                                                        <div style={{ color: 'gray', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '50%' }}><Clock size={24} /></div>
                                                    )}
                                                    <div>
                                                        <h4 style={{ marginBottom: '0.4rem', fontSize: '1.1rem', color: '#ffffff' }}>{q.title}</h4>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: q.difficulty === 'Easy' ? '#10b981' : q.difficulty === 'Medium' ? '#f59e0b' : '#ef4444', background: q.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.1)' : q.difficulty === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{q.difficulty}</span>
                                                            <span style={{ fontSize: '0.8rem', color: 'gray' }}>Tags: {q.tags?.join(', ') || 'None'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {task.isUnlocked ? (
                                                    <Link to={`/problem/${q._id}`} className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '10px 20px', borderRadius: '8px' }}>
                                                        Solve Challenge <ChevronRight size={18} />
                                                    </Link>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: 'gray', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>Locked</span>
                                                )}
                                            </motion.div>
                                        ))}
                                        {(!task.questions || task.questions.length === 0) && (
                                            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '1rem' }}>
                                                <p style={{ color: 'gray', fontStyle: 'italic', fontSize: '0.95rem' }}>No challenges assigned to this week yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
