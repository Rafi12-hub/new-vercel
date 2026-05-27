const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { questions, students, submissions, weeklyTasks } = require('../config/dbHelper');
const { normalizeLabName } = require('../utils/labUtils');
const { admin } = require('../config/firebase');

async function populateWeeklyTask(qData) {
    if (qData.weeklyTask) {
        const wtDoc = await weeklyTasks.doc(qData.weeklyTask).get();
        if (wtDoc.exists) {
            const wtData = wtDoc.data();
            wtData.id = wtDoc.id;
            wtData._id = wtDoc.id;
            qData.weeklyTask = wtData;
        }
    }
    return qData;
}

router.get('/', async (req, res) => {
    try {
        let isStudent = false;
        let isAdmin = false;
        let studentLabs = [];

        const token = req.header('x-auth-token');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user) {
                    isStudent = true;
                    const stDoc = await students.doc(decoded.user.id).get();
                    if (stDoc.exists) {
                        const student = stDoc.data();
                        const labs = (student.assignedLabs && student.assignedLabs.length > 0)
                            ? student.assignedLabs
                            : (student.assignedLab ? [student.assignedLab] : []);
                        studentLabs = labs.map(l => normalizeLabName(l)).filter(Boolean);
                    }
                } else if (decoded.admin) {
                    isAdmin = true;
                }
            } catch (e) {
                // ignore
            }
        }

        let query = questions;
        if (isStudent) {
            query = query.where('published', '==', true).where('visibleToStudents', '==', true);
            if (studentLabs.length > 0) {
                query = query.where('labName', 'in', studentLabs);
            }
        } else if (req.query.labName) {
            query = query.where('labName', '==', normalizeLabName(req.query.labName));
        }

        const snapshot = await query.orderBy('weekNumber', 'asc').orderBy('createdAt', 'desc').get();
        const results = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            data.id = doc.id;
            data._id = doc.id;
            delete data.hiddenTestCases;
            await populateWeeklyTask(data);
            results.push(data);
        }
        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/student', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.user) return res.status(403).json({ message: 'Student access required' });
        
        const stDoc = await students.doc(decoded.user.id).get();
        if (!stDoc.exists) return res.status(404).json({ message: 'Student not found' });
        const student = stDoc.data();

        const labs = (student.assignedLabs && student.assignedLabs.length > 0)
            ? student.assignedLabs
            : (student.assignedLab ? [student.assignedLab] : []);
        const normalizedLabs = labs.map(l => normalizeLabName(l)).filter(Boolean);

        let query = questions.where('published', '==', true).where('visibleToStudents', '==', true);
        if (normalizedLabs.length > 0) {
            query = query.where('labName', 'in', normalizedLabs);
        }

        const snapshot = await query.orderBy('weekNumber', 'asc').orderBy('createdAt', 'desc').get();
        const results = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            data.id = doc.id;
            data._id = doc.id;
            delete data.hiddenTestCases;
            await populateWeeklyTask(data);
            results.push(data);
        }

        res.json({
            questions: results,
            studentLabs: labs,
            normalizedLabs,
            studentYear: student.classAndYear,
            studentSection: student.section,
            totalPublished: results.length
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const qDoc = await questions.doc(req.params.id).get();
        if (!qDoc.exists) return res.status(404).json({ message: 'Question not found' });
        const question = qDoc.data();
        question.id = qDoc.id;
        question._id = qDoc.id;
        await populateWeeklyTask(question);

        const token = req.header('x-auth-token');
        let isStaff = false;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                isStaff = !!(decoded && decoded.admin);
            } catch { /* ignore */ }
        }

        if (!isStaff) {
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.user?.id) {
                        const stDoc = await students.doc(decoded.user.id).get();
                        const student = stDoc.data();
                        const assignedLabs = (student?.assignedLabs && student.assignedLabs.length > 0)
                            ? student.assignedLabs.map(l => normalizeLabName(l))
                            : (student?.assignedLab ? [normalizeLabName(student.assignedLab)] : []);
                        const questionLab = normalizeLabName(question.labName);
                        if (assignedLabs.length > 0 && questionLab && !assignedLabs.includes(questionLab)) {
                            return res.status(403).json({ message: 'You can only access questions from your assigned lab.' });
                        }
                    }
                } catch { /* ignore */ }
            }
            const hidden = question.hiddenTestCases || [];
            question.hiddenTestCaseCount = hidden.length;
            delete question.hiddenTestCases;
            
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded.user?.id) {
                        const subsSnap = await submissions.where('user', '==', decoded.user.id).where('question', '==', question.id).where('status', '==', 'Accepted').get();
                        question.acceptedLanguages = [...new Set(subsSnap.docs.map(s => s.data().language))];
                    }
                } catch {
                    question.acceptedLanguages = [];
                }
            } else {
                question.acceptedLanguages = [];
            }
        }
        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/create', async (req, res) => {
    try {
        const {
            title, description, inputFormat, outputFormat, constraints,
            sampleInput, sampleOutput, hiddenInput, hiddenOutput,
            difficulty, primaryLanguage, weekNumber, isFinalWeek, tags,
            unlockStartTime, unlockEndTime, labName, basePoints,
            pointsRewarded, maxTimeForFullPoints
        } = req.body;

        if (!title || !description || !inputFormat || !outputFormat || !sampleInput || !sampleOutput || !primaryLanguage || !weekNumber) {
            return res.status(400).json({ message: 'Please fill all required fields' });
        }

        const normalizedLab = normalizeLabName(labName || 'C');

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
            labName: normalizedLab,
            published: true,
            visibleToStudents: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const qRef = await questions.add(questionPayload);
        const qDoc = await qRef.get();
        const question = qDoc.data();
        question.id = qDoc.id;
        question._id = qDoc.id;

        if (weekNumber) {
            const wtSnap = await weeklyTasks.where('weekNumber', '==', Number(weekNumber)).where('labName', '==', normalizedLab).limit(1).get();
            if (!wtSnap.empty) {
                const taskDoc = wtSnap.docs[0];
                const task = taskDoc.data();
                task.questions = task.questions || [];
                task.questions.push(qRef.id);
                if (typeof isFinalWeek === 'boolean') task.isFinalWeek = isFinalWeek;
                if (unlockStartTime) task.unlockDateTime = new Date(unlockStartTime);
                if (unlockEndTime) task.deadlineDateTime = new Date(unlockEndTime);
                await weeklyTasks.doc(taskDoc.id).update(task);
                
                await qRef.update({ weeklyTask: taskDoc.id });
                question.weeklyTask = taskDoc.id;
            } else {
                const newTaskRef = await weeklyTasks.add({
                    weekNumber: Number(weekNumber),
                    labName: normalizedLab,
                    unlockDateTime: unlockStartTime ? new Date(unlockStartTime) : null,
                    deadlineDateTime: unlockEndTime ? new Date(unlockEndTime) : null,
                    questions: [qRef.id],
                    isUnlocked: unlockStartTime ? new Date(unlockStartTime) <= new Date() : false,
                    isFinalWeek: isFinalWeek || false
                });
                await qRef.update({ weeklyTask: newTaskRef.id });
                question.weeklyTask = newTaskRef.id;
            }
        }

        if (req.app.locals.io) {
            req.app.locals.io.emit('questionAdded', question);
        }

        res.status(201).json(question);
    } catch (err) {
        console.error('Error in /api/questions/create:', err);
        res.status(500).json({ message: 'Error: ' + err.message });
    }
});

module.exports = router;
