const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
                    if (student && student.selectedLab) {
                        filter.labName = student.selectedLab;
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
// @desc    Get question by ID
router.get('/:id', async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
