const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const Admin = require('../models/Admin');
const ViolationReport = require('../models/ViolationReport');
const jwt = require('jsonwebtoken');

// Auth Middleware
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

// ===================================
// STUDENT ANALYTICS
// ===================================

// GET student dashboard stats
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

// GET student submission history
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

// GET student weekly progress
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

// ===================================
// LAB ADMIN ANALYTICS
// ===================================

// GET lab students analytics
router.get('/lab/students', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'admin', 'superadmin', 'hod', 'faculty'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.adminId).lean();
        const lab = admin.assignedLab;

        // Get all students in this lab
        const students = await User.find({ $or: [{ assignedLab: lab }, { selectedLab: lab }] }).lean();

        // Fetch stats for each student
        const studentStats = await Promise.all(students.map(async (student) => {
            const submissions = await Submission.countDocuments({ user: student._id });
            const accepted = await Submission.countDocuments({ user: student._id, status: 'Accepted' });

            return {
                _id: student._id,
                name: student.name,
                regNo: student.regNo,
                email: student.email,
                year: student.year,
                totalPoints: student.totalPoints || 0,
                submissions,
                acceptedSubmissions: accepted,
                successRate: student.successRate || 0,
                violations: student.violationCount || 0
            };
        }));

        res.json(studentStats.sort((a, b) => b.totalPoints - a.totalPoints));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching lab analytics' });
    }
});

// GET lab questions analytics
router.get('/lab/questions', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'admin', 'superadmin', 'hod', 'faculty'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.adminId).lean();
        const lab = admin.assignedLab;

        const questions = await Question.find({ labName: lab }).lean();

        // Get submission stats for each question
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

// ===================================
// HOD ANALYTICS
// ===================================

// GET department-wide analytics
router.get('/hod/dashboard', authUser, async (req, res) => {
    try {
        if (!['superadmin', 'hod'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const totalStudents = await User.countDocuments();
        const totalSubmissions = await Submission.countDocuments();
        const totalAccepted = await Submission.countDocuments({ status: 'Accepted' });

        // Year-wise breakdown
        const yearStats = await User.aggregate([
            {
                $group: {
                    _id: '$year',
                    count: { $sum: 1 },
                    avgPoints: { $avg: '$totalPoints' }
                }
            }
        ]);

        // Lab-wise breakdown
        const labStats = await User.aggregate([
            {
                $group: {
                    _id: '$assignedLab',
                    count: { $sum: 1 },
                    avgPoints: { $avg: '$totalPoints' }
                }
            }
        ]);

        // Top students by language
        const topPythonStudents = await Submission.aggregate([
            { $match: { language: { $in: ['python', 'Python'] }, status: 'Accepted' } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
        ]);

        const topJavaStudents = await Submission.aggregate([
            { $match: { language: { $in: ['java', 'Java'] }, status: 'Accepted' } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
        ]);

        const topCStudents = await Submission.aggregate([
            { $match: { language: { $in: ['c', 'C'] }, status: 'Accepted' } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
        ]);

        const topCppStudents = await Submission.aggregate([
            { $match: { language: { $in: ['cpp', 'c++', 'C++'] }, status: 'Accepted' } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
        ]);

        // Best students overall (by solve time)
        const bestStudents = await Submission.aggregate([
            { $match: { status: 'Accepted' } },
            { $group: { _id: '$user', bestSolveTime: { $min: '$solveTime' }, accepted: { $sum: 1 }, points: { $sum: '$earnedPoints' } } },
            { $sort: { bestSolveTime: 1, accepted: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', regNo: '$user.regNo', assignedLab: '$user.assignedLab', bestSolveTime: 1, accepted: 1, points: 1 } },
        ]);

        res.json({
            totalStudents,
            totalSubmissions,
            successRate: totalSubmissions > 0 ? Math.round((totalAccepted / totalSubmissions) * 100) : 0,
            yearStats,
            labStats,
            topLanguageStudents: {
                python: topPythonStudents,
                java: topJavaStudents,
                c: topCStudents,
                cpp: topCppStudents
            },
            bestStudents
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching HOD dashboard' });
    }
});

// ===================================
// VIOLATION TRACKING
// ===================================

// Report a security violation
router.post('/violation/report', authUser, async (req, res) => {
    try {
        const { type, questionId } = req.body;

        if (!['tabswitch', 'screenshot', 'copypaste'].includes(type)) {
            return res.status(400).json({ message: 'Invalid violation type' });
        }

        // Add violation to user record
        const user = await User.findById(req.userId);
        if (user) {
            user.violations.push({
                type,
                timestamp: new Date(),
                question: questionId
            });
            user.violationCount = (user.violationCount || 0) + 1;

            // Lock compiler after 3 violations
            if (user.violationCount >= 3) {
                user.isCompilerLocked = true;
                user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            }

            await user.save();
        }

        // Emit socket event to notify lab admins
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

// GET violations for lab admin
router.get('/lab/violations', authUser, async (req, res) => {
    try {
        if (!['labadmin', 'admin', 'superadmin', 'hod', 'faculty'].includes(req.role)) {
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
