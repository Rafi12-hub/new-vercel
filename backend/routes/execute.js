const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Notification = require('../models/Notification');

const JUDGE0_URL = process.env.JUDGE0_API_URL;
const JUDGE0_KEY = process.env.JUDGE0_API_KEY;

const languageMap = {
    c: 50,
    cpp: 54,
    java: 62,
    python: 71,
    javascript: 63,
    sql: 82,
};

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function norm(s) {
    return String(s == null ? '' : s)
        .trim()
        .replace(/\r\n/g, '\n')
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']')
        .replace(/,\s+/g, ',');
}

function runCodeLocally(code, language, stdin, expectedOut) {
    const hasCode = String(code || '').trim().length > 0;
    if (!hasCode) {
        return { status: { description: 'Runtime Error' }, stdout: '', stderr: 'Empty source', passed: false };
    }

    const tmpDir = os.tmpdir();
    const id = crypto.randomBytes(8).toString('hex');
    let ext = 'txt';
    if (language === 'javascript') ext = 'js';
    else if (language === 'python') ext = 'py';
    else if (language === 'c') ext = 'c';
    else if (language === 'cpp') ext = 'cpp';
    else if (language === 'java') ext = 'java';
    
    const fileName = language === 'java' ? 'Solution.java' : `code_${id}.${ext}`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, code, 'utf-8');

    let result = { stdout: '', stderr: '', error: null, status: 'Runtime Error' };
    const timeout = 5000;

    try {
        if (language === 'javascript') {
            const run = spawnSync('node', [filePath], { input: stdin, encoding: 'utf-8', timeout });
            result.stdout = run.stdout || '';
            result.stderr = run.stderr || '';
            if (run.error) result.error = run.error.message;
            if (run.status === null && run.signal === 'SIGTERM') result.status = 'Time Limit Exceeded';
            else if (run.status === 0) result.status = 'Accepted';
        } else if (language === 'python') {
            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            const run = spawnSync(pythonCmd, [filePath], { input: stdin, encoding: 'utf-8', timeout });
            result.stdout = run.stdout || '';
            result.stderr = run.stderr || '';
            if (run.error) result.error = run.error.message;
            if (run.status === null && run.signal === 'SIGTERM') result.status = 'Time Limit Exceeded';
            else if (run.status === 0) result.status = 'Accepted';
        } else if (language === 'c' || language === 'cpp') {
            const outPath = path.join(tmpDir, `out_${id}${process.platform === 'win32' ? '.exe' : ''}`);
            const compiler = language === 'c' ? 'gcc' : 'g++';
            const compile = spawnSync(compiler, [filePath, '-o', outPath], { encoding: 'utf-8' });
            if (compile.status !== 0) {
                result.stderr = compile.stderr || 'Compilation Error';
                result.status = 'Compilation Error';
            } else {
                const run = spawnSync(outPath, [], { input: stdin, encoding: 'utf-8', timeout });
                result.stdout = run.stdout || '';
                result.stderr = run.stderr || '';
                if (run.error) result.error = run.error.message;
                if (run.status === null && run.signal === 'SIGTERM') result.status = 'Time Limit Exceeded';
                else if (run.status === 0) result.status = 'Accepted';
                if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            }
        } else if (language === 'java') {
            // Java needs to compile then run
            const compile = spawnSync('javac', [filePath], { encoding: 'utf-8' });
            if (compile.status !== 0) {
                result.stderr = compile.stderr || 'Compilation Error';
                result.status = 'Compilation Error';
            } else {
                const run = spawnSync('java', ['-cp', tmpDir, 'Solution'], { input: stdin, encoding: 'utf-8', timeout });
                result.stdout = run.stdout || '';
                result.stderr = run.stderr || '';
                if (run.error) result.error = run.error.message;
                if (run.status === null && run.signal === 'SIGTERM') result.status = 'Time Limit Exceeded';
                else if (run.status === 0) result.status = 'Accepted';
                const classPath = path.join(tmpDir, 'Solution.class');
                if (fs.existsSync(classPath)) fs.unlinkSync(classPath);
            }
        } else {
            result.status = 'Unsupported Language';
            result.stderr = 'Language execution not implemented locally.';
        }
    } catch (e) {
        result.stderr = e.message;
        result.status = 'Runtime Error';
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Normalize outputs for comparison
    const actual = norm(result.stdout);
    const expected = norm(expectedOut);
    
    // Only accept if exactly matches after normalization
    let passed = false;
    if (result.status === 'Accepted') {
        passed = actual === expected;
        if (!passed) result.status = 'Wrong Answer';
    }

    return {
        status: { description: result.status },
        stdout: result.stdout,
        stderr: result.stderr,
        passed,
    };
}

function runHiddenSummary(passed, totalHidden) {
    return { label: 'Hidden cases', passed, total: totalHidden, detail: null };
}

// @route   POST api/execute/run
// @desc    Run code against sample test cases only (never exposes hidden I/O)
router.post('/run', async (req, res) => {
    const { code, language, questionId } = req.body;

    try {
        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        const samples = question.sampleTestCases || [];
        const results = [];

        for (let i = 0; i < samples.length; i++) {
            const testCase = samples[i];
            if (JUDGE0_KEY && JUDGE0_KEY !== 'YOUR_RAPIDAPI_KEY_HERE') {
                try {
                    const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                        source_code: code,
                        language_id: languageMap[String(language || 'javascript').toLowerCase()] || 63,
                        stdin: testCase.input,
                        expected_output: testCase.output,
                    }, {
                        headers: {
                            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                            'X-RapidAPI-Key': JUDGE0_KEY,
                        },
                    });
                    const d = response.data;
                    const desc = d.status?.description || 'Unknown';
                    const out = d.stdout != null ? d.stdout : '';
                    results.push({
                        caseType: 'sample',
                        index: i + 1,
                        status: { description: desc },
                        stdout: out,
                        stderr: d.stderr || '',
                        compile_output: d.compile_output,
                        passed: desc === 'Accepted',
                    });
                } catch (e) {
                    results.push({
                        caseType: 'sample',
                        index: i + 1,
                        status: { description: 'Runtime Error' },
                        stdout: '',
                        stderr: e.message,
                        passed: false,
                    });
                }
            } else {
                const m = runCodeLocally(code, language, testCase.input, testCase.output);
                results.push({
                    caseType: 'sample',
                    index: i + 1,
                    status: m.status,
                    stdout: m.stdout,
                    stderr: m.stderr,
                    passed: m.passed,
                });
            }
        }

        res.json({ results, mode: 'sample' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Execution error', error: err.message });
    }
});

// @route   POST api/execute/submit
// @desc    Submit against sample + hidden; response never includes hidden I/O
router.post('/submit', async (req, res) => {
    const { code, language, questionId, solveStartedAt } = req.body;

    try {
        let userId = req.body.userId;
        const token = req.header('x-auth-token');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user?.id) userId = decoded.user.id;
            } catch {
                /* ignore */
            }
        }
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Student not found' });
        const studentLab = user.assignedLab || user.selectedLab;
        if (studentLab && question.labName && studentLab !== question.labName) {
            return res.status(403).json({ message: 'You can only access questions from your assigned lab.' });
        }

        const currentTime = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: "Asia/Kolkata"
            })
        );
        
        let isLabOpen = true; // Default to open if no strict schedule is set

        if (question.unlockStartTime && question.unlockEndTime) {
            console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
            console.log("India Time:", currentTime);
            
            isLabOpen =
                currentTime >= new Date(question.unlockStartTime) &&
                currentTime <= new Date(question.unlockEndTime);
            
            console.log("Start Time:", new Date(question.unlockStartTime));
            console.log("End Time:", new Date(question.unlockEndTime));
            console.log("Lab Open:", isLabOpen);
        }

        if (!isLabOpen) {
            return res.status(403).json({
                message: 'Lab is currently closed. Submissions are only allowed during the assigned lab schedule.',
            });
        }

        const samples = question.sampleTestCases?.length ? question.sampleTestCases : [{ input: question.sampleInput || '', output: question.sampleOutput || '' }];
        const hidden = question.hiddenTestCases?.length ? question.hiddenTestCases : [{ input: question.hiddenInput || '', output: question.hiddenOutput || '' }];
        const allTestCases = [...samples, ...hidden];

        let passedCount = 0;
        const caseSummaries = [];
        const useJudge = JUDGE0_KEY && JUDGE0_KEY !== 'YOUR_RAPIDAPI_KEY_HERE';

        for (let i = 0; i < allTestCases.length; i++) {
            const tc = allTestCases[i];
            const isSample = i < samples.length;
            let ok = false;

            if (useJudge) {
                try {
                    const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                        source_code: code,
                        language_id: languageMap[String(language || 'javascript').toLowerCase()] || 63,
                        stdin: tc.input,
                        expected_output: tc.output,
                    }, {
                        headers: {
                            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                            'X-RapidAPI-Key': JUDGE0_KEY,
                        },
                    });
                    const desc = response.data.status?.description;
                    ok = desc === 'Accepted';
                } catch {
                    ok = false;
                }
            } else {
                const m = runCodeLocally(code, language, tc.input, tc.output);
                ok = m.passed;
            }

            if (ok) passedCount++;

            if (isSample) {
                caseSummaries.push({
                    caseType: 'sample',
                    index: i + 1,
                    passed: ok,
                    status: ok ? 'Accepted' : 'Wrong Answer',
                });
            } else {
                caseSummaries.push({
                    caseType: 'hidden',
                    index: i + 1 - samples.length,
                    passed: ok,
                    status: ok ? 'Passed' : 'Failed',
                });
            }
        }

        const overallStatus = passedCount === allTestCases.length ? 'Accepted' : 'Wrong Answer';
        const complexity = analyzeComplexity(code, language);

        // Calculate points based on acceptance and solve time
        let earnedPoints = 0;
        let basePoints = question.basePoints || 100;
        let timeBonus = 0;
        let accuracyBonus = 0;
        const previousAcceptedSameLanguage = await Submission.exists({
            user: userId,
            question: questionId,
            language,
            status: 'Accepted',
        });
        const attemptCount = await Submission.countDocuments({ user: userId, question: questionId });
        const solveTime = solveStartedAt ? Math.max(0, Math.floor((Date.now() - new Date(solveStartedAt).getTime()) / 1000)) : 0;

        if (overallStatus === 'Accepted' && !previousAcceptedSameLanguage) {
            earnedPoints = basePoints;
            
            const maxTimeForFullPoints = question.maxTimeForFullPoints || 60; // minutes
            const elapsedMinutes = solveTime > 0 ? solveTime / 60 : 0;
            timeBonus = Math.max(0, Math.round(20 * Math.max(0, 1 - elapsedMinutes / maxTimeForFullPoints)));
            accuracyBonus = Math.max(0, 5 - Math.min(5, attemptCount * 2));
            earnedPoints += timeBonus + accuracyBonus;
        }

        const submission = new Submission({
            user: userId,
            question: questionId,
            language,
            code,
            status: overallStatus,
            testCasesPassed: passedCount,
            totalTestCases: allTestCases.length,
            sampleTestsPassed: caseSummaries.filter((c) => c.caseType === 'sample' && c.passed).length,
            hiddenTestsPassed: caseSummaries.filter((c) => c.caseType === 'hidden' && c.passed).length,
            timeComplexity: complexity.time,
            spaceComplexity: complexity.space,
            basePoints,
            timeBonus,
            accuracyBonus,
            earnedPoints,
            solveTime,
            attemptNumber: attemptCount + 1,
            isPreviouslyAccepted: Boolean(previousAcceptedSameLanguage)
        });

        await submission.save();

        if (user) {
            user.submissions.push(submission._id);
            user.totalSubmissions = (user.totalSubmissions || 0) + 1;
            
            if (overallStatus === 'Accepted') {
                user.acceptedSubmissions = (user.acceptedSubmissions || 0) + 1;
                user.totalPoints = (user.totalPoints || 0) + earnedPoints;
                if (!previousAcceptedSameLanguage) {
                    user.completedTasks = (user.completedTasks || 0) + 1;
                }
            }

            user.successRate = user.totalSubmissions > 0
                ? Math.round((user.acceptedSubmissions / user.totalSubmissions) * 100)
                : 0;

            const weekIndex = (user.weeklyProgress || []).findIndex((w) => Number(w.week) === Number(question.weekNumber));
            const totalWeekTasks = await Question.countDocuments({ labName: question.labName, weekNumber: question.weekNumber });
            if (weekIndex >= 0) {
                const week = user.weeklyProgress[weekIndex];
                week.points = (week.points || 0) + earnedPoints;
                if (overallStatus === 'Accepted' && !previousAcceptedSameLanguage) {
                    week.tasksCompleted = (week.tasksCompleted || 0) + 1;
                }
                week.totalTasks = totalWeekTasks;
                week.progress = totalWeekTasks > 0 ? Math.round((week.tasksCompleted / totalWeekTasks) * 100) : 0;
            } else {
                const completedNow = overallStatus === 'Accepted' && !previousAcceptedSameLanguage ? 1 : 0;
                user.weeklyProgress.push({
                    week: question.weekNumber,
                    tasksCompleted: completedNow,
                    totalTasks: totalWeekTasks,
                    progress: totalWeekTasks > 0 ? Math.round((completedNow / totalWeekTasks) * 100) : 0,
                    points: earnedPoints,
                });
            }

            const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
            const monthIndex = (user.monthlyProgress || []).findIndex((m) => m.month === monthName);
            if (monthIndex >= 0) {
                user.monthlyProgress[monthIndex].points = (user.monthlyProgress[monthIndex].points || 0) + earnedPoints;
                user.monthlyProgress[monthIndex].submissions = (user.monthlyProgress[monthIndex].submissions || 0) + 1;
            } else {
                user.monthlyProgress.push({ month: monthName, points: earnedPoints, submissions: 1 });
            }
            
            await user.save();
            user.rank = await User.countDocuments({ totalPoints: { $gt: user.totalPoints || 0 } }) + 1;
            await user.save();
        }

        const populatedSubmission = await Submission.findById(submission._id)
            .populate('user', 'name regNo')
            .populate('question', 'title');

        // Create and persist notification
        const notificationText = overallStatus === 'Accepted' 
            ? `🎉 Submission accepted for ${question.title}! Earned ${earnedPoints} points!` 
            : `Submission rejected for ${question.title}. Try again!`;
        const notificationType = overallStatus === 'Accepted' ? 'success' : 'danger';
        
        const newNotification = new Notification({
            userId,
            text: notificationText,
            type: notificationType,
            unread: true
        });
        await newNotification.save();

        const leaderboard = await User.find()
            .select('name regNo totalPoints rank assignedLab selectedLab')
            .sort({ totalPoints: -1, updatedAt: 1 })
            .limit(10)
            .lean();

        const pointsPayload = {
            userId,
            questionId,
            status: overallStatus,
            accepted: overallStatus === 'Accepted',
            questionTitle: question.title,
            basePoints,
            speedBonus: timeBonus,
            timeBonus,
            accuracyBonus,
            earnedPoints,
            totalUserPoints: user?.totalPoints || 0,
            rank: user?.rank || 0,
            weeklyProgress: user?.weeklyProgress || [],
            monthlyProgress: user?.monthlyProgress || [],
            leaderboard,
            previouslyAccepted: Boolean(previousAcceptedSameLanguage),
        };

        if (req.app.locals.io) {
            req.app.locals.io.emit('submissionAdded', populatedSubmission);
            req.app.locals.io.emit('progressUpdated', user);
            if (overallStatus === 'Accepted') {
                req.app.locals.io.emit('pointsAwarded', pointsPayload);
            }
            req.app.locals.io.emit('newNotification', {
                userId,
                notification: newNotification
            });
        }

        res.json({
            status: overallStatus,
            testCasesPassed: passedCount,
            totalTestCases: allTestCases.length,
            samplePassed: caseSummaries.filter((c) => c.caseType === 'sample' && c.passed).length,
            sampleTotal: samples.length,
            hiddenPassed: caseSummaries.filter((c) => c.caseType === 'hidden' && c.passed).length,
            hiddenTotal: hidden.length,
            caseSummaries,
            timeComplexity: complexity.time,
            spaceComplexity: complexity.space,
            submissionId: submission._id,
            earnedPoints,
            basePoints,
            speedBonus: timeBonus,
            timeBonus,
            accuracyBonus,
            totalUserPoints: user?.totalPoints || 0,
            rank: user?.rank || 0,
            leaderboard
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Submission error' });
    }
});

function analyzeComplexity(code, language) {
    let time = 'O(n)';
    let space = 'O(1)';
    const c = String(code || '');
    if (c.includes('for') && c.includes('for', c.indexOf('for') + 1)) {
        time = 'O(n²)';
    } else if (c.includes('while') || c.includes('for')) {
        time = 'O(n)';
    } else {
        time = 'O(1)';
    }
    if (c.includes('Array') || c.includes('ArrayList') || c.includes('vector') || c.includes('[ ]')) {
        space = 'O(n)';
    }
    return { time, space };
}

module.exports = router;
