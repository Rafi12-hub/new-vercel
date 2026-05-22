const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Submission = require('../models/Submission');

// @route   GET api/questions
// @desc    Get all questions (optionally filter by labName)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        
        // Check for token to identify student
        const token = req.header('x-auth-token');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user) {
                    const student = await User.findById(decoded.user.id);
                    const assignedLab = student?.assignedLab || student?.selectedLab;
                    if (student && assignedLab) {
                        filter.labName = assignedLab;
                    }
                } else if (decoded.admin) {
                    // Admin can see everything or filter by their lab
                    if (req.query.labName) filter.labName = req.query.labName;
                }
            } catch (e) {
                // Invalid token, proceed with query params if any
                if (req.query.labName) filter.labName = req.query.labName;
            }
        } else {
            if (req.query.labName) filter.labName = req.query.labName;
        }

        const questions = await Question.find(filter).select('-hiddenTestCases').populate('weeklyTask');
        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/questions/:id
// @desc    Get question by ID (hidden test cases omitted for students)
router.get('/:id', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id).populate('weeklyTask');
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        const token = req.header('x-auth-token');
        let isStaff = false;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                isStaff = !!(decoded && decoded.admin);
            } catch {
                /* ignore */
            }
        }
        const payload = question.toObject();
        if (!isStaff) {
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.user?.id) {
                        const student = await User.findById(decoded.user.id).select('assignedLab selectedLab');
                        const assignedLab = student?.assignedLab || student?.selectedLab;
                        if (assignedLab && question.labName !== assignedLab) {
                            return res.status(403).json({ message: 'You can only access questions from your assigned lab.' });
                        }
                    }
                } catch {
                    /* handled by normal hidden payload */
                }
            }
            const hidden = question.hiddenTestCases || [];
            payload.hiddenTestCaseCount = hidden.length;
            delete payload.hiddenTestCases;
            
            // Fetch accepted languages for this student
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.user?.id) {
                        const acceptedSubs = await Submission.find({
                            user: decoded.user.id,
                            question: question._id,
                            status: 'Accepted'
                        }).select('language');
                        payload.acceptedLanguages = [...new Set(acceptedSubs.map(s => s.language))];
                    }
                } catch {
                    payload.acceptedLanguages = [];
                }
            } else {
                payload.acceptedLanguages = [];
            }
        }
        res.json(payload);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/questions/create
// @desc    Create a new question
router.post('/create', async (req, res) => {
    try {
        console.log('Incoming question data:', req.body);
        const {
            title,
            description,
            inputFormat,
            outputFormat,
            constraints,
            sampleInput,
            sampleOutput,
            hiddenInput,
            hiddenOutput,
            difficulty,
            primaryLanguage,
            weekNumber,
            isFinalWeek,
            tags,
            unlockStartTime,
            unlockEndTime,
            labName,
            basePoints,
            pointsRewarded,
            maxTimeForFullPoints
        } = req.body;

        // Required field validation
        if (!title || !description || !inputFormat || !outputFormat || !sampleInput || !sampleOutput || !primaryLanguage || !weekNumber) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        const Question = require('../models/Question');
        const WeeklyTask = require('../models/WeeklyTask');

        // Prepare question payload
        const questionPayload = {
            title,
            description,
            inputFormat,
            outputFormat,
            constraints: constraints || 'None',
            difficulty: difficulty || 'Easy',
            primaryLanguage,
            sampleInput,
            sampleOutput,
            hiddenInput: hiddenInput || '0',
            hiddenOutput: hiddenOutput || '0',
            weekNumber: Number(weekNumber),
            isFinalWeek: isFinalWeek || false,
            unlockStartTime: unlockStartTime ? new Date(unlockStartTime) : null,
            unlockEndTime: unlockEndTime ? new Date(unlockEndTime) : null,
            basePoints: Number(basePoints || pointsRewarded || 100),
            maxTimeForFullPoints: Number(maxTimeForFullPoints || 60),
            sampleTestCases: [{ input: sampleInput, output: sampleOutput }],
            hiddenTestCases: [{ input: hiddenInput || '0', output: hiddenOutput || '0' }],
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
            labName: labName || 'C', // fallback if labName isn't provided
        };

        const question = new Question(questionPayload);
        await question.save();

        // Handle weekly task
        if (weekNumber) {
            let task = await WeeklyTask.findOne({ weekNumber: Number(weekNumber), labName: questionPayload.labName });
            
            if (task) {
                task.questions.push(question._id);
                if (typeof isFinalWeek === 'boolean') task.isFinalWeek = isFinalWeek;
                if (unlockStartTime) task.unlockDateTime = new Date(unlockStartTime);
                if (unlockEndTime) task.deadlineDateTime = new Date(unlockEndTime);
                await task.save();
                question.weeklyTask = task._id;
                await question.save();
            } else {
                task = new WeeklyTask({
                    weekNumber: Number(weekNumber),
                    labName: questionPayload.labName,
                    unlockDateTime: unlockStartTime ? new Date(unlockStartTime) : null,
                    deadlineDateTime: unlockEndTime ? new Date(unlockEndTime) : null,
                    questions: [question._id],
                    isUnlocked: unlockStartTime ? new Date(unlockStartTime) <= new Date() : false,
                    isFinalWeek: isFinalWeek || false
                });
                await task.save();
                question.weeklyTask = task._id;
                await question.save();
            }
        }

        if (req.app.locals.io) {
            req.app.locals.io.emit('questionAdded', question);
        }

        res.status(201).json(question);
    } catch (err) {
        console.error('Error in /api/questions/create:', err);
        res.status(500).json({ message: 'Database connection failed or ' + err.message });
    }
});

module.exports = router;
