const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { students, questions, weeklyTasks, submissions, violations } = require('../config/dbHelper');
const { normalizeLabName } = require('../utils/labUtils');
const axios = require('axios');

// =====================================
// Admin Authentication & Management Routes
// =====================================

// Helper to authenticate using Firebase Auth REST API
async function authenticateWithFirebase(email, password) {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
        throw new Error('FIREBASE_API_KEY is not set in environment variables');
    }
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const response = await axios.post(url, {
        email,
        password,
        returnSecureToken: true
    });
    return response.data;
}

router.post('/login', async (req, res) => {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        let authData;
        try {
            authData = await authenticateWithFirebase(normalizedEmail, password);
        } catch (authErr) {
            const fbError = authErr.response?.data?.error || {};
            const fbMessage = fbError.message || authErr.message;
            console.error('[ADMIN LOGIN] Firebase auth error:', fbMessage);
            let userMessage = 'Invalid credentials';
            if (fbMessage.includes('EMAIL_NOT_FOUND') || fbMessage.includes('user-not-found')) {
                userMessage = 'Account not found in Firebase Auth. Create the user in Firebase Console first.';
            } else if (fbMessage.includes('INVALID_PASSWORD') || fbMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
                userMessage = 'Wrong password. Check the password in Firebase Console.';
            } else if (fbMessage.includes('INVALID_EMAIL')) {
                userMessage = 'Invalid email format.';
            } else if (fbMessage.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
                userMessage = 'Too many failed attempts. Account temporarily locked.';
            }
            return res.status(400).json({ message: userMessage, debug: fbMessage });
        }

        const uid = authData.localId;
        const firebaseEmail = authData.email || normalizedEmail;
        console.log(`[ADMIN LOGIN] Firebase Auth OK: uid=${uid}, email=${firebaseEmail}`);
        
        // Fetch role from Firestore users collection
        let userDoc = await db.collection('users').doc(uid).get();
        
        // Fallback: look up by email if uid lookup fails
        if (!userDoc.exists) {
            console.log(`[ADMIN LOGIN] No doc found by uid ${uid}, trying email lookup...`);
            const emailQuery = await db.collection('users').where('email', '==', firebaseEmail).get();
            if (!emailQuery.empty) {
                userDoc = emailQuery.docs[0];
                console.log(`[ADMIN LOGIN] Found user doc by email: ${userDoc.id}`);
            }
        }

        if (!userDoc.exists) {
            console.error(`[ADMIN LOGIN] FAILED: No Firestore doc for uid=${uid} or email=${firebaseEmail}`);
            return res.status(404).json({
                message: 'User role not found in Firestore. Create a document in the "users" collection with matching uid or email.',
                debug: { uid, email: firebaseEmail }
            });
        }
        const adminData = userDoc.data();
        console.log(`[ADMIN LOGIN] Firestore doc found: role=${adminData.role}, name=${adminData.name}`);

        // Normalize role to lowercase for consistency
        const normalizedRole = adminData.role ? adminData.role.toLowerCase() : '';
        adminData.role = normalizedRole;

        // Check account is active
        if (adminData.isActive === false) {
            return res.status(403).json({ message: 'Account is disabled. Contact HOD.' });
        }

        // Validate expectedRole matches actual role
        if (expectedRole && normalizedRole !== expectedRole.toLowerCase()) {
            console.error(`[ADMIN LOGIN] Role mismatch: expected="${expectedRole}", actual="${normalizedRole}"`);
            return res.status(400).json({
                message: `This account has role "${normalizedRole}" but you selected "${expectedRole}". Select the correct portal.`,
                debug: { expectedRole, actualRole: normalizedRole }
            });
        }

        const payload = { 
            admin: { 
                id: uid, 
                role: normalizedRole, 
                assignedLab: adminData.assignedLab || adminData.department 
            } 
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) {
                console.error(` [JWT ERROR] ${err.message}`);
                throw err;
            }
            res.json({ 
                token, 
                role: normalizedRole,
                admin: { 
                    id: uid, 
                    email: adminData.email, 
                    role: normalizedRole, 
                    assignedLab: adminData.assignedLab,
                    name: adminData.name
                } 
            });
        });
    } catch (err) {
        console.error(` [SERVER ERROR] ${err.message}`);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// Admin Auth Middleware
const authAdmin = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded.admin;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const isHodRole = (role) => role === 'hod';

// Lab admin: set recurring weekly unlock (scheduler uses weeklyUnlockDay + weeklyUnlockTime)
router.put('/me/weekly-unlock', authAdmin, async (req, res) => {
    try {
        if (req.admin.role !== 'labadmin') {
            return res.status(403).json({ message: 'Only lab admins can update weekly unlock schedule' });
        }
        const { weeklyUnlockDay, weeklyUnlockTime } = req.body;
        if (!weeklyUnlockDay || !weeklyUnlockTime) {
            return res.status(400).json({ message: 'weeklyUnlockDay and weeklyUnlockTime are required' });
        }
        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Not found' });
        admin.weeklyUnlockDay = String(weeklyUnlockDay).trim();
        admin.weeklyUnlockTime = String(weeklyUnlockTime).trim();
        await admin.save();
        res.json({
            weeklyUnlockDay: admin.weeklyUnlockDay,
            weeklyUnlockTime: admin.weeklyUnlockTime,
            assignedLab: admin.assignedLab,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/me
// @desc    Get current admin data
router.get('/me', authAdmin, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.admin.id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(userDoc.data());
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get Dashboard Stats
router.get('/stats', authAdmin, async (req, res) => {
    try {
        let studentQuery = {};
        let questionQuery = {};
        
        const isStaffRole = ['labadmin', 'faculty'].includes(req.admin.role);
        if (isStaffRole) {
            studentQuery.$or = [{ assignedLab: req.admin.assignedLab }, { selectedLab: req.admin.assignedLab }];
            questionQuery.labName = req.admin.assignedLab;
        }

        const students = await User.find(studentQuery);
        const questionsCount = await Question.countDocuments(questionQuery);
        const allQuestions = await Question.find(questionQuery).select('_id');
        const questionIds = allQuestions.map(q => q._id.toString());
        
        // Filter submissions to only those matching the questions the admin is allowed to see
        let submissions = await Submission.find().populate('user', 'name regNo assignedLab selectedLab').populate('question', 'title labName').sort({ submittedAt: -1 });
        if (isStaffRole) {
            submissions = submissions.filter(s => s.question && s.question.labName === req.admin.assignedLab && s.user && (s.user.assignedLab || s.user.selectedLab) === req.admin.assignedLab);
        }
        
        const activeTasks = await WeeklyTask.find().sort({ weekNumber: 1 });

        // Calculate current week
        const now = new Date();
        const unlockedTasks = activeTasks.filter(t => t.isUnlocked);
        const currentTask = unlockedTasks[unlockedTasks.length - 1];
        
        let completedCurrentWeek = 0;
        let pendingCurrentWeek = 0;

        if (currentTask && currentTask.questions.length > 0) {
            // Only consider questions for this task that the admin has access to
            const taskQuestionsForAdmin = currentTask.questions.filter(qId => questionIds.includes(qId.toString()));
            
            if (taskQuestionsForAdmin.length > 0) {
                for (const student of students) {
                    const studentSubmissions = submissions.filter(s => 
                        s.user && s.user._id.toString() === student._id.toString() && 
                        s.status === 'Accepted' && 
                        s.question && // Null check
                        taskQuestionsForAdmin.includes(s.question._id.toString())
                    );
                    
                    const uniqueSolved = new Set(studentSubmissions.map(s => s.question._id.toString()));
                    if (uniqueSolved.size === taskQuestionsForAdmin.length) {
                        completedCurrentWeek++;
                    } else {
                        pendingCurrentWeek++;
                    }
                }
            } else {
                 pendingCurrentWeek = students.length;
            }
        } else {
            pendingCurrentWeek = students.length;
        }

        // Weekly analytics for charts
        const weeklyCompletionData = activeTasks.map(task => {
            let completed = 0;
            const taskQuestionsForAdmin = task.questions.filter(qId => questionIds.includes(qId.toString()));
            
            if (taskQuestionsForAdmin.length > 0) {
                students.forEach(student => {
                    const studentSubs = submissions.filter(s => 
                        s.user && s.user._id.toString() === student._id.toString() && 
                        s.status === 'Accepted' && 
                        s.question && // Null check
                        taskQuestionsForAdmin.includes(s.question._id.toString())
                    );
                    const uniqueSolved = new Set(studentSubs.map(s => s.question._id.toString()));
                    if (uniqueSolved.size === taskQuestionsForAdmin.length) {
                        completed++;
                    }
                });
            }
            return {
                name: `Week ${task.weekNumber}`,
                completed: completed,
                pending: students.length - completed
            };
        });

        // Generate HOD Reports
        const yearWise = {};
        const sectionWise = {};
        const labWise = {};

        students.forEach(student => {
            // Year-wise
            const year = student.classAndYear || 'Unknown Year';
            if (!yearWise[year]) yearWise[year] = { students: 0, active: 0, solved: 0, pending: 0 };
            yearWise[year].students++;

            // Section-wise
            const section = student.section || 'Unknown Section';
            if (!sectionWise[section]) sectionWise[section] = { students: 0, solved: 0, pending: 0 };
            sectionWise[section].students++;

            // Lab-wise
            const lab = student.assignedLab || student.selectedLab || 'Unknown Lab';
            if (!labWise[lab]) labWise[lab] = { students: 0, solved: 0, pending: 0 };
            labWise[lab].students++;
        });

        // Compute metrics per student
        submissions.filter(s => s.status === 'Accepted').forEach(s => {
            const student = s.user;
            if (!student) return;
            const year = student.classAndYear || 'Unknown Year';
            const section = student.section || 'Unknown Section';
            const lab = student.assignedLab || student.selectedLab || 'Unknown Lab';

            if (yearWise[year]) {
                yearWise[year].solved = (yearWise[year].solved || 0) + 1;
                yearWise[year].active = (yearWise[year].active || 0) + 1;
            } else {
                yearWise[year] = { students: 0, active: 1, solved: 1, pending: 0 };
            }
            if (sectionWise[section]) {
                sectionWise[section].solved = (sectionWise[section].solved || 0) + 1;
            } else {
                sectionWise[section] = { students: 0, solved: 1, pending: 0 };
            }
            if (labWise[lab]) {
                labWise[lab].solved = (labWise[lab].solved || 0) + 1;
            } else {
                labWise[lab] = { students: 0, solved: 1, pending: 0 };
            }
        });

        // Upcoming Unlocks
        const upcomingTasks = await WeeklyTask.find({ 
            isUnlocked: false,
            $or: [
                { unlockDateTime: { $gt: now } },
                { unlockDateTime: null }
            ]
        }).sort({ weekNumber: 1 }).limit(10);

        const facultySchedules = await Admin.find({ 
            role: { $in: ['faculty', 'labadmin'] },
            labDay: { $ne: null }
        }).select('name subject assignedLab labDay startTime endTime');

        res.json({ 
            studentsCount: students.length, 
            questionsCount, 
            submissionsCount: submissions.length, 
            activeTasks: activeTasks.length,
            completedCurrentWeek,
            pendingCurrentWeek,
            weeklyCompletionData,
            upcomingUnlocks: upcomingTasks.map(t => ({
                weekNumber: t.weekNumber,
                labName: t.labName,
                unlockAt: t.unlockDateTime || "According to Lab Schedule"
            })),
            facultySchedules,
            latestSubmissions: submissions.slice(0, 20).map(sub => {
                // Find all submissions for this user & question
                const userQuestionSubs = submissions.filter(s => s.user && s.question && s.user._id.toString() === sub.user._id.toString() && s.question._id.toString() === sub.question._id.toString());
                const langs = [...new Set(userQuestionSubs.map(s => s.language))].filter(Boolean);
                return {
                    ...sub.toObject(),
                    attempts: userQuestionSubs.length,
                    languagesUsed: langs
                };
            }),
            yearWise: Object.keys(yearWise).map(k => ({ name: k, ...yearWise[k] })),
            sectionWise: Object.keys(sectionWise).map(k => ({ name: k, ...sectionWise[k] })),
            labWise: Object.keys(labWise).map(k => ({ name: k, ...labWise[k] }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Weekly Tasks Routes
router.post('/tasks', authAdmin, async (req, res) => {
    try {
        const { weekNumber, unlockDateTime, deadlineDateTime, labName, questions, isFinalWeek } = req.body;
        
        // Find existing task for this week and lab or create new
        let task = await WeeklyTask.findOne({ weekNumber, labName: labName || req.admin.assignedLab });
        
        if (task) {
            if (unlockDateTime) task.unlockDateTime = new Date(unlockDateTime);
            if (deadlineDateTime) task.deadlineDateTime = new Date(deadlineDateTime);
            if (questions) task.questions = questions;
            if (typeof isFinalWeek === 'boolean') task.isFinalWeek = isFinalWeek;
            await task.save();
        } else {
            task = new WeeklyTask({ 
                weekNumber, 
                labName: labName || req.admin.assignedLab,
                unlockDateTime: unlockDateTime ? new Date(unlockDateTime) : null,
                deadlineDateTime: deadlineDateTime ? new Date(deadlineDateTime) : null,
                questions,
                isUnlocked: unlockDateTime ? new Date(unlockDateTime) <= new Date() : false,
                isFinalWeek: isFinalWeek || false
            });
            await task.save();
        }

        // Automatically create/update Calendar Events
        const ScheduleEvent = require('../models/ScheduleEvent');
        
        if (unlockDateTime) {
            await ScheduleEvent.findOneAndUpdate(
                { title: `Week ${weekNumber} Unlock - ${task.labName}`, type: 'unlock' },
                { 
                    title: `Week ${weekNumber} Unlock - ${task.labName}`,
                    start: new Date(unlockDateTime),
                    end: new Date(new Date(unlockDateTime).getTime() + 3600000), // 1 hour duration
                    type: 'unlock',
                    labName: task.labName,
                    createdBy: req.admin.id,
                    color: '#8254ee'
                },
                { upsert: true, new: true }
            );
        }

        if (deadlineDateTime) {
            await ScheduleEvent.findOneAndUpdate(
                { title: `Week ${weekNumber} Deadline - ${task.labName}`, type: 'deadline' },
                { 
                    title: `Week ${weekNumber} Deadline - ${task.labName}`,
                    start: new Date(deadlineDateTime),
                    end: new Date(new Date(deadlineDateTime).getTime() + 3600000),
                    type: 'deadline',
                    labName: task.labName,
                    createdBy: req.admin.id,
                    color: '#ff5c5c'
                },
                { upsert: true, new: true }
            );
        }

        req.app.locals.io.emit('scheduleUpdated', { weekNumber, labName: task.labName });
        res.json(task);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/tasks', authAdmin, async (req, res) => {
    try {
        const q = {};
        if (req.admin.role === 'labadmin') {
            q.labName = req.admin.assignedLab;
        }
        const tasks = await WeeklyTask.find(q).populate('questions');
        res.json(tasks);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Questions Routes
router.post('/questions', authAdmin, async (req, res) => {
    try {
        const payload = req.body;
        if (!payload.primaryLanguage) {
            return res.status(400).json({ message: 'Primary language is required' });
        }
        if (req.admin.role === 'labadmin') {
            payload.labName = req.admin.assignedLab;
        }
        
        // Normalize lab name to standard format
        payload.labName = normalizeLabName(payload.labName);
        
        // Set published flag and assignment metadata
        payload.published = true;
        payload.visibleToStudents = true;
        payload.createdBy = req.admin.id;
        
        // Get admin info for faculty name
        if (payload.facultyName === '' || !payload.facultyName) {
            const adminUser = await Admin.findById(req.admin.id).select('name');
            if (adminUser) {
                payload.facultyName = adminUser.name || req.admin.id;
            }
        }
        
        // Log for debugging
        console.log(`[ADMIN] Creating question: labName="${payload.labName}", published=${payload.published}, visibleToStudents=${payload.visibleToStudents}`);
        
        const question = new Question(payload);
        await question.save();
        
        // If there's a weekNumber, add to the corresponding WeeklyTask
        if (req.body.weekNumber) {
            let task = await WeeklyTask.findOne({ weekNumber: req.body.weekNumber, labName: question.labName });
            if (task) {
                task.questions.push(question._id);
                await task.save();
                question.weeklyTask = task._id;
                await question.save();
            } else {
                // Create the weekly task if it doesn't exist
                task = new WeeklyTask({
                    weekNumber: Number(req.body.weekNumber),
                    labName: question.labName,
                    unlockDateTime: req.body.unlockStartTime ? new Date(req.body.unlockStartTime) : new Date(),
                    deadlineDateTime: req.body.unlockEndTime ? new Date(req.body.unlockEndTime) : null,
                    questions: [question._id],
                    isUnlocked: true, // Auto-unlock for published questions
                });
                await task.save();
                question.weeklyTask = task._id;
                await question.save();
            }
        }
        
        // Emit events
        if (req.app.locals.io) {
            req.app.locals.io.emit('questionAdded', question);
            req.app.locals.io.emit('questionPublished', {
                questionId: question._id,
                labName: question.labName,
                weekNumber: question.weekNumber,
                title: question.title,
                assignedYear: question.assignedYear,
                assignedSection: question.assignedSection,
                facultyName: question.facultyName,
            });
            req.app.locals.io.emit('notification', {
                text: `New Question Published: ${question.title} (${question.labName} - Week ${question.weekNumber})`,
                type: 'task',
                labName: question.labName,
            });
        }
        res.json(question);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.put('/questions/:id', authAdmin, async (req, res) => {
    try {
        const payload = req.body;
        if (req.admin.role === 'labadmin') {
            // Verify ownership
            const existing = await Question.findById(req.params.id);
            if (!existing || existing.labName !== req.admin.assignedLab) {
                return res.status(403).json({ message: 'Unauthorized for this lab' });
            }
            payload.labName = req.admin.assignedLab;
        }
        
        const question = await Question.findByIdAndUpdate(req.params.id, payload, { new: true });
        req.app.locals.io.emit('questionUpdated', question);
        res.json(question);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.delete('/questions/:id', authAdmin, async (req, res) => {
    try {
        if (req.admin.role === 'labadmin') {
            const existing = await Question.findById(req.params.id);
            if (!existing || existing.labName !== req.admin.assignedLab) {
                return res.status(403).json({ message: 'Unauthorized for this lab' });
            }
        }
        await Question.findByIdAndDelete(req.params.id);
        req.app.locals.io.emit('questionDeleted', req.params.id);
        res.json({ message: 'Question deleted' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.get('/questions', authAdmin, async (req, res) => {
    try {
        let query = {};
        if (req.admin.role === 'labadmin') {
            query.labName = req.admin.assignedLab;
        }
        const questions = await Question.find(query);
        res.json(questions);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Student Tracking Route
router.get('/students', authAdmin, async (req, res) => {
    try {
        let studentQuery = {};
        const isStaffRole = ['labadmin', 'faculty'].includes(req.admin.role);
        if (isStaffRole) {
            studentQuery.$or = [{ assignedLab: req.admin.assignedLab }, { selectedLab: req.admin.assignedLab }];
        }
        
        const students = await User.find(studentQuery).select('-dob').lean();
        
        // submissions
        let submissions = await Submission.find().populate('question', 'title difficulty tags weeklyTask labName').populate('user', 'assignedLab selectedLab');
        if (isStaffRole) {
             submissions = submissions.filter(s => s.question && s.question.labName === req.admin.assignedLab && s.user && (s.user.assignedLab || s.user.selectedLab) === req.admin.assignedLab);
        }
        
        const activeTasks = await WeeklyTask.find().sort({ weekNumber: 1 });
        
        const now = new Date();
        const unlockedTasks = activeTasks.filter(t => t.isUnlocked);
        const currentTask = unlockedTasks[unlockedTasks.length - 1];

        // Resolve promises inside map correctly
        const resolvedData = await Promise.all(students.map(async student => {
            const studentSubs = submissions.filter(s => s.user && s.user._id.toString() === student._id.toString());
            const acceptedSubs = studentSubs.filter(s => s.status === 'Accepted' && s.question); // Null check
            const uniqueSolvedIds = new Set(acceptedSubs.map(s => s.question._id.toString()));
            let totalQ = 0;
            if (req.admin.role === 'labadmin') {
                totalQ = await Question.countDocuments({ labName: req.admin.assignedLab });
            } else {
                totalQ = await Question.countDocuments();
            }
            return {
                ...student,
                solvedCount: uniqueSolvedIds.size,
                pendingCount: totalQ - uniqueSolvedIds.size,
                submissionHistory: studentSubs.sort((a,b) => b.submittedAt - a.submittedAt).slice(0, 5),
                currentActiveWeek: currentTask ? currentTask.weekNumber : null
            };
        }));

        res.json(resolvedData);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Create Student
router.post('/students', authAdmin, async (req, res) => {
    try {
        if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
        const { name, regNo, dob, password, classAndYear, subjectName, selectedLab, facultyName, section } = req.body;

        if (!dob) {
            return res.status(400).json({ message: 'Date of birth (DOB) is required for student login.' });
        }

        const regNormalized = String(regNo).trim().toUpperCase();
        const dup = await User.findOne({ regNo: new RegExp(`^${regNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        if (dup) {
            return res.status(400).json({ message: 'Registration number already exists.' });
        }

        const bcrypt = require('bcryptjs');
        const payload = {
            name,
            regNo: regNormalized,
            dob: String(dob).trim(),
            classAndYear,
            year: classAndYear,
            subjectName,
            assignedLab: selectedLab,
            selectedLab,
            facultyName,
            section,
        };
        if (password) {
            const salt = await bcrypt.genSalt(10);
            payload.password = await bcrypt.hash(password, salt);
        }

        const newStudent = new User(payload);

        await newStudent.save();
        res.json(newStudent);
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Registration number already exists.' });
        }
        res.status(500).json({ message: 'Failed to create student' });
    }
});



// =====================================
// Faculty & Lab Admin Management
// =====================================

// Get all faculty/admins
router.get('/faculty', authAdmin, async (req, res) => {
    try {
        if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
        const faculty = await Admin.find({ role: { $in: ['faculty', 'labadmin'] } }).select('-password');
        res.json(faculty);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Create Faculty/Admin
router.post('/faculty', authAdmin, async (req, res) => {
    try {
        if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
        const { name, email, password, role, subject, assignedLab, assignedSections, assignedYear, labDay, startTime, endTime } = req.body;
        
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newFaculty = new Admin({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'faculty',
            subject,
            assignedLab,
            assignedSections,
            assignedYear,
            labDay,
            startTime,
            endTime
        });
        
        await newFaculty.save();
        res.json(newFaculty);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create faculty' });
    }
});

// Update Faculty
router.put('/faculty/:id', authAdmin, async (req, res) => {
    try {
        if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
        const { password, ...updateData } = req.body;
        
        if (password) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }
        
        const faculty = await Admin.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        res.json(faculty);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Delete Faculty
router.delete('/faculty/:id', authAdmin, async (req, res) => {
    try {
        if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'Faculty deleted' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Backwards compatibility for old admin tab if needed
router.get('/admins', authAdmin, async (req, res) => {
    if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
    const admins = await Admin.find({ role: 'labadmin' }).select('-password');
    res.json(admins);
});

router.post('/admins', authAdmin, async (req, res) => {
    if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const a = new Admin({ ...req.body, password: hashedPassword, role: 'labadmin' });
    await a.save();
    res.json({ id: a._id, email: a.email, assignedLab: a.assignedLab });
});

router.delete('/admins/:id', authAdmin, async (req, res) => {
    if (!isHodRole(req.admin.role)) return res.status(403).json({ message: 'Forbidden' });
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// Violation reports (academic integrity / lab conduct)
router.get('/violations', authAdmin, async (req, res) => {
    try {
        const q = {};
        if (['labadmin', 'faculty'].includes(req.admin.role)) {
            q.labName = req.admin.assignedLab;
        }
        const list = await ViolationReport.find(q)
            .populate('student', 'name regNo assignedLab selectedLab section')
            .populate('reportedBy', 'name email role')
            .sort({ createdAt: -1 });
        res.json(list);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/violations', authAdmin, async (req, res) => {
    try {
        if (!['labadmin', 'faculty', 'hod'].includes(req.admin.role)) {
            return res.status(403).json({ message: 'Insufficient permission' });
        }
        const { studentId, title, details, severity, labName: bodyLab } = req.body;
        if (!studentId || !title) {
            return res.status(400).json({ message: 'studentId and title are required' });
        }
        let labName;
        if (isHodRole(req.admin.role)) {
            labName = bodyLab;
        } else {
            labName = req.admin.assignedLab;
        }
        if (!labName) {
            return res.status(400).json({ message: 'Lab is not set for this account' });
        }
        const stu = await User.findById(studentId);
        if (!stu) return res.status(404).json({ message: 'Student not found' });
        if ((stu.assignedLab || stu.selectedLab) !== labName) {
            return res.status(400).json({ message: 'Student is not assigned to this lab' });
        }
        const v = new ViolationReport({
            student: studentId,
            labName,
            title: String(title).trim(),
            details: details ? String(details).trim() : '',
            severity: ['low', 'medium', 'high'].includes(severity) ? severity : 'medium',
            reportedBy: req.admin.id,
        });
        await v.save();
        const populated = await ViolationReport.findById(v._id)
            .populate('student', 'name regNo assignedLab selectedLab')
            .populate('reportedBy', 'name email role');
        res.json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.patch('/violations/:id', authAdmin, async (req, res) => {
    try {
        const v = await ViolationReport.findById(req.params.id);
        if (!v) return res.status(404).json({ message: 'Not found' });
        if (['labadmin', 'faculty'].includes(req.admin.role)) {
            if (v.labName !== req.admin.assignedLab) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }
        if (req.body.status && ['open', 'investigating', 'resolved'].includes(req.body.status)) {
            v.status = req.body.status;
        }
        await v.save();
        res.json(v);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// =============================================
// HOD ACCOUNT MANAGEMENT ENDPOINTS
// =============================================

/** Middleware: only HOD can manage accounts */
const hodOnly = (req, res, next) => {
    if (req.admin?.role !== 'hod') {
        return res.status(403).json({ message: 'Only HOD can manage accounts' });
    }
    next();
};

/**
 * GET /api/admin/manage/users
 * List all faculty and lab admin accounts for HOD management.
 */
router.get('/manage/users', authAdmin, hodOnly, async (req, res) => {
    try {
        const { search, role, page = 1, limit = 50 } = req.query;
        const filter = { role: { $in: ['faculty', 'labadmin'] } };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        if (role) filter.role = role;

        const total = await Admin.countDocuments(filter);
        const users = await Admin.find(filter)
            .select('-password')
            .sort({ role: 1, name: 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Manage users error:', err);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

/**
 * PUT /api/admin/manage/change-email
 * HOD changes email of a faculty/labadmin.
 */
router.put('/manage/change-email', authAdmin, hodOnly, async (req, res) => {
    try {
        const { userId, newEmail } = req.body;
        if (!userId || !newEmail) {
            return res.status(400).json({ message: 'User ID and new email are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check duplicate email
        const existing = await Admin.findOne({ email: newEmail, _id: { $ne: userId } });
        if (existing) {
            return res.status(400).json({ message: 'Email already in use by another account' });
        }

        const target = await Admin.findById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (target.role === 'hod') {
            return res.status(403).json({ message: 'Cannot modify HOD accounts' });
        }

        const oldEmail = target.email;
        target.email = newEmail;
        await target.save();

        res.json({
            message: 'Email updated successfully',
            userId: target._id,
            oldEmail,
            newEmail,
            name: target.name,
            role: target.role
        });
    } catch (err) {
        console.error('Change email error:', err);
        res.status(500).json({ message: 'Error changing email' });
    }
});

/**
 * PUT /api/admin/manage/change-password
 * HOD resets password of a faculty/labadmin.
 */
router.put('/manage/change-password', authAdmin, hodOnly, async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'User ID and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const target = await Admin.findById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (target.role === 'hod') {
            return res.status(403).json({ message: 'Cannot modify HOD accounts' });
        }

        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        target.password = await bcrypt.hash(newPassword, salt);
        await target.save();

        res.json({
            message: 'Password updated successfully',
            userId: target._id,
            name: target.name,
            role: target.role
        });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Error changing password' });
    }
});

/**
 * PUT /api/admin/manage/toggle-status
 * HOD enables or disables a faculty/labadmin account.
 */
router.put('/manage/toggle-status', authAdmin, hodOnly, async (req, res) => {
    try {
        const { userId, isActive } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const target = await Admin.findById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (target.role === 'hod') {
            return res.status(403).json({ message: 'Cannot modify HOD accounts' });
        }

        target.isActive = isActive !== undefined ? isActive : !target.isActive;
        await target.save();

        res.json({
            message: `Account ${target.isActive ? 'activated' : 'disabled'} successfully`,
            userId: target._id,
            name: target.name,
            role: target.role,
            isActive: target.isActive
        });
    } catch (err) {
        console.error('Toggle status error:', err);
        res.status(500).json({ message: 'Error updating account status' });
    }
});

module.exports = router;




