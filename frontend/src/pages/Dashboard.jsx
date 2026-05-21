import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    CheckCircle,
    Clock,
    BookOpen,
    User as UserIcon,
    Layout,
    ChevronRight,
    GraduationCap,
    MapPin,
    Tag,
    Users,
    Activity,
    Target,
    PieChart,
    Monitor,
    Trophy,
    Bell,
    History,
    Info,
    Code2,
    Check,
    Lock,
    Download,
    FileText,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';

const formatIST = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '-'); // DD-MM-YYYY
    const timePart = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
};
import PremiumHeader from '../components/PremiumHeader';

const socket = io('http://localhost:5000');

const DIFFICULTY_POINTS = { Easy: 10, Medium: 20, Hard: 30 };

const userKey = (u) => (u?._id || u?.id || '').toString();

function pointsFromAccepted(submissions) {
    const perQuestion = new Map();
    for (const s of submissions || []) {
        if (s.status !== 'Accepted') continue;
        const q = s.question;
        const qid = q?._id != null ? String(q._id) : s.question != null ? String(s.question) : '';
        if (!qid) continue;
        const diff = q?.difficulty || 'Easy';
        perQuestion.set(qid, DIFFICULTY_POINTS[diff] ?? 10);
    }
    let sum = 0;
    for (const p of perQuestion.values()) sum += p;
    return sum;
}

function buildSolvedQuestionIds(submissions) {
    const ids = new Set();
    for (const s of submissions || []) {
        if (s.status !== 'Accepted') continue;
        const qid = s.question?._id ?? s.question;
        const qLang = s.question?.primaryLanguage;
        
        // Ensure submission language matches primary language, if one is set
        if (qLang && s.language && s.language.toLowerCase() !== qLang.toLowerCase()) continue;
        
        if (qid != null) ids.add(String(qid));
    }
    return ids;
}

const Dashboard = () => {
    const { user, refreshUser } = useAuth();
    const [weeklyTasks, setWeeklyTasks] = useState([]);
    const [stats, setStats] = useState({
        solved: 0,
        pending: 0,
        accuracy: 0,
        progressPct: 0,
        points: 0,
    });
    const [submissions, setSubmissions] = useState([]);
    const [currentWeekLabel, setCurrentWeekLabel] = useState('—');
    const [notifications, setNotifications] = useState([]);

    const pushNotification = useCallback((item) => {
        setNotifications((prev) => {
            const row = { ...item, id: item.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
            const next = [row, ...prev.filter((p) => p.id !== row.id)];
            return next.slice(0, 28);
        });
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const userRes = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { 'x-auth-token': token },
            });

            const subs = [...(userRes.data.submissions || [])].sort(
                (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
            );
            setSubmissions(subs);

            const accepted = subs.filter((s) => s.status === 'Accepted');
            const solvedIds = buildSolvedQuestionIds(subs);
            const uniqueSolved = solvedIds.size;

            const labQuery = user?.selectedLab ? `?labName=${encodeURIComponent(user.selectedLab)}` : '';
            const fallbackRes = await axios.get(`http://localhost:5000/api/questions${labQuery}`);
            const questions = fallbackRes.data || [];
            const totalQ = questions.length;

            setStats({
                solved: uniqueSolved,
                pending: Math.max(0, totalQ - uniqueSolved),
                accuracy: totalQ > 0 ? Math.round((uniqueSolved / totalQ) * 100) : 0,
                progressPct: totalQ > 0 ? Math.round((uniqueSolved / totalQ) * 100) : 0,
                points: pointsFromAccepted(subs),
            });

            const grouped = questions.reduce((acc, q) => {
                if (q.weeklyTask) {
                    const weekId = q.weeklyTask._id;
                    if (!acc[weekId]) acc[weekId] = { ...q.weeklyTask, questions: [] };
                    acc[weekId].questions.push(q);
                }
                return acc;
            }, {});
            const weeks = Object.values(grouped).sort((a, b) => a.weekNumber - b.weekNumber);
            setWeeklyTasks(weeks);

            const unlocked = weeks.filter((w) => w.isUnlocked);
            setCurrentWeekLabel(unlocked.length ? `Week ${Math.max(...unlocked.map((w) => w.weekNumber))}` : '—');

            const fromSubs = subs.slice(0, 6).map((s) => ({
                id: `sub-${s._id}`,
                text:
                    s.status === 'Accepted'
                        ? `Accepted: ${s.question?.title || 'Problem'}`
                        : `${s.question?.title || 'Problem'} — ${s.status}`,
                type: s.status === 'Accepted' ? 'success' : 'task',
                at: s.submittedAt,
            }));
            setNotifications((prev) => {
                const kept = prev.filter((n) => n.fromSocket);
                const seen = new Set(kept.map((k) => k.id));
                const merged = [...kept];
                for (const r of fromSubs) {
                    if (!seen.has(r.id)) {
                        seen.add(r.id);
                        merged.push(r);
                    }
                }
                return merged.slice(0, 24);
            });
        } catch (err) {
            console.error(err);
        }
    }, [user]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void fetchTasks();
        }, 0);
        return () => window.clearTimeout(t);
    }, [fetchTasks]);

    useEffect(() => {
        const myId = userKey(user);

        const onNotif = (n) => {
            if (n.userId && myId && n.userId.toString() !== myId) return;
            if (n.userId && !myId) return;
            if (n.labName && user?.selectedLab && n.labName !== user.selectedLab) return;
            pushNotification({ ...n, fromSocket: true, id: n.id || `sock-${Date.now()}` });
        };

        const onWeekUnlock = (update) => {
            if (update.labName && user?.selectedLab && update.labName !== user.selectedLab) return;
            pushNotification({
                text: update.message || `Week ${update.weekNumber} is now available.`,
                type: 'task',
                fromSocket: true,
                id: `week-${update.weekNumber}-${update.labName || 'lab'}`,
            });
            fetchTasks();
        };

        const onSubmissionAdded = (populated) => {
            const subUser = populated?.user?._id || populated?.user;
            if (myId && subUser && String(subUser) !== myId) return;
            fetchTasks();
        };

        socket.on('submissionAdded', onSubmissionAdded);
        socket.on('progressUpdated', fetchTasks);
        socket.on('questionAdded', fetchTasks);
        socket.on('questionUpdated', fetchTasks);
        socket.on('questionDeleted', fetchTasks);
        socket.on('weekUnlocked', onWeekUnlock);
        socket.on('notification', onNotif);

        return () => {
            socket.off('submissionAdded', onSubmissionAdded);
            socket.off('progressUpdated', fetchTasks);
            socket.off('questionAdded', fetchTasks);
            socket.off('questionUpdated', fetchTasks);
            socket.off('questionDeleted', fetchTasks);
            socket.off('weekUnlocked', onWeekUnlock);
            socket.off('notification', onNotif);
        };
    }, [fetchTasks, user, pushNotification]);

    const solvedIds = buildSolvedQuestionIds(submissions);

    const statusStyle = (status) => {
        if (status === 'Accepted') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
        if (status === 'Wrong Answer') return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
        if (status === 'Runtime Error' || status === 'Time Limit Exceeded') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
        return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
    };

    const handleGeneratePDF = (mode = 'download') => {
        const doc = new jsPDF();
        let yPos = 20;

        const checkPage = (height) => {
            if (yPos + height > 280) {
                doc.addPage();
                yPos = 20;
                addWatermark();
            }
        };

        const addWatermark = () => {
            doc.setTextColor(230, 230, 230);
            doc.setFontSize(50);
            doc.setFont('times', 'italic');
            doc.text(`${user?.regNo}`, 35, 150, { angle: 45 });
            doc.setTextColor(0, 0, 0); // reset
        };

        addWatermark();

        // 1. College Name
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.text(user?.collegeName || 'Rajeev Gandhi Memorial College Of Engineering', 105, yPos, { align: 'center' });
        yPos += 10;

        // 2. Department Name
        doc.setFontSize(14);
        doc.text('Department Of Computer Science and Engineering', 105, yPos, { align: 'center' });
        yPos += 20;

        // 3. Student Details
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.text(`Student Name: ${user?.name}`, 20, yPos);
        yPos += 8;
        doc.text(`Registration Number: ${user?.regNo}`, 20, yPos);
        yPos += 8;
        doc.text(`Branch & Section: ${user?.branch || 'CSE'} - ${user?.section || 'A'}`, 20, yPos);
        yPos += 8;

        // 4. Lab Name
        doc.text(`Subject/Lab Name: ${user?.selectedLab || 'Unknown Lab'}`, 20, yPos);
        yPos += 20;

        // 6. All Weeks Programs
        weeklyTasks.forEach(task => {
            if (!task.isUnlocked) return;
            task.questions?.forEach(q => {
                const pLang = q.primaryLanguage || 'C'; // Fallback to 'C'
                
                // Find ONLY the submission that matches the primary language and is accepted
                const acceptedSub = submissions.find(s => 
                    ((s.question?._id || s.question) === q._id || (s.question?._id || s.question) === q._id?.toString()) && 
                    s.status === 'Accepted' && 
                    s.language?.toLowerCase() === pLang?.toLowerCase()
                );

                if (!acceptedSub) return; // Only include solved questions in primary language

                doc.addPage();
                yPos = 20;
                addWatermark();
                
                doc.setFont('times', 'bold');
                doc.setFontSize(10);
                doc.text(`Week ${task.weekNumber}: ${q.title}`, 20, yPos);
                yPos += 10;

                if (q.description) {
                    checkPage(15);
                    doc.setFont('times', 'bold');
                    doc.text('Problem Statement:', 20, yPos);
                    yPos += 7;
                    doc.setFont('times', 'normal');
                    
                    const splitDesc = doc.splitTextToSize(q.description.replace(/\n/g, ' '), 170);
                    splitDesc.forEach(line => {
                        checkPage(7);
                        doc.text(line, 20, yPos);
                        yPos += 7;
                    });
                    yPos += 5;
                }

                if (q.sampleTestCases && q.sampleTestCases.length > 0) {
                    checkPage(15);
                    doc.setFont('times', 'bold');
                    doc.text('Input:', 20, yPos);
                    yPos += 7;
                    doc.setFont('times', 'normal');
                    const splitInput = doc.splitTextToSize(q.sampleTestCases[0].input || 'None', 170);
                    splitInput.forEach(line => { checkPage(7); doc.text(line, 20, yPos); yPos += 7; });
                    yPos += 5;

                    checkPage(15);
                    doc.setFont('times', 'bold');
                    doc.text('Output:', 20, yPos);
                    yPos += 7;
                    doc.setFont('times', 'normal');
                    const splitOutput = doc.splitTextToSize(q.sampleTestCases[0].output || 'None', 170);
                    splitOutput.forEach(line => { checkPage(7); doc.text(line, 20, yPos); yPos += 7; });
                    yPos += 10;
                }

                checkPage(20);
                doc.setFont('times', 'bold');
                doc.text(`Student Code (${acceptedSub.language}):`, 20, yPos);
                yPos += 7;
                
                doc.setFont('times', 'normal');
                const codeLines = (acceptedSub.code || '').split('\n');
                codeLines.forEach(line => {
                    checkPage(5);
                    const splitCode = doc.splitTextToSize(line, 170);
                    splitCode.forEach(cLine => {
                        checkPage(5);
                        doc.text(cLine, 20, yPos);
                        yPos += 5;
                    });
                });
            });
        });

        // 7. Final Completion Page
        doc.addPage();
        addWatermark();
        yPos = 120;
        doc.setFont('times', 'bold');
        doc.setFontSize(24);
        doc.text('LAB COURSE COMPLETED', 105, yPos, { align: 'center' });
        yPos += 20;
        doc.setFontSize(14);
        doc.setFont('times', 'normal');
        doc.text(`Congratulations ${user?.name},`, 105, yPos, { align: 'center' });
        yPos += 10;
        doc.text(`you have successfully completed all assignments for`, 105, yPos, { align: 'center' });
        yPos += 10;
        doc.setFont('times', 'bold');
        doc.text(`${user?.selectedLab || 'the lab'}.`, 105, yPos, { align: 'center' });

        if (mode === 'preview') {
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        } else {
            doc.save(`${user?.regNo}_${user?.selectedLab || 'Lab'}_Record.pdf`);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <PremiumHeader />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}
            >
                <motion.div
                    whileHover={{ y: -5 }}
                    className="card"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        background: 'rgba(20,20,20,0.72)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)',
                    }}
                >
                    <div
                        style={{
                            padding: '15px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                            color: 'white',
                            boxShadow: '0 4px 14px 0 rgba(234, 179, 8, 0.35)',
                        }}
                    >
                        <Trophy size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.points}</h3>
                        <p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Points</p>
                        <p style={{ color: 'gray', margin: '4px 0 0', fontSize: '0.75rem' }}>Easy 10 · Med 20 · Hard 30</p>
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ y: -5 }}
                    className="card"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        background: 'rgba(20,20,20,0.72)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)',
                    }}
                >
                    <div
                        style={{
                            padding: '15px',
                            borderRadius: '12px',
                            background: 'var(--gradient-primary)',
                            color: 'white',
                            boxShadow: '0 4px 14px 0 rgba(130, 84, 238, 0.4)',
                        }}
                    >
                        <Target size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.progressPct}%</h3>
                        <p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Lab progress</p>
                        <p style={{ color: 'gray', margin: '4px 0 0', fontSize: '0.75rem' }}>
                            {stats.solved} of {stats.solved + stats.pending} challenges in this lab
                        </p>
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ y: -5 }}
                    className="card"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        background: 'rgba(20,20,20,0.72)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)',
                    }}
                >
                    <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <PieChart size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{stats.accuracy}%</h3>
                        <p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Submission accuracy</p>
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ y: -5 }}
                    className="card"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        background: 'var(--glass-gradient)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    }}
                >
                    <div style={{ padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Activity size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{currentWeekLabel}</h3>
                        <p style={{ color: 'gray', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Latest unlocked week</p>
                    </div>
                </motion.div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2rem',
                    alignItems: 'flex-start',
                }}
            >
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '1 1 300px', maxWidth: '440px', width: '100%' }}>
                    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '80px',
                                background: 'var(--gradient-primary)',
                                opacity: 0.8,
                            }}
                        />
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                marginTop: '30px',
                                marginBottom: '1.5rem',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <div
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--surface)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)',
                                    border: '4px solid var(--surface)',
                                    boxShadow: 'var(--shadow)',
                                }}
                            >
                                <UserIcon size={40} />
                            </div>
                            <h3 style={{ marginTop: '10px', fontSize: '1.2rem' }}>{user?.name}</h3>
                            <p
                                style={{
                                    fontSize: '0.9rem',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    marginTop: '5px',
                                    color: 'var(--primary)',
                                }}
                            >
                                {user?.regNo}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '5px' }}>{user?.email}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}>
                                <MapPin size={18} style={{ color: 'gray' }} />{' '}
                                <span>{user?.collegeName || 'Rajeev Gandhi Memorial College Of Engineering'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}>
                                <GraduationCap size={18} style={{ color: 'gray' }} />{' '}
                                <span>
                                    {user?.branch || 'CSE'} - {user?.section || 'A'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}>
                                <Tag size={18} style={{ color: 'gray' }} /> <span>{user?.classAndYear || '3rd Year'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}>
                                <BookOpen size={18} style={{ color: 'gray' }} /> <span>{user?.subjectName || 'Data Structures'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)' }}>
                                <Users size={18} style={{ color: 'gray' }} /> <span>Prof. {user?.facultyName || 'Smith'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', color: 'var(--text)', marginTop: '0.5rem' }}>
                                <Monitor size={18} style={{ color: 'var(--primary)' }} />
                                <select
                                    className="glass"
                                    value={user?.selectedLab || ''}
                                    onChange={async (e) => {
                                        try {
                                            const token = localStorage.getItem('token');
                                            const newLab = e.target.value;
                                            await axios.put(
                                                'http://localhost:5000/api/auth/update-lab',
                                                { lab: newLab },
                                                { headers: { 'x-auth-token': token } }
                                            );
                                            await refreshUser();
                                            void fetchTasks();
                                        } catch (err) {
                                            console.error('Error updating lab', err);
                                        }
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        color: 'var(--text)',
                                        outline: 'none',
                                        width: '100%',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    <option value="" disabled>
                                        Select Lab
                                    </option>
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
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={20} className="text-primary" /> Weekly progress
                        </h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'gray' }}>Solved problems per unlocked week in this lab</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {weeklyTasks.length === 0 && (
                                <p style={{ color: 'gray', fontSize: '0.9rem' }}>Select a lab to see weekly progress.</p>
                            )}
                            {weeklyTasks.map((task) => {
                                const total = task.questions?.length || 0;
                                const solved =
                                    task.questions?.filter((q) => solvedIds.has(String(q._id))).length || 0;
                                const pct = total ? Math.round((solved / total) * 100) : 0;
                                return (
                                    <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ width: '72px', fontSize: '0.85rem', fontWeight: 600 }}>
                                            Week {task.weekNumber}
                                            {!task.isUnlocked && (
                                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#e7c965', fontWeight: 500 }}>
                                                    Locked
                                                </span>
                                            )}
                                        </span>
                                        <div
                                            style={{
                                                flex: 1,
                                                height: '8px',
                                                backgroundColor: 'var(--border)',
                                                borderRadius: '4px',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${task.isUnlocked ? pct : 0}%`,
                                                    background: 'var(--gradient-primary)',
                                                    borderRadius: '4px',
                                                    transition: 'width 0.6s ease-out',
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'gray', width: '36px', textAlign: 'right' }}>
                                            {task.isUnlocked ? `${pct}%` : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bell size={20} style={{ color: 'var(--primary)' }} /> Notifications
                        </h3>
                        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {notifications.length === 0 && (
                                <p style={{ color: 'gray', fontSize: '0.9rem', margin: 0 }}>No notifications yet.</p>
                            )}
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    style={{
                                        padding: '12px 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    {n.type === 'task' ? (
                                        <Code2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                                    ) : n.type === 'admin' ? (
                                        <Info size={16} color="#e7c965" style={{ marginTop: '2px', flexShrink: 0 }} />
                                    ) : (
                                        <Check size={16} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                                    )}
                                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#e4e4e7', lineHeight: 1.45 }}>{n.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '3 1 400px', minWidth: 0, width: '100%' }}>
                    <div className="card" style={{ minHeight: '120px' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem',
                                paddingBottom: '1rem',
                                borderBottom: '1px solid var(--border)',
                            }}
                        >
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.5rem', margin: 0 }}>
                                <Layout size={28} style={{ color: 'var(--primary)' }} />
                                Weekly tasks
                            </h2>
                            {(() => {
                                const hasFinalWeek = weeklyTasks.some(t => t.isFinalWeek);
                                const isCompleted = stats.solved > 0 && stats.pending === 0;
                                
                                if (!hasFinalWeek) return null;
                                
                                return (
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {isCompleted ? (
                                            <>
                                                <button 
                                                    className="btn glass" 
                                                    onClick={() => handleGeneratePDF('preview')}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                                                >
                                                    <FileText size={18} /> Preview Record
                                                </button>
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={() => handleGeneratePDF('download')}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white' }}
                                                >
                                                    <Download size={18} /> Generate Final PDF
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                className="btn btn-primary" 
                                                disabled
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'gray', color: 'white', cursor: 'not-allowed' }}
                                            >
                                                <Download size={18} /> Complete all programs to unlock PDF generation
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                            {weeklyTasks.map((task) => (
                                <div key={task._id}>
                                    <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <span
                                            style={{
                                                background: task.isUnlocked ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                                                color: task.isUnlocked ? 'white' : 'gray',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            Week {task.weekNumber}
                                        </span>
                                        {!task.isUnlocked && (
                                            <span
                                                style={{
                                                    fontSize: '0.85rem',
                                                    color: '#e7c965',
                                                    fontWeight: 'normal',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <Clock size={14} />{' '}
                                                {task.unlockDateTime
                                                    ? `Unlocks at ${formatIST(task.unlockDateTime)}`
                                                    : 'Scheduled by Lab Admin'}
                                            </span>
                                        )}
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {task.questions?.map((q) => (
                                            <motion.div
                                                whileHover={task.isUnlocked ? { scale: 1.01 } : {}}
                                                key={q._id}
                                                className="card"
                                                style={{
                                                    padding: '1.2rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    opacity: task.isUnlocked ? 1 : 0.6,
                                                    cursor: task.isUnlocked ? 'pointer' : 'default',
                                                    background: solvedIds.has(String(q._id)) ? 'rgba(16, 185, 129, 0.05)' : 'rgba(20,20,20,0.6)',
                                                    backdropFilter: 'blur(16px)',
                                                    border: solvedIds.has(String(q._id)) ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                                                    boxShadow: solvedIds.has(String(q._id)) ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: 0 }}>
                                                    {task.isUnlocked ? (
                                                        solvedIds.has(String(q._id)) ? (
                                                            <div
                                                                style={{
                                                                    color: '#10b981',
                                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                                    padding: '10px',
                                                                    borderRadius: '50%',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <CheckCircle size={24} />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    color: '#f59e0b',
                                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                                    padding: '10px',
                                                                    borderRadius: '50%',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <Clock size={24} />
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div
                                                            style={{
                                                                color: 'gray',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                padding: '10px',
                                                                borderRadius: '50%',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <Lock size={24} />
                                                        </div>
                                                    )}
                                                    <div style={{ minWidth: 0 }}>
                                                        <h4 style={{ marginBottom: '0.4rem', fontSize: '1.1rem', color: '#ffffff' }}>{q.title}</h4>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <span
                                                                style={{
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '600',
                                                                    color:
                                                                        q.difficulty === 'Easy'
                                                                            ? '#10b981'
                                                                            : q.difficulty === 'Medium'
                                                                              ? '#f59e0b'
                                                                              : '#ef4444',
                                                                    background:
                                                                        q.difficulty === 'Easy'
                                                                            ? 'rgba(16, 185, 129, 0.1)'
                                                                            : q.difficulty === 'Medium'
                                                                              ? 'rgba(245, 158, 11, 0.1)'
                                                                              : 'rgba(239, 68, 68, 0.1)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                }}
                                                            >
                                                                {q.difficulty}
                                                            </span>
                                                            <span style={{ fontSize: '0.8rem', color: 'gray' }}>
                                                                Tags: {q.tags?.join(', ') || 'None'}
                                                            </span>
                                                            {solvedIds.has(String(q._id)) && (
                                                                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)' }}>Accepted</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {task.isUnlocked ? (
                                                    <Link
                                                        to={`/problem/${q._id}`}
                                                        className="btn btn-primary"
                                                        style={{ fontSize: '0.95rem', padding: '10px 20px', borderRadius: '8px', flexShrink: 0 }}
                                                    >
                                                        Solve <ChevronRight size={18} />
                                                    </Link>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: 'gray',
                                                            fontStyle: 'italic',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            padding: '6px 12px',
                                                            borderRadius: '20px',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        Locked
                                                    </span>
                                                )}
                                            </motion.div>
                                        ))}
                                        {(!task.questions || task.questions.length === 0) && (
                                            <div
                                                style={{
                                                    padding: '2rem',
                                                    textAlign: 'center',
                                                    background: 'var(--surface)',
                                                    border: '1px dashed var(--border)',
                                                    borderRadius: '1rem',
                                                }}
                                            >
                                                <p style={{ color: 'gray', fontStyle: 'italic', fontSize: '0.95rem' }}>
                                                    No challenges assigned to this week yet.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.25rem', margin: '0 0 1rem' }}>
                            <History size={22} style={{ color: 'var(--primary)' }} />
                            Submission history
                        </h2>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'gray' }}>Your recent runs in this course (newest first)</p>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '10px 8px', color: 'gray', fontWeight: 600 }}>Problem</th>
                                        <th style={{ padding: '10px 8px', color: 'gray', fontWeight: 600 }}>Status</th>
                                        <th style={{ padding: '10px 8px', color: 'gray', fontWeight: 600 }}>Tests</th>
                                        <th style={{ padding: '10px 8px', color: 'gray', fontWeight: 600 }}>When</th>
                                        <th style={{ padding: '10px 8px', color: 'gray', fontWeight: 600 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '1.5rem', color: 'gray' }}>
                                                No submissions yet. Open a weekly task and submit your first solution.
                                            </td>
                                        </tr>
                                    )}
                                    {submissions.map((s) => {
                                        const st = statusStyle(s.status);
                                        const qid = s.question?._id || s.question;
                                        return (
                                            <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '12px 8px', color: '#f4f4f5' }}>{s.question?.title || '—'}</td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <span
                                                        style={{
                                                            color: st.color,
                                                            background: st.bg,
                                                            padding: '4px 10px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 8px', color: 'gray' }}>
                                                    {s.testCasesPassed ?? 0}/{s.totalTestCases ?? '—'}
                                                </td>
                                                <td style={{ padding: '12px 8px', color: 'gray', whiteSpace: 'nowrap' }}>
                                                    {s.submittedAt ? formatIST(s.submittedAt) : '—'}
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    {qid ? (
                                                        <Link to={`/problem/${qid}`} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                                            View
                                                        </Link>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
