const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const Admin = require('../models/Admin');
const ViolationReport = require('../models/ViolationReport');
const jwt = require('jsonwebtoken');

const authUser = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.user?.id;
        req.adminId = decoded.admin?.id;
        req.role = decoded.admin?.role;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

router.get('/student/stats', authUser, async (req, res) => {
    try {
        const user = await User.findById(req.userId).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        const submissions = await Submission.countDocuments({ user: req.userId });
        const accepted = await Submission.countDocuments({ user: req.userId, status: 'Accepted' });

        res.json({
            totalPoints: user.totalPoints || 0,
            rank: user.rank || 0,
            submissions,
            acceptedSubmissions: accepted,
            successRate: user.successRate || 0,
            violations: user.violationCount || 0,
            isCompilerLocked: user.isCompilerLocked || false
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

router.get('/student/submissions', authUser, async (req, res) => {
    try {
        const submissions = await Submission.find({ user: req.userId })
            .populate('question', 'title labName difficulty')
            .sort({ createdAt: -1 })
            .lean();

        res.json(submissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching submissions' });
    }
});

router.get('/student/progress', authUser, async (req, res) => {
    try {
        const user = await User.findById(req.userId).lean();
        res.json({
            weeklyProgress: user.weeklyProgress || [],
            monthlyProgress: user.monthlyProgress || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching progress' });
    }
});

router.get('/lab/students', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'faculty', 'hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.adminId).lean();
        const lab = admin.assignedLab;

        const students = await User.find({ $or: [{ assignedLab: lab }, { selectedLab: lab }] }).lean();

        const studentStats = await Promise.all(students.map(async (student) => {
            const submissions = await Submission.countDocuments({ user: student._id });
            const accepted = await Submission.countDocuments({ user: student._id, status: 'Accepted' });

            const langAgg = await Submission.aggregate([
                { $match: { user: student._id, status: 'Accepted' } },
                { $group: { _id: '$language', count: { $sum: 1 }, totalPoints: { $sum: '$earnedPoints' }, avgSolveTime: { $avg: '$solveTime' } } },
                { $sort: { count: -1 } }
            ]);

            const bestLanguage = langAgg.length > 0 ? langAgg[0]._id : null;
            const languageProficiency = langAgg.map(l => ({ language: l._id, solved: l.count, points: l.totalPoints, avgSolveTime: Math.round(l.avgSolveTime || 0) }));

            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            const recentSubmissions = await Submission.find({ user: student._id, createdAt: { $gte: last30Days } }).sort({ createdAt: 1 }).lean();

            const dailyActivity = {};
            recentSubmissions.forEach(s => {
                const day = s.createdAt.toISOString().split('T')[0];
                dailyActivity[day] = (dailyActivity[day] || 0) + 1;
            });
            const activeDays = Object.keys(dailyActivity).length;
            const consistencyScore = Math.min(100, Math.round((activeDays / 30) * 100));

            const solveTimeAgg = await Submission.aggregate([
                { $match: { user: student._id, status: 'Accepted' } },
                { $group: { _id: null, totalSolveTime: { $sum: '$solveTime' } } }
            ]);
            const totalSolveTime = solveTimeAgg.length > 0 ? solveTimeAgg[0].totalSolveTime : 0;

            const totalSubmissions = submissions;
            const acceptedSubmissions = accepted;
            const accuracy = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

            return {
                _id: student._id,
                name: student.name,
                regNo: student.regNo,
                email: student.email,
                year: student.year,
                section: student.section || '',
                branch: student.branch || student.collegeName || '',
                assignedLab: student.assignedLab || lab,
                totalPoints: student.totalPoints || 0,
                submissions: totalSubmissions,
                acceptedSubmissions,
                successRate: student.successRate || 0,
                accuracy,
                totalSolveTime,
                bestLanguage,
                languageProficiency,
                consistencyScore,
                dailyActivity,
                violations: student.violationCount || 0
            };
        }));

        res.json(studentStats.sort((a, b) => b.totalPoints - a.totalPoints));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching lab analytics' });
    }
});

router.get('/lab/questions', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'faculty', 'hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.adminId).lean();
        const lab = admin.assignedLab;

        const questions = await Question.find({ labName: lab }).lean();

        const questionStats = await Promise.all(questions.map(async (q) => {
            const attempts = await Submission.countDocuments({ question: q._id });
            const accepted = await Submission.countDocuments({ question: q._id, status: 'Accepted' });

            return {
                _id: q._id,
                title: q.title,
                difficulty: q.difficulty,
                weekNumber: q.weekNumber,
                isFinalWeek: q.isFinalWeek,
                basePoints: q.basePoints || 100,
                totalAttempts: attempts,
                successfulAttempts: accepted,
                successRate: attempts > 0 ? Math.round((accepted / attempts) * 100) : 0
            };
        }));

        res.json(questionStats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching questions analytics' });
    }
});

router.get('/hod/dashboard', authUser, async (req, res) => {
    try {
        if (!['hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { year, section, lab, language, branch } = req.query;

        const matchFilter = {};
        if (year) matchFilter.year = year;
        if (section) matchFilter.section = section;
        if (branch) matchFilter.branch = branch;
        if (lab) matchFilter.assignedLab = lab;

        const totalStudents = await User.countDocuments(matchFilter);

        const allUserIds = await User.find(matchFilter).select('_id').lean();
        const userIds = allUserIds.map(u => u._id);
        const userIdsStr = userIds.map(id => id.toString());

        const totalSubmissions = await Submission.countDocuments({ user: { $in: userIds } });
        const totalAccepted = await Submission.countDocuments({ user: { $in: userIds }, status: 'Accepted' });

        // Total questions across all labs
        const allQuestions = await Question.find({}).select('_id labName').lean();
        const totalQuestions = allQuestions.length;

        // ========== YEAR-WISE ANALYTICS ==========
        const yearAgg = await User.aggregate([
            { $match: { ...matchFilter, year: { $ne: '', $exists: true } } },
            { $group: { _id: '$year', count: { $sum: 1 }, avgPoints: { $avg: '$totalPoints' } } },
            { $sort: { _id: 1 } }
        ]);

        const yearStats = [];
        for (const y of yearAgg) {
            const yearUsers = await User.find({ year: y._id }).select('_id').lean();
            const yearUserIds = yearUsers.map(u => u._id);
            const acceptedSubs = await Submission.countDocuments({ user: { $in: yearUserIds }, status: 'Accepted' });
            const totalYearSubs = await Submission.countDocuments({ user: { $in: yearUserIds } });
            const avgAccuracy = totalYearSubs > 0 ? Math.round((acceptedSubs / totalYearSubs) * 100) : 0;

            const solvedQ = await Submission.distinct('question', { user: { $in: yearUserIds }, status: 'Accepted' });
            const completedLabs = await User.distinct('assignedLab', { year: y._id, totalPoints: { $gt: 0 } });
            const allLabsForYear = await User.distinct('assignedLab', { year: y._id });
            const pendingLabs = allLabsForYear.filter(l => !completedLabs.includes(l));

            yearStats.push({
                _id: y._id,
                count: y.count,
                totalStudents: y.count,
                totalSolved: solvedQ.length,
                avgAccuracy,
                avgPoints: Math.round(y.avgPoints || 0),
                completedLabs: completedLabs.length,
                pendingLabs: pendingLabs.length
            });
        }

        // ========== SECTION-WISE ANALYTICS ==========
        const validSections = ['A', 'B', 'C'];
        const sectionFilter = { ...matchFilter, section: { $in: validSections } };
        const sectionAgg = await User.aggregate([
            { $match: sectionFilter },
            { $group: { _id: '$section', count: { $sum: 1 }, avgPoints: { $avg: '$totalPoints' } } },
            { $sort: { _id: 1 } }
        ]);

        const sectionStats = [];
        for (const s of sectionAgg) {
            const secUsers = await User.find({ section: s._id }).select('_id').lean();
            const secUserIds = secUsers.map(u => u._id);
            const acceptedSubs = await Submission.countDocuments({ user: { $in: secUserIds }, status: 'Accepted' });
            const totalSecSubs = await Submission.countDocuments({ user: { $in: secUserIds } });
            const avgAccuracy = totalSecSubs > 0 ? Math.round((acceptedSubs / totalSecSubs) * 100) : 0;

            const solvedQ = await Submission.distinct('question', { user: { $in: secUserIds }, status: 'Accepted' });

            const last30 = new Date();
            last30.setDate(last30.getDate() - 30);
            const activeUsers = await Submission.distinct('user', { user: { $in: secUserIds }, createdAt: { $gte: last30 } });

            sectionStats.push({
                _id: s._id,
                count: s.count,
                totalStudents: s.count,
                totalSolved: solvedQ.length,
                avgAccuracy,
                avgPoints: Math.round(s.avgPoints || 0),
                activeUsers: activeUsers.length
            });
        }

        // ========== LAB-WISE STATS ==========
        const labAgg = await User.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$assignedLab', count: { $sum: 1 }, avgPoints: { $avg: '$totalPoints' } } }
        ]);
        const labStats = [];
        for (const l of labAgg) {
            if (!l._id) continue;
            const labUsers = await User.find({ assignedLab: l._id }).select('_id').lean();
            const labUserIds = labUsers.map(u => u._id);
            const acceptedSubs = await Submission.countDocuments({ user: { $in: labUserIds }, status: 'Accepted' });
            const totalLabSubs = await Submission.countDocuments({ user: { $in: labUserIds } });
            const avgAccuracy = totalLabSubs > 0 ? Math.round((acceptedSubs / totalLabSubs) * 100) : 0;
            const solvedQ = await Submission.distinct('question', { user: { $in: labUserIds }, status: 'Accepted' });
            labStats.push({
                _id: l._id,
                count: l.count,
                totalStudents: l.count,
                totalSolved: solvedQ.length,
                avgAccuracy,
                avgPoints: Math.round(l.avgPoints || 0)
            });
        }

        // ========== WEEKLY COMPLETION ANALYTICS ==========
        const weeks = await Question.aggregate([
            { $match: { weekNumber: { $exists: true, $ne: null } } },
            { $group: { _id: '$weekNumber', totalTasks: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const weeklyCompletionData = [];
        for (const w of weeks) {
            const weekQuestions = await Question.find({ weekNumber: w._id }).select('_id').lean();
            const weekQuestionIds = weekQuestions.map(q => q._id);
            const completedUsers = await Submission.distinct('user', {
                question: { $in: weekQuestionIds },
                user: { $in: userIds },
                status: 'Accepted'
            });
            const pendingUsers = userIdsStr.filter(uid => !completedUsers.some(cu => cu.toString() === uid));
            weeklyCompletionData.push({
                name: `Week ${w._id}`,
                weekNumber: w._id,
                completed: completedUsers.length,
                pending: pendingUsers.length,
                totalTasks: w.totalTasks
            });
        }

        // ========== BRANCH STATS ==========
        const branchAgg = await User.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$branch', count: { $sum: 1 }, avgPoints: { $avg: '$totalPoints' } } }
        ]);
        const branchStats = [];
        for (const b of branchAgg) {
            if (!b._id || b._id === 'Unknown' || b._id === '') continue;
            const branchUsers = await User.find({ branch: b._id }).select('_id').lean();
            const bUserIds = branchUsers.map(u => u._id);
            const acceptedSubs = await Submission.countDocuments({ user: { $in: bUserIds }, status: 'Accepted' });
            const totalBSubs = await Submission.countDocuments({ user: { $in: bUserIds } });
            const avgAccuracy = totalBSubs > 0 ? Math.round((acceptedSubs / totalBSubs) * 100) : 0;
            branchStats.push({
                _id: b._id,
                count: b.count,
                totalStudents: b.count,
                avgAccuracy,
                avgPoints: Math.round(b.avgPoints || 0)
            });
        }

        // ========== STUDENT PERFORMANCE (Bulk Aggregation) ==========
        const subCounts = await Submission.aggregate([
            { $match: { user: { $in: userIds } } },
            { $group: { _id: '$user', total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } } } }
        ]);
        const countMap = {};
        subCounts.forEach(c => { countMap[c._id.toString()] = { total: c.total, accepted: c.accepted }; });

        const langAggs = await Submission.aggregate([
            { $match: { user: { $in: userIds }, status: 'Accepted' } },
            { $group: { _id: { user: '$user', language: '$language' }, count: { $sum: 1 }, points: { $sum: '$earnedPoints' }, avgSolveTime: { $avg: '$solveTime' } } },
            { $sort: { '_id.user': 1, count: -1 } }
        ]);
        const langMap = {};
        langAggs.forEach(l => {
            const uid = l._id.user.toString();
            if (!langMap[uid]) langMap[uid] = [];
            langMap[uid].push({
                language: l._id.language,
                solved: l.count,
                points: l.points,
                avgSolveTime: Math.round(l.avgSolveTime || 0)
            });
        });

        const solveTimeAggs = await Submission.aggregate([
            { $match: { user: { $in: userIds }, status: 'Accepted' } },
            { $group: { _id: '$user', totalSolveTime: { $sum: '$solveTime' }, totalActiveSolveTime: { $sum: '$activeSolveTime' }, bestSolveTime: { $min: '$activeSolveTime' }, avgSolveTime: { $avg: '$activeSolveTime' } } }
        ]);
        const solveTimeMap = {};
        solveTimeAggs.forEach(s => {
            solveTimeMap[s._id.toString()] = {
                totalSolveTime: s.totalSolveTime || s.totalActiveSolveTime,
                totalActiveSolveTime: s.totalActiveSolveTime,
                bestSolveTime: s.bestSolveTime,
                avgSolveTime: Math.round(s.avgSolveTime || 0)
            };
        });

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const recentSubs = await Submission.aggregate([
            { $match: { user: { $in: userIds }, createdAt: { $gte: last30Days } } },
            { $group: { _id: { user: '$user', date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } } }
        ]);
        const activityMap = {};
        recentSubs.forEach(a => {
            const uid = a._id.user.toString();
            if (!activityMap[uid]) activityMap[uid] = new Set();
            activityMap[uid].add(a._id.date);
        });

        const allStudentsData = await User.find(matchFilter).lean();
        const studentPerformance = allStudentsData.map(student => {
            const sid = student._id.toString();
            const counts = countMap[sid] || { total: 0, accepted: 0 };
            const langs = langMap[sid] || [];
            const bestLanguage = langs.length > 0 ? langs[0].language : null;
            const mostUsedLanguage = langs.length > 0 ? langs.reduce((a, b) => a.solved > b.solved ? a : b).language : null;
            const highestScoringLang = langs.length > 0 ? langs.reduce((a, b) => a.points > b.points ? a : b).language : null;
            const activeDaysSet = activityMap[sid];
            const activeDays = activeDaysSet ? activeDaysSet.size : 0;
            const consistencyScore = Math.min(100, Math.round((activeDays / 30) * 100));
            const solveInfo = solveTimeMap[sid] || { totalSolveTime: 0, totalActiveSolveTime: 0, bestSolveTime: 0, avgSolveTime: 0 };
            const accuracy = counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 0;

            return {
                _id: student._id,
                name: student.name,
                regNo: student.regNo,
                year: student.year,
                section: student.section || '',
                branch: student.branch || '',
                assignedLab: student.assignedLab,
                totalPoints: student.totalPoints || 0,
                submissions: counts.total,
                acceptedSubmissions: counts.accepted,
                failedCount: counts.total - counts.accepted,
                accuracy,
                bestLanguage,
                mostUsedLanguage,
                highestScoringLanguage: highestScoringLang,
                totalSolveTime: solveInfo.totalSolveTime,
                totalActiveSolveTime: solveInfo.totalActiveSolveTime,
                bestSolveTime: solveInfo.bestSolveTime,
                avgSolveTime: solveInfo.avgSolveTime,
                consistencyScore,
                languageProficiency: langs,
                isActive: activeDays > 0
            };
        });

        let filteredPerformance = studentPerformance;
        if (language) {
            filteredPerformance = studentPerformance.filter(s =>
                s.bestLanguage && s.bestLanguage.toLowerCase() === language.toLowerCase()
            );
        }

        const sortedByPoints = [...filteredPerformance].sort((a, b) => b.totalPoints - a.totalPoints);
        const sortedBySolveTime = [...filteredPerformance].filter(s => s.bestSolveTime > 0).sort((a, b) => a.bestSolveTime - b.bestSolveTime);
        const sortedByConsistency = [...filteredPerformance].sort((a, b) => b.consistencyScore - a.consistencyScore);
        const sortedByAccuracy = [...filteredPerformance].filter(s => s.submissions > 0).sort((a, b) => b.accuracy - a.accuracy);

        const topByLanguage = {};
        const normalizedLangs = ['python', 'java', 'c', 'cpp', 'javascript'];
        for (const lang of normalizedLangs) {
            const langStudents = await Submission.aggregate([
                { $match: { language: { $regex: new RegExp('^' + lang + '$', 'i') }, status: 'Accepted' } },
                { $group: { _id: '$user', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                { $project: { name: { $ifNull: ['$user.name', 'Unknown'] }, regNo: { $ifNull: ['$user.regNo', ''] }, assignedLab: { $ifNull: ['$user.assignedLab', ''] }, solved: '$count' } }
            ]);
            if (langStudents.length > 0) {
                topByLanguage[lang] = langStudents;
            }
        }

        res.json({
            totalStudents,
            totalSubmissions,
            totalQuestions,
            totalAccepted,
            successRate: totalSubmissions > 0 ? Math.round((totalAccepted / totalSubmissions) * 100) : 0,
            yearStats,
            sectionStats,
            labStats,
            branchStats,
            weeklyCompletionData,
            studentPerformance: filteredPerformance,
            topStudents: {
                highestPoints: sortedByPoints.slice(0, 10),
                fastestSolve: sortedBySolveTime.slice(0, 10),
                mostConsistent: sortedByConsistency.slice(0, 10),
                highestAccuracy: sortedByAccuracy.slice(0, 10)
            },
            topByLanguage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching HOD dashboard' });
    }
});

// =============================================
// ENHANCED FACULTY DASHBOARD API
// =============================================
router.get('/faculty/dashboard', authUser, async (req, res) => {
    try {
        if (!['faculty', 'hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.adminId).lean();
        if (!admin || !admin.assignedLab) {
            return res.status(400).json({ message: 'No lab assigned' });
        }

        const { year, section, search } = req.query;
        const lab = admin.assignedLab;
        const matchFilter = { $or: [{ assignedLab: lab }, { selectedLab: lab }] };
        if (year) matchFilter.year = year;
        if (section) matchFilter.section = section;
        if (search) {
            matchFilter.$and = [
                { $or: [{ assignedLab: lab }, { selectedLab: lab }] },
                { $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { regNo: { $regex: search, $options: 'i' } },
                    { branch: { $regex: search, $options: 'i' } },
                    { section: { $regex: search, $options: 'i' } }
                ]}
            ];
        }

        const students = await User.find(matchFilter).lean();

        const studentIds = students.map(s => s._id);
        const submissionCounts = await Submission.aggregate([
            { $match: { user: { $in: studentIds } } },
            { $group: { _id: '$user', total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } } } }
        ]);
        const countMap = {};
        submissionCounts.forEach(c => { countMap[c._id.toString()] = { total: c.total, accepted: c.accepted }; });

        const langAggs = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted' } },
            { $group: { _id: { user: '$user', language: '$language' }, count: { $sum: 1 }, points: { $sum: '$earnedPoints' } } },
            { $sort: { '_id.user': 1, count: -1 } }
        ]);
        const langMap = {};
        langAggs.forEach(l => {
            const uid = l._id.user.toString();
            if (!langMap[uid]) langMap[uid] = [];
            langMap[uid].push({ language: l._id.language, solved: l.count, points: l.points });
        });

        const solveTimeAggs = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted' } },
            { $group: { _id: '$user', totalActiveSolveTime: { $sum: '$activeSolveTime' }, bestSolveTime: { $min: '$activeSolveTime' }, avgSolveTime: { $avg: '$activeSolveTime' } } }
        ]);
        const solveTimeMap = {};
        solveTimeAggs.forEach(s => { solveTimeMap[s._id.toString()] = { totalActiveSolveTime: s.totalActiveSolveTime, bestSolveTime: s.bestSolveTime, avgSolveTime: Math.round(s.avgSolveTime || 0) }; });

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const recentSubs = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, createdAt: { $gte: last30Days } } },
            { $group: { _id: { user: '$user', date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } } }
        ]);
        const activityMap = {};
        recentSubs.forEach(a => {
            const uid = a._id.user.toString();
            if (!activityMap[uid]) activityMap[uid] = new Set();
            activityMap[uid].add(a._id.date);
        });

        // Consistency streak: count consecutive active days
        const streakMap = {};
        for (const [uid, daysSet] of Object.entries(activityMap)) {
            const sortedDays = Array.from(daysSet).sort();
            let maxStreak = 0;
            let currentStreak = 1;
            for (let i = 1; i < sortedDays.length; i++) {
                const prev = new Date(sortedDays[i - 1]);
                const curr = new Date(sortedDays[i]);
                const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    maxStreak = Math.max(maxStreak, currentStreak);
                    currentStreak = 1;
                }
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            streakMap[uid] = maxStreak;
        }

        const performance = students.map(student => {
            const sid = student._id.toString();
            const counts = countMap[sid] || { total: 0, accepted: 0 };
            const langs = langMap[sid] || [];
            const bestLanguage = langs.length > 0 ? langs[0].language : null;
            const activeDaysSet = activityMap[sid];
            const activeDays = activeDaysSet ? activeDaysSet.size : 0;
            const consistencyScore = Math.min(100, Math.round((activeDays / 30) * 100));
            const accuracy = counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 0;
            const solveInfo = solveTimeMap[sid] || { totalActiveSolveTime: 0, bestSolveTime: 0, avgSolveTime: 0 };

            // Get the question title from latest accepted submission
            let lastQuestionSolved = '';
            let lastLanguageUsed = '';
            const latestAcceptedSubmission = null; // will be populated below

            return {
                _id: student._id,
                name: student.name,
                regNo: student.regNo,
                email: student.email,
                year: student.year,
                section: student.section || '',
                branch: student.branch || '',
                assignedLab: student.assignedLab || student.selectedLab || '',
                totalPoints: student.totalPoints || 0,
                submissions: counts.total,
                acceptedSubmissions: counts.accepted,
                failedCount: counts.total - counts.accepted,
                accuracy,
                bestLanguage,
                totalActiveSolveTime: solveInfo.totalActiveSolveTime,
                bestSolveTime: solveInfo.bestSolveTime,
                avgSolveTime: solveInfo.avgSolveTime,
                consistencyScore,
                consistencyStreak: streakMap[sid] || 0,
                languageProficiency: langs,
                isActive: activeDays > 0
            };
        });

        const totalPoints = performance.reduce((s, p) => s + p.totalPoints, 0);
        const avgAccuracy = performance.filter(p => p.submissions > 0).reduce((s, p, _, a) => s + p.accuracy / a.length, 0);

        res.json({
            students: performance,
            totalStudents: performance.length,
            totalSubmissions: performance.reduce((s, p) => s + p.submissions, 0),
            totalAccepted: performance.reduce((s, p) => s + p.acceptedSubmissions, 0),
            averageAccuracy: Math.round(avgAccuracy || 0),
            totalPoints
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching faculty dashboard' });
    }
});

// =============================================
// ENHANCED ADVANCED FILTER / SEARCH / SORT / PAGINATION
// =============================================

const getBaseFilter = (req) => {
    const {
        search, year, section, branch, lab, language,
        timeSolved, timeSolvedOrder,
        languageProficiency,
        solvedFilter, solvedOrder,
        pointsFilter, pointsOrder,
        accuracyFilter, accuracyValue,
        consistencyFilter,
        page, limit: pageLimit
    } = req.query;

    const matchFilter = {};
    const role = req.role;
    const adminId = req.adminId;

    if (year) matchFilter.year = year;
    if (section) matchFilter.section = section;
    if (branch) matchFilter.branch = branch;
    if (lab) matchFilter.assignedLab = lab;

    const searchFilter = search ? {
        $or: [
            { name: { $regex: search, $options: 'i' } },
            { regNo: { $regex: search, $options: 'i' } },
            { branch: { $regex: search, $options: 'i' } },
            { section: { $regex: search, $options: 'i' } },
            { year: { $regex: search, $options: 'i' } },
            { assignedLab: { $regex: search, $options: 'i' } }
        ]
    } : {};

    if (Object.keys(searchFilter).length > 0) {
        Object.assign(matchFilter, searchFilter);
    }

    return {
        matchFilter,
        search,
        year, section, branch, lab, language,
        timeSolved, timeSolvedOrder,
        languageProficiency,
        solvedFilter, solvedOrder,
        pointsFilter, pointsOrder,
        accuracyFilter, accuracyValue,
        consistencyFilter,
        page: parseInt(page) || 1,
        limit: parseInt(pageLimit) || 50,
        role, adminId
    };
};

const getWeeklyDateRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { weekStart: monday, weekEnd: sunday };
};

const getMonthlyDateRange = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { monthStart, monthEnd };
};

router.get('/advanced', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'faculty', 'hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const filters = getBaseFilter(req);
        const { matchFilter, page, limit } = filters;

        let labScope = {};
        if (['labadmin', 'faculty'].includes(req.role) && req.adminId) {
            const admin = await Admin.findById(req.adminId).lean();
            if (admin && admin.assignedLab) {
                labScope = { $or: [{ assignedLab: admin.assignedLab }, { selectedLab: admin.assignedLab }] };
            }
        }

        const finalFilter = { ...matchFilter };
        if (Object.keys(labScope).length > 0) {
            if (finalFilter.$or) {
                const existingOr = finalFilter.$or;
                delete finalFilter.$or;
                finalFilter.$and = [
                    { $or: existingOr },
                    labScope
                ];
            } else {
                Object.assign(finalFilter, labScope);
            }
        }

        const totalStudents = await User.countDocuments(finalFilter);

        const students = await User.find(finalFilter)
            .sort({ totalPoints: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const studentIds = students.map(s => s._id);

        const submissionCounts = await Submission.aggregate([
            { $match: { user: { $in: studentIds } } },
            { $group: { _id: '$user', total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } } } }
        ]);
        const countMap = {};
        submissionCounts.forEach(c => { countMap[c._id.toString()] = { total: c.total, accepted: c.accepted }; });

        const langAggs = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted' } },
            { $group: { _id: { user: '$user', language: '$language' }, count: { $sum: 1 }, points: { $sum: '$earnedPoints' }, avgSolveTime: { $avg: '$solveTime' } } },
            { $sort: { '_id.user': 1, count: -1 } }
        ]);
        const langMap = {};
        langAggs.forEach(l => {
            const uid = l._id.user.toString();
            if (!langMap[uid]) langMap[uid] = [];
            langMap[uid].push({ language: l._id.language, solved: l.count, points: l.points, avgSolveTime: Math.round(l.avgSolveTime || 0) });
        });

        const solveTimeAggs = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted' } },
            { $group: { _id: '$user', totalSolveTime: { $sum: '$solveTime' }, bestSolveTime: { $min: '$solveTime' }, avgSolveTime: { $avg: '$solveTime' } } }
        ]);
        const solveTimeMap = {};
        solveTimeAggs.forEach(s => { solveTimeMap[s._id.toString()] = { totalSolveTime: s.totalSolveTime, bestSolveTime: s.bestSolveTime, avgSolveTime: s.avgSolveTime }; });

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const recentSubs = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, createdAt: { $gte: last30Days } } },
            { $group: { _id: { user: '$user', date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } } }
        ]);
        const activityMap = {};
        recentSubs.forEach(a => {
            const uid = a._id.user.toString();
            if (!activityMap[uid]) activityMap[uid] = new Set();
            activityMap[uid].add(a._id.date);
        });

        const { weekStart, weekEnd } = getWeeklyDateRange();
        const { monthStart, monthEnd } = getMonthlyDateRange();

        const weeklyAccepted = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted', createdAt: { $gte: weekStart, $lte: weekEnd } } },
            { $group: { _id: '$user', count: { $sum: 1 } } }
        ]);
        const weeklyMap = {};
        weeklyAccepted.forEach(w => { weeklyMap[w._id.toString()] = w.count; });

        const monthlyAccepted = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted', createdAt: { $gte: monthStart, $lte: monthEnd } } },
            { $group: { _id: '$user', count: { $sum: 1 } } }
        ]);
        const monthlyMap = {};
        monthlyAccepted.forEach(m => { monthlyMap[m._id.toString()] = m.count; });

        const weeklyPoints = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted', createdAt: { $gte: weekStart, $lte: weekEnd } } },
            { $group: { _id: '$user', points: { $sum: '$earnedPoints' } } }
        ]);
        const weeklyPointsMap = {};
        weeklyPoints.forEach(w => { weeklyPointsMap[w._id.toString()] = w.points; });

        const monthlyPoints = await Submission.aggregate([
            { $match: { user: { $in: studentIds }, status: 'Accepted', createdAt: { $gte: monthStart, $lte: monthEnd } } },
            { $group: { _id: '$user', points: { $sum: '$earnedPoints' } } }
        ]);
        const monthlyPointsMap = {};
        monthlyPoints.forEach(m => { monthlyPointsMap[m._id.toString()] = m.points; });

        let performance = students.map(student => {
            const sid = student._id.toString();
            const counts = countMap[sid] || { total: 0, accepted: 0 };
            const langs = langMap[sid] || [];
            const solveInfo = solveTimeMap[sid] || { totalSolveTime: 0, bestSolveTime: 0, avgSolveTime: 0 };
            const activeDaysSet = activityMap[sid];
            const activeDays = activeDaysSet ? activeDaysSet.size : 0;
            const consistencyScore = Math.min(100, Math.round((activeDays / 30) * 100));
            const accuracy = counts.total > 0 ? Math.round((counts.accepted / counts.total) * 100) : 0;
            const bestLanguage = langs.length > 0 ? langs[0].language : null;
            const mostUsedLang = langs.length > 0 ? langs.reduce((a, b) => a.solved > b.solved ? a : b).language : null;
            const highestAcceptedLang = langs.length > 0 ? langs.reduce((a, b) => a.solved > b.solved ? a : b).language : null;
            const mostSuccessfulLang = langs.length > 0 ? langs.reduce((a, b) => (a.solved / (countMap[sid]?.total || 1)) > (b.solved / (countMap[sid]?.total || 1)) ? a : b).language : null;

            return {
                _id: student._id,
                name: student.name,
                regNo: student.regNo,
                email: student.email,
                year: student.year,
                section: student.section || '',
                branch: student.branch || student.collegeName || '',
                assignedLab: student.assignedLab || '',
                totalPoints: student.totalPoints || 0,
                submissions: counts.total,
                acceptedSubmissions: counts.accepted,
                accuracy,
                bestLanguage,
                mostUsedLanguage: mostUsedLang,
                highestAcceptedLanguage: highestAcceptedLang,
                mostSuccessfulLanguage: mostSuccessfulLang,
                totalSolveTime: solveInfo.totalSolveTime,
                bestSolveTime: solveInfo.bestSolveTime,
                avgSolveTime: Math.round(solveInfo.avgSolveTime || 0),
                consistencyScore,
                weeklySolved: weeklyMap[sid] || 0,
                monthlySolved: monthlyMap[sid] || 0,
                weeklyPoints: weeklyPointsMap[sid] || 0,
                monthlyPoints: monthlyPointsMap[sid] || 0,
                languageProficiency: langs
            };
        });

        if (filters.language) {
            const lang = filters.language.toLowerCase();
            performance = performance.filter(s => {
                if (!s.languageProficiency) return false;
                return s.languageProficiency.some(l => l.language.toLowerCase() === lang);
            });
        }

        if (filters.languageProficiency) {
            switch (filters.languageProficiency) {
                case 'best': break;
                case 'mostSuccessful': break;
                case 'highestAccepted': break;
                case 'mostUsed': break;
            }
        }

        if (filters.solvedFilter) {
            switch (filters.solvedFilter) {
                case 'total':
                    if (filters.solvedOrder === 'asc') performance.sort((a, b) => a.acceptedSubmissions - b.acceptedSubmissions);
                    else performance.sort((a, b) => b.acceptedSubmissions - a.acceptedSubmissions);
                    break;
                case 'weekly':
                    if (filters.solvedOrder === 'asc') performance.sort((a, b) => a.weeklySolved - b.weeklySolved);
                    else performance.sort((a, b) => b.weeklySolved - a.weeklySolved);
                    break;
                case 'monthly':
                    if (filters.solvedOrder === 'asc') performance.sort((a, b) => a.monthlySolved - b.monthlySolved);
                    else performance.sort((a, b) => b.monthlySolved - a.monthlySolved);
                    break;
                case 'fullyCompleted':
                    performance = performance.filter(s => s.weeklySolved > 0);
                    break;
                case 'pending':
                    performance = performance.filter(s => s.acceptedSubmissions === 0);
                    break;
            }
        }

        if (filters.pointsFilter) {
            switch (filters.pointsFilter) {
                case 'highest':
                    performance.sort((a, b) => b.totalPoints - a.totalPoints);
                    break;
                case 'lowest':
                    performance.sort((a, b) => a.totalPoints - b.totalPoints);
                    break;
                case 'weekly':
                    if (filters.pointsOrder === 'asc') performance.sort((a, b) => a.weeklyPoints - b.weeklyPoints);
                    else performance.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
                    break;
                case 'monthly':
                    if (filters.pointsOrder === 'asc') performance.sort((a, b) => a.monthlyPoints - b.monthlyPoints);
                    else performance.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
                    break;
                case 'total':
                    if (filters.pointsOrder === 'asc') performance.sort((a, b) => a.totalPoints - b.totalPoints);
                    else performance.sort((a, b) => b.totalPoints - a.totalPoints);
                    break;
            }
        }

        if (filters.timeSolved) {
            switch (filters.timeSolved) {
                case 'fastest':
                    performance = performance.filter(s => s.bestSolveTime > 0);
                    if (filters.timeSolvedOrder === 'asc') performance.sort((a, b) => a.bestSolveTime - b.bestSolveTime);
                    else performance.sort((a, b) => b.bestSolveTime - a.bestSolveTime);
                    break;
                case 'slowest':
                    performance = performance.filter(s => s.totalSolveTime > 0);
                    if (filters.timeSolvedOrder === 'asc') performance.sort((a, b) => a.totalSolveTime - b.totalSolveTime);
                    else performance.sort((a, b) => b.totalSolveTime - a.totalSolveTime);
                    break;
                case 'average':
                    performance = performance.filter(s => s.avgSolveTime > 0);
                    if (filters.timeSolvedOrder === 'asc') performance.sort((a, b) => a.avgSolveTime - b.avgSolveTime);
                    else performance.sort((a, b) => b.avgSolveTime - a.avgSolveTime);
                    break;
            }
        }

        if (filters.accuracyFilter) {
            switch (filters.accuracyFilter) {
                case 'highest':
                    performance = performance.filter(s => s.submissions > 0);
                    performance.sort((a, b) => b.accuracy - a.accuracy);
                    break;
                case 'lowest':
                    performance = performance.filter(s => s.submissions > 0);
                    performance.sort((a, b) => a.accuracy - b.accuracy);
                    break;
                case 'exact':
                    const val = parseInt(filters.accuracyValue) || 0;
                    performance = performance.filter(s => s.accuracy >= val);
                    performance.sort((a, b) => b.accuracy - a.accuracy);
                    break;
            }
        }

        if (filters.consistencyFilter) {
            switch (filters.consistencyFilter) {
                case 'daily':
                    performance.sort((a, b) => (activityMap[a._id.toString()]?.size || 0) - (activityMap[b._id.toString()]?.size || 0) * -1);
                    break;
                case 'weekly':
                    performance.sort((a, b) => b.weeklySolved - a.weeklySolved);
                    break;
                case 'streak':
                    performance.sort((a, b) => b.consistencyScore - a.consistencyScore);
                    break;
                case 'regular':
                    performance.sort((a, b) => b.consistencyScore - a.consistencyScore);
                    break;
            }
        }

        const totalFiltered = performance.length;
        const paginatedPerformance = performance.slice(0, limit);

        const totalPointsSum = performance.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
        const totalSubsSum = performance.reduce((sum, s) => sum + (s.submissions || 0), 0);
        const totalAcceptedSum = performance.reduce((sum, s) => sum + (s.acceptedSubmissions || 0), 0);
        const avgAccuracy = performance.filter(s => s.submissions > 0).reduce((sum, s, _, arr) => sum + s.accuracy / arr.length, 0);

        res.json({
            students: paginatedPerformance,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: totalFiltered,
                totalPages: Math.ceil(totalFiltered / limit)
            },
            summary: {
                totalStudents: totalFiltered,
                totalSubmissions: totalSubsSum,
                totalAccepted: totalAcceptedSum,
                averageAccuracy: Math.round(avgAccuracy || 0),
                totalPoints: totalPointsSum
            }
        });
    } catch (err) {
        console.error('Advanced filter error:', err);
        res.status(500).json({ message: 'Error in advanced filtering' });
    }
});

router.post('/violation/report', authUser, async (req, res) => {
    try {
        const { type, questionId } = req.body;

        if (!['tabswitch', 'screenshot', 'copypaste'].includes(type)) {
            return res.status(400).json({ message: 'Invalid violation type' });
        }

        const user = await User.findById(req.userId);
        if (user) {
            user.violations.push({
                type,
                timestamp: new Date(),
                question: questionId
            });
            user.violationCount = (user.violationCount || 0) + 1;

            if (user.violationCount >= 3) {
                user.isCompilerLocked = true;
                user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
            }

            await user.save();
        }

        if (req.app.locals.io) {
            req.app.locals.io.emit('violationAlert', {
                userId: req.userId,
                userName: user?.name,
                regNo: user?.regNo,
                type,
                questionId,
                timestamp: new Date(),
                totalViolations: user?.violationCount || 1
            });
        }

        res.json({ message: 'Violation reported', violationCount: user?.violationCount || 1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error reporting violation' });
    }
});

router.get('/lab/violations', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'faculty', 'hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.adminId).lean();
        const lab = admin.assignedLab;

        const violations = await User.aggregate([
            { $match: { $or: [{ assignedLab: lab }, { selectedLab: lab }] } },
            { $unwind: '$violations' },
            { $sort: { 'violations.timestamp': -1 } },
            { $limit: 50 }
        ]);

        res.json(violations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching violations' });
    }
});

module.exports = router;






