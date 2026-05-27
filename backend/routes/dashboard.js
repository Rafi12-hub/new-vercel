const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.user) {
            req.user = decoded.user;
            req.role = 'student';
        } else if (decoded.admin) {
            req.admin = decoded.admin;
            req.role = decoded.admin.role;
        } else {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        next();
    } catch (err) {
        console.error('[Dashboard Auth Error]', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

router.get('/student/dashboard', auth, async (req, res) => {
    try {
        if (req.role !== 'student') {
            return res.status(403).json({ message: 'Access denied: Student access required' });
        }
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate({
                path: 'submissions',
                options: { sort: { submittedAt: -1 } },
                populate: {
                    path: 'question',
                    select: 'title difficulty labName weeklyTask description sampleTestCases primaryLanguage'
                }
            });
        
        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json({
            status: 'success',
            role: 'student',
            user,
            submissions: user.submissions || [],
            stats: {
                totalPoints: user.totalPoints || 0,
                rank: user.rank || 0,
                completedTasks: user.completedTasks || 0
            }
        });
    } catch (err) {
        console.error('[Dashboard API Error] Student Dashboard:', err);
        res.status(500).json({ message: 'Server error loading student dashboard', error: err.message });
    }
});

router.get('/hod/dashboard', auth, async (req, res) => {
    try {
        if (req.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied: HOD access required' });
        }
        
        const { year, section, branch, lab } = req.query;
        const matchFilter = {};
        if (year) matchFilter.year = year;
        if (section) matchFilter.section = section;
        if (branch) matchFilter.branch = branch;
        if (lab) matchFilter.assignedLab = lab;

        const totalStudents = await User.countDocuments(matchFilter);
        const totalQuestions = await Question.countDocuments();
        const totalSubmissions = await Submission.countDocuments();
        const totalAccepted = await Submission.countDocuments({ status: 'Accepted' });

        const recentSubmissions = await Submission.find()
            .populate('user', 'name regNo')
            .populate('question', 'title')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.status(200).json({
            status: 'success',
            role: req.role,
            totalStudents,
            totalQuestions,
            totalSubmissions,
            successRate: totalSubmissions > 0 ? Math.round((totalAccepted / totalSubmissions) * 100) : 0,
            recentSubmissions,
            message: 'HOD Dashboard analytics fetched successfully'
        });
    } catch (err) {
        console.error('[Dashboard API Error] HOD Dashboard:', err);
        res.status(500).json({ message: 'Server error loading HOD dashboard', error: err.message });
    }
});

router.get('/faculty/dashboard', auth, async (req, res) => {
    try {
        if (req.role !== 'faculty' && req.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied: Faculty access required' });
        }
        
        const labFilter = req.admin.assignedLab ? { $or: [{ assignedLab: req.admin.assignedLab }, { selectedLab: req.admin.assignedLab }] } : {};
        const studentsCount = await User.countDocuments(labFilter);
        
        const questionFilter = req.admin.assignedLab ? { labName: req.admin.assignedLab } : {};
        const questionsCount = await Question.countDocuments(questionFilter);

        const { year, section, search } = req.query;
        const filter = { ...labFilter };
        if (year) filter.year = year;
        if (section) filter.section = section;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { regNo: { $regex: search, $options: 'i' } },
                { branch: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await User.find(filter).lean();

        res.status(200).json({
            status: 'success',
            role: req.role,
            assignedLab: req.admin.assignedLab || 'ALL',
            studentsCount,
            questionsCount,
            students,
            message: 'Faculty Dashboard data fetched successfully'
        });
    } catch (err) {
        console.error('[Dashboard API Error] Faculty Dashboard:', err);
        res.status(500).json({ message: 'Server error loading faculty dashboard', error: err.message });
    }
});

router.get('/lab-admin/dashboard', auth, async (req, res) => {
    try {
        if (req.role !== 'labadmin' && req.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied: Lab Admin access required' });
        }
        
        const lab = req.admin.assignedLab;
        if (!lab) {
            return res.status(400).json({ message: 'No lab assigned to this Lab Admin account' });
        }

        const { year, section, search } = req.query;
        const labFilter = { $or: [{ assignedLab: lab }, { selectedLab: lab }] };
        if (year) labFilter.year = year;
        if (section) labFilter.section = section;
        if (search) {
            labFilter.$and = [
                { $or: [{ assignedLab: lab }, { selectedLab: lab }] },
                { $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { regNo: { $regex: search, $options: 'i' } }
                ]}
            ];
        }

        const studentsCount = await User.countDocuments(labFilter);
        const questionsCount = await Question.countDocuments({ labName: lab });
        const submissionsCount = await Submission.countDocuments({ 
            question: { $in: await Question.find({ labName: lab }).distinct('_id') } 
        });

        res.status(200).json({
            status: 'success',
            role: req.role,
            assignedLab: lab,
            studentsCount,
            questionsCount,
            submissionsCount,
            message: 'Lab Admin Dashboard data fetched successfully'
        });
    } catch (err) {
        console.error('[Dashboard API Error] Lab Admin Dashboard:', err);
        res.status(500).json({ message: 'Server error loading lab admin dashboard', error: err.message });
    }
});

module.exports = router;




