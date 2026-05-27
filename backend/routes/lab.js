const express = require('express');
const router = express.Router();
const { questions } = require('../config/dbHelper');
const moment = require('moment-timezone');

// @route   GET api/lab/status
// @desc    Check if lab is currently open based on question schedule
router.get('/status', async (req, res) => {
    try {
        const { questionId } = req.query;
        if (!questionId) {
            return res.status(400).json({ message: 'questionId is required' });
        }

        const qDoc = await questions.doc(questionId).get();
        if (!qDoc.exists) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const question = qDoc.data();
        let isOpen = true;

        // Firebase timestamps need to be converted to JS dates using .toDate() if stored as Timestamp
        const unlockStart = question.unlockStartTime && question.unlockStartTime.toDate ? question.unlockStartTime.toDate() : new Date(question.unlockStartTime);
        const unlockEnd = question.unlockEndTime && question.unlockEndTime.toDate ? question.unlockEndTime.toDate() : new Date(question.unlockEndTime);

        if (question.unlockStartTime && question.unlockEndTime) {
            const currentTime = new Date(
                new Date().toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata"
                })
            );

            isOpen =
                currentTime >= unlockStart &&
                currentTime <= unlockEnd;
        }

        res.json({ isOpen });
    } catch (err) {
        console.error('Error in /api/lab/status:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
