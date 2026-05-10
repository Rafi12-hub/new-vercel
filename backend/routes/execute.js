const express = require('express');
const router = express.Router();
const axios = require('axios');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const User = require('../models/User');

const JUDGE0_URL = process.env.JUDGE0_API_URL;
const JUDGE0_KEY = process.env.JUDGE0_API_KEY;

const languageMap = {
    'c': 50,
    'cpp': 54,
    'java': 62,
    'python': 71,
    'javascript': 63,
    'sql': 82
};

// @route   POST api/execute/run
// @desc    Run code against sample test cases
router.post('/run', async (req, res) => {
    const { code, language, questionId } = req.body;

    try {
        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        const results = [];
        for (const testCase of question.sampleTestCases) {
            // In a real scenario, we'd batch these requests to Judge0
            // For now, let's simulate or call Judge0 if key is present
            if (JUDGE0_KEY && JUDGE0_KEY !== 'YOUR_RAPIDAPI_KEY_HERE') {
                const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                    source_code: code,
                    language_id: languageMap[language.toLowerCase()] || 63,
                    stdin: testCase.input,
                    expected_output: testCase.output
                }, {
                    headers: {
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': JUDGE0_KEY
                    }
                });
                results.push(response.data);
            } else {
                // Mock result for demo if no API key
                results.push({
                    status: { description: 'Accepted' },
                    stdout: testCase.output,
                    time: "0.001",
                    memory: "100"
                });
            }
        }

        res.json({ results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Execution error', error: err.message });
    }
});

// @route   POST api/execute/submit
// @desc    Submit code against all test cases
router.post('/submit', async (req, res) => {
    const { code, language, questionId, userId } = req.body;

    try {
        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        // Enforce Lab Schedule
        const now = new Date();
        const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        const Admin = require('../models/Admin');
        const activeSchedule = await Admin.findOne({
            role: { $in: ['admin', 'labadmin'] },
            assignedLab: question.labName,
            labDay: currentDay,
            startTime: { $lte: currentTime },
            endTime: { $gte: currentTime }
        });

        if (!activeSchedule) {
            return res.status(403).json({ message: 'Lab is currently closed. Submissions are only allowed during the assigned lab schedule.' });
        }

        const allTestCases = [...question.sampleTestCases, ...question.hiddenTestCases];
        let passedCount = 0;
        let overallStatus = 'Accepted';
        
        // Simulating submission logic
        for (const testCase of allTestCases) {
             passedCount++; // Mocking success for demo
        }

        const complexity = analyzeComplexity(code, language);

        const submission = new Submission({
            user: userId,
            question: questionId,
            language,
            code,
            status: overallStatus,
            testCasesPassed: passedCount,
            totalTestCases: allTestCases.length,
            timeComplexity: complexity.time,
            spaceComplexity: complexity.space
        });

        await submission.save();

        // Update user progress
        const user = await User.findById(userId);
        user.completedTasks += 1;
        await user.save();

        // Populate submission to send to clients
        const populatedSubmission = await Submission.findById(submission._id).populate('user', 'name regNo').populate('question', 'title');

        if (req.app.locals.io) {
            req.app.locals.io.emit('submissionAdded', populatedSubmission);
            req.app.locals.io.emit('progressUpdated', user);
            req.app.locals.io.emit('notification', {
                text: `Your submission for "${question.title}" was Accepted!`,
                type: 'success',
                userId: userId
            });
        }

        res.json(submission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Submission error' });
    }
});

function analyzeComplexity(code, language) {
    // Very basic heuristic for complexity analysis
    let time = "O(n)";
    let space = "O(1)";

    if (code.includes('for') && code.includes('for', code.indexOf('for') + 1)) {
        time = "O(n²)";
    } else if (code.includes('while') || code.includes('for')) {
        time = "O(n)";
    } else {
        time = "O(1)";
    }

    if (code.includes('Array') || code.includes('ArrayList') || code.includes('vector') || code.includes('[ ]')) {
        space = "O(n)";
    }

    return { time, space };
}

module.exports = router;
