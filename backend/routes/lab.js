const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const moment = require('moment-timezone');

// @route   GET api/lab/status
// @desc    Check if lab is currently open based on question schedule
router.get('/status', async (req, res) => {
    try {
        const { questionId } = req.query;
        if (!questionId) {
            return res.status(400).json({ message: 'questionId is required' });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        let isOpen = true;

        if (question.unlockStartTime && question.unlockEndTime) {
            const currentTime = new Date(
                new Date().toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata"
                })
            );

            isOpen =
                currentTime >= new Date(question.unlockStartTime) &&
                currentTime <= new Date(question.unlockEndTime);
        }

        res.json({ isOpen });
    } catch (err) {
        console.error('Error in /api/lab/status:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
