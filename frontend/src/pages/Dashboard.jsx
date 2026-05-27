import { useCallback, useEffect, useRef, useState } from 'react';
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
    Search,
    Layers,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';

// Standardized lab IDs for normalization
const LABS_STANDARD = ['C', 'DS', 'ADSAA', 'JAVA', 'PYTHON', 'DBMS', 'OS', 'CN', 'AI', 'ML', 'FSAD'];
const LAB_ALIASES = {
  'C': ['c lab', 'c programming', 'c language'],
  'DS': ['data structures', 'data structures lab', 'ds lab', 'datastructures'],
  'ADSAA': ['ada', 'algorithm design', 'algorithms', 'adsaa lab'],
  'JAVA': ['java lab', 'java programming'],
  'PYTHON': ['python lab', 'python programming'],
  'DBMS': ['database', 'database management', 'dbms lab'],
  'OS': ['operating system', 'operating systems', 'os lab'],
  'CN': ['computer networks', 'computer network', 'cn lab', 'networks'],
  'AI': ['artificial intelligence', 'ai lab'],
  'ML': ['machine learning', 'ml lab'],
  'FSAD': ['full stack', 'full stack development', 'fullstack', 'fsad lab', 'web development'],
};
const normalizeLab = (name) => {
  if (!name) return '';
  const t = name.trim();
  const u = t.toUpperCase();
  for (const s of LABS_STANDARD) { if (u === s) return s; }
  const l = t.toLowerCase();
  for (const [s, aliases] of Object.entries(LAB_ALIASES)) {
    if (aliases.some(a => l === a)) return s;
  }
  for (const [s, aliases] of Object.entries(LAB_ALIASES)) {
    if (aliases.some(a => l.includes(a) || a.includes(l))) return s;
  }
  return u;
};

const formatIST = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '-'); // DD-MM-YYYY
    const timePart = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
};
import PremiumHeader from '../components/PremiumHeader';

const socket = io('http://localhost:5000');

const userKey = (u) => (u?._id || u?.id || '').toString();

function pointsFromAccepted(submissions) {
    return (submissions || []).reduce((sum, s) => sum + (s.status === 'Accepted' ? Number(s.earnedPoints || 0) : 0), 0);
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
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [weeklyTasks, setWeeklyTasks] = useState([]);
    const [stats, setStats] = useState({
        solved: 0,
        pending: 0,
        accuracy: 0,
        progressPct: 0,
        points: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        rank: 0,
    });
    const [submissions, setSubmissions] = useState([]);
    const [currentWeekLabel, setCurrentWeekLabel] = useState('—');
    const [notifications, setNotifications] = useState([]);
    const [displayPoints, setDisplayPoints] = useState(0);
    const [pointsPulse, setPointsPulse] = useState(false);
    const [liveReward, setLiveReward] = useState(null);
    const [recentSolvedId, setRecentSolvedId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [submissionFilter, setSubmissionFilter] = useState({ search: '', status: '' });
    const previousPointsRef = useRef(0);

    const pushNotification = useCallback((item) => {
        setNotifications((prev) => {
            const row = { ...item, id: item.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
            const next = [row, ...prev.filter((p) => p.id !== row.id)];
            return next.slice(0, 28);
        });
    }, []);

    const fetchTasks = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const dashboardRes = await axios.get('http://localhost:5000/api/student/dashboard', {
                headers: { 'x-auth-token': token },
            });
            const userData = dashboardRes.data.user;

            const subs = [...(userData.submissions || [])].sort(
                (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
            );
            setSubmissions(subs);

            const accepted = subs.filter((s) => s.status === 'Accepted');
            const solvedIds = buildSolvedQuestionIds(subs);
            const uniqueSolved = solvedIds.size;

            const assignedLab = user?.assignedLab || user?.selectedLab;
            // Use the dedicated student questions endpoint for published+filtered questions
            let questions = [];
            try {
                const studentQRes = await axios.get('http://localhost:5000/api/questions/student', {
                    headers: { 'x-auth-token': token }
                });
                questions = studentQRes.data.questions || [];
            } catch (e) {
                // Fallback to regular endpoint if /student fails
                const labQuery = assignedLab ? `?labName=${encodeURIComponent(normalizeLab(assignedLab))}` : '';
                const fallbackRes = await axios.get(`http://localhost:5000/api/questions${labQuery}`, {
                    headers: { 'x-auth-token': token }
                });
                questions = fallbackRes.data || [];
            }
            const totalQ = questions.length;

            setStats({
                solved: uniqueSolved,
                pending: Math.max(0, totalQ - uniqueSolved),
                accuracy: totalQ > 0 ? Math.round((uniqueSolved / totalQ) * 100) : 0,
                progressPct: totalQ > 0 ? Math.round((uniqueSolved / totalQ) * 100) : 0,
                points: dashboardRes.data.stats.totalPoints || pointsFromAccepted(subs),
                weeklyPoints: (userData.weeklyProgress || []).reduce((sum, row) => sum + Number(row.points || 0), 0),
                monthlyPoints: (userData.monthlyProgress || []).reduce((sum, row) => sum + Number(row.points || 0), 0),
                rank: dashboardRes.data.stats.rank || 0,
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
            console.error("Dashboard Fetch Error:", err);
            if (err.code === 'ERR_NETWORK') {
                setError("Network error: Cannot connect to the server. Please ensure the backend is running on port 5000.");
            } else {
                setError(`Failed to load dashboard data: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setIsLoading(false);
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
            const assignedLab = user?.assignedLab || user?.selectedLab;
            if (n.labName && assignedLab && normalizeLab(n.labName) !== normalizeLab(assignedLab)) return;
            pushNotification({ ...n, fromSocket: true, id: n.id || `sock-${Date.now()}` });
        };

        const onWeekUnlock = (update) => {
            const assignedLab = user?.assignedLab || user?.selectedLab;
            if (update.labName && assignedLab && normalizeLab(update.labName) !== normalizeLab(assignedLab)) return;
            pushNotification({
                text: update.message || `Week ${update.weekNumber} is now available.`,
                type: 'task',
                fromSocket: true,
                id: `week-${update.weekNumber}-${update.labName || 'lab'}`,
            });
            fetchTasks(true);
        };

        const onSubmissionAdded = (populated) => {
            const subUser = populated?.user?._id || populated?.user;
            if (myId && subUser && String(subUser) !== myId) return;
            fetchTasks(true);
        };

        socket.on('submissionAdded', onSubmissionAdded);
        socket.on('progressUpdated', () => fetchTasks(true));
        socket.on('questionAdded', () => fetchTasks(true));
        socket.on('questionUpdated', () => fetchTasks(true));
        socket.on('questionDeleted', () => fetchTasks(true));
        socket.on('questionPublished', (data) => {
            const assignedLab = user?.assignedLab || user?.selectedLab;
            if (data.labName && assignedLab && normalizeLab(data.labName) === normalizeLab(assignedLab)) {
                pushNotification({
                    id: `qp-${data.questionId}-${Date.now()}`,
                    text: `New lab question published: ${data.title} (Week ${data.weekNumber})`,
                    type: 'task',
                    fromSocket: true,
                });
                fetchTasks(true);
            }
        });
        socket.on('weekUnlocked', onWeekUnlock);
        socket.on('notification', onNotif);
        const onPointsAwarded = (payload) => {
            if (payload.userId && myId && String(payload.userId) !== myId) return;
            const earned = Number(payload.earnedPoints || 0);
            if (earned <= 0) return;

            setStats((prev) => ({
                ...prev,
                points: Number(payload.totalUserPoints ?? prev.points + earned),
                weeklyPoints: (payload.weeklyProgress || []).reduce((sum, row) => sum + Number(row.points || 0), 0) || prev.weeklyPoints + earned,
                monthlyPoints: (payload.monthlyProgress || []).reduce((sum, row) => sum + Number(row.points || 0), 0) || prev.monthlyPoints + earned,
                rank: payload.rank || prev.rank,
            }));
            setLeaderboard(payload.leaderboard || []);
            setRecentSolvedId(payload.questionId ? String(payload.questionId) : null);
            setLiveReward(payload);
            setPointsPulse(true);
            pushNotification({
                id: `points-${payload.questionId}-${Date.now()}`,
                text: `+${earned} points: ${payload.questionTitle || 'Accepted solution'}`,
                type: 'success',
                fromSocket: true,
            });
            window.setTimeout(() => setPointsPulse(false), 1800);
            window.setTimeout(() => setRecentSolvedId(null), 2400);
            window.setTimeout(() => setLiveReward(null), 3200);
        };

        socket.on('pointsAwarded', onPointsAwarded);

        return () => {
            socket.off('submissionAdded', onSubmissionAdded);
            socket.off('progressUpdated', fetchTasks);
            socket.off('questionAdded', fetchTasks);
            socket.off('questionUpdated', fetchTasks);
            socket.off('questionDeleted', fetchTasks);
            socket.off('questionPublished');
            socket.off('weekUnlocked', onWeekUnlock);
            socket.off('notification', onNotif);
            socket.off('pointsAwarded', onPointsAwarded);
        };
    }, [fetchTasks, user, pushNotification]);

    useEffect(() => {
        const start = previousPointsRef.current;
        const end = Number(stats.points || 0);
        if (start === end) {
            setDisplayPoints(end);
            return;
        }
        const startedAt = performance.now();
        const duration = 900;
        let frameId;
        const tick = (now) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayPoints(Math.round(start + (end - start) * eased));
            if (progress < 1) {
                frameId = requestAnimationFrame(tick);
            } else {
                previousPointsRef.current = end;
            }
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [stats.points]);

    const solvedIds = buildSolvedQuestionIds(submissions);

    const statusStyle = (status) => {
        if (status === 'Accepted') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
        if (status === 'Wrong Answer') return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
        if (status === 'Runtime Error' || status === 'Time Limit Exceeded') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
        return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
    };

    const handleGeneratePDF = async (mode = 'download') => {
        const loadImage = (url) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg'));
                };
                img.onerror = () => resolve(null);
                img.src = url;
            });
        };

        const rgmLogo = await loadImage('/logos/rgm-logo.jpeg');
        const rippleLogo = await loadImage('/logos/ripple-logo.png');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = margin;
        let pageNum = 1;

        const addWatermark = () => {
            doc.setTextColor(230, 230, 230);
            doc.setFontSize(50);
            doc.setFont('times', 'italic');
            doc.text(user?.regNo || 'RGMCSE', pageWidth / 2, pageHeight / 2, { angle: 45, align: 'center' });
            doc.setTextColor(0, 0, 0);
        };

        const addFooter = () => {
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont('times', 'normal');
            doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text('RGMCSE COMPILER', pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        };

        addWatermark();
        addFooter();

        // Header with logos
        const logoSize = 30;
        if (rgmLogo) {
            doc.addImage(rgmLogo, 'JPEG', margin, margin, logoSize, logoSize);
        }
        if (rippleLogo) {
            doc.addImage(rippleLogo, 'PNG', pageWidth - margin - logoSize, margin, logoSize, logoSize);
        }

        // Title centered between logos
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text('RGMCSE COMPILER', pageWidth / 2, margin + logoSize / 2 + 2, { align: 'center' });

        // Separator line
        yPos = margin + logoSize + 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // Student Details section
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text('Student Details', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        const details = [
            `Student Name: ${user?.name || 'N/A'}`,
            `Registration Number: ${user?.regNo || 'N/A'}`,
            `Year: ${user?.year || user?.classAndYear || 'N/A'}`,
            `Branch: ${user?.branch || 'CSE'}`,
            `Lab Name: ${user?.selectedLab || 'Unknown Lab'}`,
            `Faculty Name: ${user?.facultyName || 'Unknown Faculty'}`
        ];
        details.forEach(d => {
            doc.text(d, margin + 3, yPos);
            yPos += 5;
        });
        yPos += 10;

        // All Weeks Programs (one per page)
        weeklyTasks.forEach(task => {
            if (!task.isUnlocked) return;
            task.questions?.forEach(q => {
                const pLang = q.primaryLanguage || 'C';
                const acceptedSub = submissions.find(s => 
                    ((s.question?._id || s.question) === q._id || (s.question?._id || s.question) === q._id?.toString()) && 
                    s.status === 'Accepted' && 
                    s.language?.toLowerCase() === pLang?.toLowerCase()
                );

                if (!acceptedSub) return;

                if (yPos > pageHeight - 35) {
                    addFooter();
                    doc.addPage();
                    pageNum++;
                    yPos = margin;
                    addWatermark();
                    addFooter();
                }

                doc.setFont('times', 'bold');
                doc.setFontSize(12);
                doc.text(`Question: ${q.title}`, margin, yPos);
                yPos += 8;

                doc.setFontSize(10);

                if (q.sampleTestCases && q.sampleTestCases.length > 0) {
                    doc.setFont('times', 'bold');
                    doc.text('Input:', margin + 2, yPos);
                    yPos += 5;
                    doc.setFont('times', 'normal');
                    const splitInput = doc.splitTextToSize(q.sampleTestCases[0].input || 'None', pageWidth - 40);
                    doc.text(splitInput, margin + 5, yPos);
                    yPos += splitInput.length * 4 + 3;

                    if (yPos > pageHeight - 35) {
                        addFooter();
                        doc.addPage();
                        pageNum++;
                        yPos = margin;
                        addWatermark();
                        addFooter();
                    }

                    doc.setFont('times', 'bold');
                    doc.text('Output:', margin + 2, yPos);
                    yPos += 5;
                    doc.setFont('times', 'normal');
                    const splitOutput = doc.splitTextToSize(q.sampleTestCases[0].output || 'None', pageWidth - 40);
                    doc.text(splitOutput, margin + 5, yPos);
                    yPos += splitOutput.length * 4 + 5;
                }

                if (yPos > pageHeight - 35) {
                    addFooter();
                    doc.addPage();
                    pageNum++;
                    yPos = margin;
                    addWatermark();
                    addFooter();
                }

                doc.setFont('times', 'bold');
                doc.text(`Student Code (${acceptedSub.language}):`, margin, yPos);
                yPos += 6;

                doc.setFont('courier');
                doc.setFontSize(8);
                const codeLines = (acceptedSub.code || '').split('\n');
                codeLines.forEach(line => {
                    if (yPos > pageHeight - 20) {
                        addFooter();
                        doc.addPage();
                        pageNum++;
                        yPos = margin;
                        addWatermark();
                        addFooter();
                    }
                    const splitCode = doc.splitTextToSize(line, pageWidth - 30);
                    doc.text(splitCode, margin + 2, yPos);
                    yPos += splitCode.length * 3.5;
                });
            });
        });

        addFooter();

        if (mode === 'preview') {
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        } else {
            doc.save(`${user?.regNo}_${user?.selectedLab || 'Lab'}_Record.pdf`);
        }
    };

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
                <PremiumHeader />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
                    <h2 style={{ color: 'var(--text)' }}>Loading Dashboard...</h2>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
                <PremiumHeader />
                <div className="card" style={{ display: 'inline-block', padding: '2rem 3rem' }}>
                    <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Failed to Load Dashboard</h2>
                    <p style={{ color: 'gray', marginBottom: '1.5rem' }}>{error}</p>
                    <button onClick={fetchTasks} className="btn btn-primary" style={{ padding: '10px 20px', fontWeight: 'bold' }}>
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

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
                    className={`card ${pointsPulse ? 'points-card-pulse' : ''}`}
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
                        <h3 style={{ fontSize: '1.8rem', margin: 0, color: '#ffffff' }}>{displayPoints}</h3>
                        <p style={{ color: '#d6d6d6', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Points</p>
                        <p style={{ color: 'gray', margin: '4px 0 0', fontSize: '0.75rem' }}>
                            Week {stats.weeklyPoints} · Month {stats.monthlyPoints} · Rank #{stats.rank || '—'}
                        </p>
                        <AnimatePresence>
                            {liveReward && (
                                <motion.p
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    style={{ color: '#e7c965', margin: '6px 0 0', fontSize: '0.82rem', fontWeight: 800 }}
                                >
                                    +{liveReward.earnedPoints} earned now
                                </motion.p>
                            )}
                        </AnimatePresence>
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
                {/* Active Lab Info Card */}
                {user?.selectedLab && (
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="card"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.2rem',
                            background: 'rgba(52, 211, 153, 0.06)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(52, 211, 153, 0.2)',
                            boxShadow: '0 0 20px rgba(52, 211, 153, 0.05)',
                        }}
                    >
                        <div style={{ padding: '15px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.12)', color: '#34d399' }}>
                            <Layers size={28} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.3rem', margin: 0, color: '#34d399' }}>{user.selectedLab}</h3>
                            <p style={{ color: '#d6d6d6', margin: '2px 0 0', fontSize: '0.82rem', fontWeight: 500 }}>
                                {user.facultyName || 'Faculty'} · Active Lab
                            </p>
                            {user.semester && (
                                <p style={{ color: 'gray', margin: '2px 0 0', fontSize: '0.72rem' }}>
                                    Semester {user.semester}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
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
                                <span
                                    className="glass"
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        color: 'var(--text)',
                                        width: '100%',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Assigned Lab: {user?.assignedLab || user?.selectedLab || 'Not assigned'}
                                </span>
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

                    {leaderboard.length > 0 && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trophy size={20} style={{ color: '#e7c965' }} /> Live leaderboard
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {leaderboard.slice(0, 5).map((row, index) => {
                                    const isMe = String(row._id || row.id) === userKey(user);
                                    return (
                                        <motion.div
                                            key={row._id || row.regNo || index}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '32px 1fr auto',
                                                gap: '0.6rem',
                                                alignItems: 'center',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: isMe ? 'rgba(231,201,101,0.13)' : 'rgba(255,255,255,0.04)',
                                                border: isMe ? '1px solid rgba(231,201,101,0.32)' : '1px solid rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            <strong style={{ color: isMe ? '#e7c965' : '#c1cfc1' }}>#{index + 1}</strong>
                                            <span style={{ color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.name || row.regNo || 'Student'}
                                            </span>
                                            <strong style={{ color: '#e7c965' }}>{row.totalPoints || 0}</strong>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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
                            {weeklyTasks.length === 0 && (
                                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <p style={{ color: '#999', fontSize: '1.1rem', fontWeight: 500 }}>
                                        No active questions published for your lab.
                                    </p>
                                    <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                        Published questions will appear here. Contact your faculty if you believe this is an error.
                                    </p>
                                </div>
                            )}
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
                                                className={`card ${recentSolvedId === String(q._id) ? 'accepted-card-pulse' : ''}`}
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
                                                                <span className={recentSolvedId === String(q._id) ? 'accepted-badge-animate' : ''} style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, border: '1px solid #10b981', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> Accepted</span>
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
                                                        No questions published for this week yet.
                                                    </p>
                                                    <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                                        Check back when your faculty publishes new questions.
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
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: '1 1 240px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    value={submissionFilter.search}
                                    onChange={(e) => setSubmissionFilter(prev => ({ ...prev, search: e.target.value }))}
                                    placeholder="Filter by problem name..."
                                    style={{
                                        width: '100%', padding: '8px 10px 8px 30px', borderRadius: '8px', fontSize: '0.8rem',
                                        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                        color: '#e0e0e0', outline: 'none',
                                    }}
                                />
                            </div>
                            <select
                                value={submissionFilter.status}
                                onChange={(e) => setSubmissionFilter(prev => ({ ...prev, status: e.target.value }))}
                                style={{
                                    padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem',
                                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                    color: '#ccc', outline: 'none', cursor: 'pointer',
                                }}
                            >
                                <option value="">All Status</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Wrong Answer">Wrong Answer</option>
                                <option value="Runtime Error">Runtime Error</option>
                                <option value="Compilation Error">Compilation Error</option>
                                <option value="TLE">Time Limit Exceeded</option>
                                <option value="Pending">Pending</option>
                            </select>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                {submissions.filter(s => {
                                    if (submissionFilter.search && !s.question?.title?.toLowerCase().includes(submissionFilter.search.toLowerCase())) return false;
                                    if (submissionFilter.status && s.status !== submissionFilter.status) return false;
                                    return true;
                                }).length} results
                            </span>
                        </div>
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
                                    {submissions.filter(s => {
                                        if (submissionFilter.search && !s.question?.title?.toLowerCase().includes(submissionFilter.search.toLowerCase())) return false;
                                        if (submissionFilter.status && s.status !== submissionFilter.status) return false;
                                        return true;
                                    }).length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '1.5rem', color: 'gray' }}>
                                                No submissions match your filters.
                                            </td>
                                        </tr>
                                    )}
                                    {submissions.filter(s => {
                                        if (submissionFilter.search && !s.question?.title?.toLowerCase().includes(submissionFilter.search.toLowerCase())) return false;
                                        if (submissionFilter.status && s.status !== submissionFilter.status) return false;
                                        return true;
                                    }).map((s) => {
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
