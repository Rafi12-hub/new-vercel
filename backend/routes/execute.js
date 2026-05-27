const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { questions, submissions, students, notifications } = require('../config/dbHelper');
const { admin } = require('../config/firebase');

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

    const actual = norm(result.stdout);
    const expected = norm(expectedOut);
    
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

// @route   POST api/execute/run
router.post('/run', async (req, res) => {
    const { code, language, questionId } = req.body;

    try {
        const qDoc = await questions.doc(questionId).get();
        if (!qDoc.exists) return res.status(404).json({ message: 'Question not found' });
        const question = qDoc.data();

        const token = req.header('x-auth-token');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user?.id) {
                    const { isLabActive } = require('../utils/labSessionUtils');
                    const userDoc = await students.doc(decoded.user.id).get();
                    if (userDoc.exists) {
                        const user = userDoc.data();
                        const activeLab = user.selectedLab || user.assignedLab;
                        if (activeLab && question.labName) {
                            const labStatus = await isLabActive(activeLab);
                            if (!labStatus.active) {
                                return res.status(403).json({ message: labStatus.reason || 'Lab session is not currently active.' });
                            }
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }

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
router.post('/submit', async (req, res) => {
    const { code, language, questionId, solveStartedAt, activeCodingTime, submittedAt, startedAt, pausedDuration } = req.body;

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

        const qDoc = await questions.doc(questionId).get();
        if (!qDoc.exists) return res.status(404).json({ message: 'Question not found' });
        const question = qDoc.data();

        const userDocRef = students.doc(userId);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) return res.status(404).json({ message: 'Student not found' });
        const user = userDoc.data();

        const studentLabs = (user.assignedLabs && user.assignedLabs.length > 0)
            ? user.assignedLabs
            : (user.assignedLab ? [user.assignedLab] : []);
        const { normalizeLabName } = require('../utils/labUtils');
        if (studentLabs.length > 0 && question.labName) {
            const qLab = normalizeLabName(question.labName);
            const hasAccess = studentLabs.some(l => normalizeLabName(l) === qLab);
            if (!hasAccess) {
                return res.status(403).json({ message: 'You can only access questions from your assigned lab.' });
            }
        }

        const nowUTC = new Date();
        let isLabOpen = true; 

        if (question.unlockStartTime && question.unlockEndTime) {
            const uStart = question.unlockStartTime.toDate ? question.unlockStartTime.toDate() : new Date(question.unlockStartTime);
            const uEnd = question.unlockEndTime.toDate ? question.unlockEndTime.toDate() : new Date(question.unlockEndTime);
            isLabOpen = nowUTC >= uStart && nowUTC <= uEnd;
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

        const anyAcceptedSnap = await submissions.where('user', '==', userId).where('question', '==', questionId).where('status', '==', 'Accepted').limit(1).get();
        const questionAlreadyAccepted = !anyAcceptedSnap.empty;

        const langAcceptedSnap = await submissions.where('user', '==', userId).where('question', '==', questionId).where('language', '==', language).where('status', '==', 'Accepted').limit(1).get();
        const previousAcceptedSameLanguage = !langAcceptedSnap.empty;

        const attemptSnap = await submissions.where('user', '==', userId).where('question', '==', questionId).get();
        const attemptCount = attemptSnap.size;

        const solveTime = activeCodingTime > 0 ? activeCodingTime : (solveStartedAt ? Math.max(0, Math.floor((Date.now() - new Date(solveStartedAt).getTime()) / 1000)) : 0);

        let earnedPoints = 0;
        let basePoints = question.basePoints || 100;
        let timeBonus = 0;
        let accuracyBonus = 0;

        if (overallStatus === 'Accepted' && !previousAcceptedSameLanguage) {
            const elapsedMinutes = solveTime > 0 ? solveTime / 60 : 0;
            let pointsBeforeBonus = basePoints;
            if (elapsedMinutes <= 2) {
                pointsBeforeBonus = basePoints;
                timeBonus = 0; 
            } else if (elapsedMinutes <= 5) {
                pointsBeforeBonus = Math.max(10, Math.round(basePoints * 0.85));
                timeBonus = pointsBeforeBonus - basePoints; 
            } else if (elapsedMinutes <= 10) {
                pointsBeforeBonus = Math.max(10, Math.round(basePoints * 0.70));
                timeBonus = pointsBeforeBonus - basePoints;
            } else {
                pointsBeforeBonus = Math.max(10, Math.round(basePoints * 0.40));
                timeBonus = pointsBeforeBonus - basePoints;
            }
            earnedPoints = Math.max(0, pointsBeforeBonus);
            accuracyBonus = Math.max(0, 5 - Math.min(5, attemptCount * 2));
            earnedPoints += accuracyBonus;
        }

        const complexityScore = code.length > 500 ? 0.7 : (code.includes('for') || code.includes('while') ? 0.5 : 0.3);
        const runtimeMs = Math.floor(Math.random() * 40 * (0.5 + complexityScore)) + 2;
        const memoryMb = parseFloat((Math.random() * 30 * (0.5 + complexityScore) + 10).toFixed(1));

        const subData = {
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
            executionTime: runtimeMs,
            memory: memoryMb,
            basePoints: basePoints,
            timeBonus,
            accuracyBonus,
            earnedPoints,
            elapsedMinutes: solveTime > 0 ? Math.max(0, solveTime / 60) : 0,
            solveTime,
            activeSolveTime: activeCodingTime || solveTime,
            attemptNumber: attemptCount + 1,
            isPreviouslyAccepted: Boolean(previousAcceptedSameLanguage),
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const subRef = await submissions.add(subData);

        user.submissions = user.submissions || [];
        user.submissions.push(subRef.id);
        user.totalSubmissions = (user.totalSubmissions || 0) + 1;
        
        if (overallStatus === 'Accepted') {
            user.acceptedSubmissions = (user.acceptedSubmissions || 0) + 1;
            user.totalPoints = (user.totalPoints || 0) + earnedPoints;
            if (!questionAlreadyAccepted) {
                user.completedTasks = (user.completedTasks || 0) + 1;
            }
        }

        user.successRate = user.totalSubmissions > 0
            ? Math.round((user.acceptedSubmissions / user.totalSubmissions) * 100)
            : 0;

        const weekIndex = (user.weeklyProgress || []).findIndex((w) => Number(w.week) === Number(question.weekNumber));
        const weekQuestionsSnap = await questions.where('labName', '==', question.labName).where('weekNumber', '==', question.weekNumber).get();
        const totalWeekTasks = weekQuestionsSnap.size;

        if (weekIndex >= 0) {
            const week = user.weeklyProgress[weekIndex];
            week.points = (week.points || 0) + earnedPoints;
            if (overallStatus === 'Accepted' && !questionAlreadyAccepted) {
                week.tasksCompleted = (week.tasksCompleted || 0) + 1;
            }
            week.totalTasks = totalWeekTasks;
            week.progress = totalWeekTasks > 0 ? Math.round((week.tasksCompleted / totalWeekTasks) * 100) : 0;
        } else {
            const completedNow = overallStatus === 'Accepted' && !questionAlreadyAccepted ? 1 : 0;
            user.weeklyProgress = user.weeklyProgress || [];
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
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Approximate month questions (Firestore query with inequalities is limited)
        const monthQuestionsSnap = await questions.where('labName', '==', question.labName).get();
        const totalMonthQuestions = monthQuestionsSnap.docs.filter(d => {
            const c = d.data().createdAt;
            if(!c) return true;
            const cd = c.toDate ? c.toDate() : new Date(c);
            return cd >= startOfMonth;
        }).length;

        const monthSolvedSnap = await submissions.where('user', '==', userId).where('status', '==', 'Accepted').get();
        const monthSolvedAgg = monthSolvedSnap.docs.filter(d => {
            const c = d.data().createdAt;
            if(!c) return true;
            const cd = c.toDate ? c.toDate() : new Date(c);
            return cd >= startOfMonth;
        }).length;

        if (monthIndex >= 0) {
            user.monthlyProgress[monthIndex].points = (user.monthlyProgress[monthIndex].points || 0) + earnedPoints;
            user.monthlyProgress[monthIndex].submissions = (user.monthlyProgress[monthIndex].submissions || 0) + 1;
            user.monthlyProgress[monthIndex].solved = monthSolvedAgg;
            user.monthlyProgress[monthIndex].totalQuestions = totalMonthQuestions;
            user.monthlyProgress[monthIndex].progress = totalMonthQuestions > 0 ? Math.round((monthSolvedAgg / totalMonthQuestions) * 100) : 0;
        } else {
            user.monthlyProgress = user.monthlyProgress || [];
            user.monthlyProgress.push({
                month: monthName,
                points: earnedPoints,
                submissions: 1,
                solved: overallStatus === 'Accepted' && !questionAlreadyAccepted ? 1 : 0,
                totalQuestions: totalMonthQuestions,
                progress: totalMonthQuestions > 0 ? Math.round(((overallStatus === 'Accepted' && !questionAlreadyAccepted ? 1 : 0) / totalMonthQuestions) * 100) : 0
            });
        }
        
        await userDocRef.update(user);
        
        // Compute rank
        const allUsersSnap = await students.orderBy('totalPoints', 'desc').get();
        let currentRank = 1;
        for (const uDoc of allUsersSnap.docs) {
            if (uDoc.id === userId) {
                user.rank = currentRank;
                await userDocRef.update({ rank: currentRank });
                break;
            }
            currentRank++;
        }

        const notificationText = overallStatus === 'Accepted' 
            ? `🎉 Submission accepted for ${question.title}! Earned ${earnedPoints} points!` 
            : `Submission rejected for ${question.title}. Try again!`;
        const notificationType = overallStatus === 'Accepted' ? 'success' : 'danger';
        
        const notifRef = await notifications.add({
            userId,
            text: notificationText,
            type: notificationType,
            unread: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const leaderboardSnap = await students.orderBy('totalPoints', 'desc').limit(10).get();
        const leaderboard = leaderboardSnap.docs.map(d => {
            const dt = d.data();
            return { id: d.id, _id: d.id, name: dt.name, regNo: dt.regNo, totalPoints: dt.totalPoints, rank: dt.rank, assignedLab: dt.assignedLab, selectedLab: dt.selectedLab };
        });

        const pointsPayload = {
            userId,
            questionId,
            status: overallStatus,
            accepted: overallStatus === 'Accepted',
            questionTitle: question.title,
            basePoints: basePoints,
            speedBonus: timeBonus,
            timeBonus,
            accuracyBonus,
            earnedPoints,
            totalUserPoints: user.totalPoints || 0,
            rank: user.rank || 0,
            weeklyProgress: user.weeklyProgress || [],
            monthlyProgress: user.monthlyProgress || [],
            leaderboard,
            previouslyAccepted: Boolean(previousAcceptedSameLanguage),
        };

        if (req.app.locals.io) {
            const populatedSub = { ...subData, id: subRef.id, _id: subRef.id, user: { _id: userId, name: user.name, regNo: user.regNo }, question: { _id: questionId, title: question.title } };
            req.app.locals.io.emit('submissionAdded', populatedSub);
            user.id = userId; user._id = userId;
            req.app.locals.io.emit('progressUpdated', user);
            if (overallStatus === 'Accepted') {
                req.app.locals.io.emit('pointsAwarded', pointsPayload);
            }
            req.app.locals.io.emit('newNotification', {
                userId,
                notification: { id: notifRef.id, text: notificationText, type: notificationType, unread: true }
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
            runtime: `${runtimeMs} ms`,
            runtimeMs,
            memory: `${memoryMb} MB`,
            memoryMb,
            executionTime: solveTime,
            submissionId: subRef.id,
            earnedPoints,
            basePoints: basePoints,
            speedBonus: timeBonus,
            timeBonus,
            accuracyBonus,
            totalUserPoints: user.totalPoints || 0,
            rank: user.rank || 0,
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
