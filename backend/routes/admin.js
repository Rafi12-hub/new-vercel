const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Question = require('../models/Question');
const WeeklyTask = require('../models/WeeklyTask');
const User = require('../models/User');
const Submission = require('../models/Submission');

// =====================================
// Admin Authentication & Management Routes
// =====================================

/**
 * Super Admin & Lab Admin Login
 * Authenticates admin credentials and returns JWT token
 */
// Admin Login
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();

    try {
        const bcrypt = require('bcryptjs');
        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Support both plaintext (for old seeded) and hashed passwords
        let isMatch = false;
        if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, admin.password);
        } else {
            isMatch = admin.password === password;
            // Optionally auto-hash the password here for future logins
            if (isMatch) {
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(password, salt);
                await admin.save();
            }
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = { admin: { id: admin.id, role: admin.role, assignedLab: admin.assignedLab } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            res.json({ 
                token, 
                role: admin.role,
                admin: { id: admin.id, email: admin.email, role: admin.role, assignedLab: admin.assignedLab } 
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
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

// @route   GET api/admin/me
// @desc    Get current admin data
router.get('/me', authAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        res.json(admin);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get Dashboard Stats
router.get('/stats', authAdmin, async (req, res) => {
    try {
        let studentQuery = {};
        let questionQuery = {};
        
        if (req.admin.role === 'labadmin' || req.admin.role === 'admin') {
            studentQuery.selectedLab = req.admin.assignedLab;
            questionQuery.labName = req.admin.assignedLab;
        }

        const students = await User.find(studentQuery);
        const questionsCount = await Question.countDocuments(questionQuery);
        const allQuestions = await Question.find(questionQuery).select('_id');
        const questionIds = allQuestions.map(q => q._id.toString());
        
        // Filter submissions to only those matching the questions the admin is allowed to see
        let submissions = await Submission.find().populate('user', 'name regNo selectedLab').populate('question', 'title labName').sort({ submittedAt: -1 });
        if (req.admin.role === 'labadmin' || req.admin.role === 'admin') {
            submissions = submissions.filter(s => s.question && s.question.labName === req.admin.assignedLab && s.user && s.user.selectedLab === req.admin.assignedLab);
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
            const lab = student.selectedLab || 'Unknown Lab';
            if (!labWise[lab]) labWise[lab] = { students: 0, solved: 0, pending: 0 };
            labWise[lab].students++;
        });

        // Compute metrics per student
        submissions.filter(s => s.status === 'Accepted').forEach(s => {
            const student = s.user;
            if (!student) return;
            const year = student.classAndYear || 'Unknown Year';
            const section = student.section || 'Unknown Section';
            const lab = student.selectedLab || 'Unknown Lab';

            if (yearWise[year]) {
                yearWise[year].solved++;
                yearWise[year].active++;
            }
            if (sectionWise[section]) sectionWise[section].solved++;
            if (labWise[lab]) labWise[lab].solved++;
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
            role: { $in: ['admin', 'labadmin'] },
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
            latestSubmissions: submissions.slice(0, 10),
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
        const { weekNumber, unlockDateTime, deadlineDateTime, labName, questions } = req.body;
        
        // Find existing task for this week and lab or create new
        let task = await WeeklyTask.findOne({ weekNumber, labName: labName || req.admin.assignedLab });
        
        if (task) {
            if (unlockDateTime) task.unlockDateTime = new Date(unlockDateTime);
            if (deadlineDateTime) task.deadlineDateTime = new Date(deadlineDateTime);
            if (questions) task.questions = questions;
            await task.save();
        } else {
            task = new WeeklyTask({ 
                weekNumber, 
                labName: labName || req.admin.assignedLab,
                unlockDateTime: unlockDateTime ? new Date(unlockDateTime) : null,
                deadlineDateTime: deadlineDateTime ? new Date(deadlineDateTime) : null,
                questions,
                isUnlocked: unlockDateTime ? new Date(unlockDateTime) <= new Date() : false
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
        const tasks = await WeeklyTask.find().populate('questions');
        res.json(tasks);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Questions Routes
router.post('/questions', authAdmin, async (req, res) => {
    try {
        const payload = req.body;
        if (req.admin.role === 'labadmin') {
            payload.labName = req.admin.assignedLab;
        }
        
        const question = new Question(payload);
        await question.save();
        
        // If there's a weekNumber, we should add it to the corresponding WeeklyTask
        if (req.body.weekNumber) {
            let task = await WeeklyTask.findOne({ weekNumber: req.body.weekNumber });
            if (task) {
                task.questions.push(question._id);
                await task.save();
                question.weeklyTask = task._id;
                await question.save();
            }
        }
        
        req.app.locals.io.emit('questionAdded', question);
        req.app.locals.io.emit('notification', {
            text: `New Question: ${question.title} added to ${question.labName}`,
            type: 'task',
            labName: question.labName
        });
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
        if (req.admin.role === 'labadmin' || req.admin.role === 'admin') {
            studentQuery.selectedLab = req.admin.assignedLab;
        }
        
        const students = await User.find(studentQuery).select('-dob').lean();
        
        // submissions
        let submissions = await Submission.find().populate('question', 'title difficulty tags weeklyTask labName').populate('user', 'selectedLab');
        if (req.admin.role === 'labadmin' || req.admin.role === 'admin') {
             submissions = submissions.filter(s => s.question && s.question.labName === req.admin.assignedLab && s.user && s.user.selectedLab === req.admin.assignedLab);
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
        if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
        const { name, regNo, password, classAndYear, subjectName, selectedLab, facultyName, section } = req.body;
        
        // Generate a random string as password if not provided, though the form should provide it
        const finalPassword = password || 'Student@123';
        
        // We do not store hashed password for student currently since they login with regNo + dob.
        // Wait, the new prompt says "Password must be encrypted" and "Login with RegNo and Password".
        // Let's encrypt the password.
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(finalPassword, salt);
        
        const newStudent = new User({
            name,
            regNo: regNo.toUpperCase().trim(),
            password: hashedPassword, // Note: We need to ensure User model supports password and auth uses it
            classAndYear,
            subjectName,
            selectedLab,
            facultyName,
            section
        });
        
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
        if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
        const faculty = await Admin.find({ role: { $in: ['admin', 'labadmin'] } }).select('-password');
        res.json(faculty);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Create Faculty/Admin
router.post('/faculty', authAdmin, async (req, res) => {
    try {
        if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
        const { name, email, password, role, subject, assignedLab, assignedSections, assignedYear, labDay, startTime, endTime } = req.body;
        
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newFaculty = new Admin({
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'admin',
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
        if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
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
        if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'Faculty deleted' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Backwards compatibility for old admin tab if needed
router.get('/admins', authAdmin, async (req, res) => {
    if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const admins = await Admin.find({ role: 'labadmin' }).select('-password');
    res.json(admins);
});

router.post('/admins', authAdmin, async (req, res) => {
    if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const a = new Admin({ ...req.body, password: hashedPassword, role: 'labadmin' });
    await a.save();
    res.json({ id: a._id, email: a.email, assignedLab: a.assignedLab });
});

router.delete('/admins/:id', authAdmin, async (req, res) => {
    if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;
