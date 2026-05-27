const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { students, submissions, questions, weeklyTasks } = require('../config/dbHelper');
const { admin } = require('../config/firebase');

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =====================================
// Lab Session Helpers
// =====================================

const { isLabActive } = require('../utils/labSessionUtils');

router.post('/check-lab', async (req, res) => {
    const { regNo } = req.body;
    if (!regNo) {
        return res.status(400).json({ message: 'Registration number is required' });
    }

    const regTrim = String(regNo).trim().toUpperCase();

    try {
        const snapshot = await students.where('regNo', '==', regTrim).limit(1).get();
        if (snapshot.empty) {
            return res.status(404).json({ message: 'Student not found. Please register first.' });
        }

        const studentDoc = snapshot.docs[0];
        const student = studentDoc.data();

        const assignedLabs = (student.assignedLabs && student.assignedLabs.length > 0)
            ? student.assignedLabs
            : (student.assignedLab ? [student.assignedLab] : []);

        res.json({
            name: student.name,
            regNo: student.regNo,
            semester: student.semester || '',
            year: student.year || '',
            assignedLabs
        });
    } catch (err) {
        console.error('[CHECK-LAB ERROR]', err.message);
        res.status(500).send('Server error');
    }
});

router.get('/lab-active', async (req, res) => {
    const { lab } = req.query;
    if (!lab) return res.status(400).json({ message: 'Lab name is required' });
    try {
        const result = await isLabActive(lab);
        res.json(result);
    } catch (err) {
        console.error('[LAB-ACTIVE ERROR]', err.message);
        res.status(500).send('Server error');
    }
});

router.post('/register', async (req, res) => {
    const { name, email, regNo, dateOfBirth, year, semester, section, branch, assignedLab, facultyName } = req.body;

    if (!name || !email || !regNo || !dateOfBirth || !year || !facultyName) {
        return res.status(400).json({ message: 'Name, Email, Registration Number, Date of Birth, Year, and Faculty Name are required' });
    }

    if (semester && !['2-1', '2-2', '3-1', '3-2'].includes(semester)) {
        return res.status(400).json({ message: 'Invalid semester. Must be one of: 2-1, 2-2, 3-1, 3-2' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address' });
    }

    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dobRegex.test(dateOfBirth)) {
        return res.status(400).json({ message: 'Date of Birth must be in DD-MM-YYYY format (e.g., 12-08-2005)' });
    }

    const regTrim = String(regNo).trim().toUpperCase();

    try {
        const existingSnapshot = await students.where('regNo', '==', regTrim).limit(1).get();
        if (!existingSnapshot.empty) {
            return res.status(400).json({ message: 'Registration number already exists. Please login.' });
        }

        const password = dateOfBirth;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const labs = [];
        if (assignedLab) {
            labs.push(assignedLab);
        }
        if (semester) {
            const { getLabsForYearSemester } = require('../utils/semesterLabMapping');
            const semesterLabs = getLabsForYearSemester(year, semester);
            semesterLabs.forEach(l => {
                if (!labs.includes(l)) labs.push(l);
            });
        }

        const newUserRef = await students.add({
            name,
            email,
            regNo: regTrim,
            dateOfBirth,
            year,
            classAndYear: year,
            semester: semester || '',
            section: section || '',
            branch: branch || 'CSE',
            assignedLab: labs.length > 0 ? labs[0] : (assignedLab || ''),
            assignedLabs: labs,
            selectedLab: labs.length > 0 ? labs[0] : (assignedLab || ''),
            facultyName,
            password: hashedPassword,
            completedTasks: 0,
            weeklyProgress: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const payload = {
            user: {
                id: newUserRef.id,
                role: 'student',
            },
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            role: 'student',
            activeLab: labs.length > 0 ? labs[0] : (assignedLab || ''),
            user: {
                id: newUserRef.id,
                name,
                email,
                regNo: regTrim,
                role: 'student',
                year,
                semester,
                assignedLab: labs.length > 0 ? labs[0] : (assignedLab || ''),
                assignedLabs: labs,
                selectedLab: labs.length > 0 ? labs[0] : (assignedLab || ''),
                facultyName,
                completedTasks: 0,
            },
        });
    } catch (err) {
        console.error(`[REGISTER ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

router.post('/login', async (req, res) => {
    const { regNo, password, selectedLab } = req.body;

    if (!regNo || !password) {
        return res.status(400).json({ message: 'Registration number and password are required' });
    }

    const regTrim = String(regNo).trim().toUpperCase();

    try {
        let userDoc = null;
        let user = null;
        const snapshot = await students.where('regNo', '==', regTrim).limit(1).get();

        if (snapshot.empty && regTrim === 'RGMCSEDEV' && password === '01-01-2000') {
            const salt = await bcrypt.genSalt(10);
            const hashedPwd = await bcrypt.hash('01-01-2000', salt);
            const testUserRef = await students.add({
                name: 'DEV Test Student',
                email: 'dev@rgmcsedev.test',
                regNo: 'RGMCSEDEV',
                dateOfBirth: '01-01-2000',
                year: '2nd Year',
                classAndYear: '2nd Year',
                branch: 'CSE',
                section: 'A',
                assignedLab: 'Data Structures',
                selectedLab: 'Data Structures',
                facultyName: 'Faculty',
                password: hashedPwd,
            });
            userDoc = await testUserRef.get();
            user = userDoc.data();
        } else if (!snapshot.empty) {
            userDoc = snapshot.docs[0];
            user = userDoc.data();
        }

        if (!user) {
            return res.status(404).json({ message: 'Student account not found. Please register first.' });
        }

        if (selectedLab) {
            const assignedLabs = (user.assignedLabs && user.assignedLabs.length > 0)
                ? user.assignedLabs
                : (user.assignedLab ? [user.assignedLab] : []);
            const normalizedAssigned = assignedLabs.map(l => l.toLowerCase().trim());
            if (!normalizedAssigned.includes(selectedLab.toLowerCase().trim())) {
                return res.status(403).json({ message: 'Selected lab is not in your assigned labs.' });
            }
            const { active, reason } = await isLabActive(selectedLab);
            if (!active) {
                return res.status(403).json({
                    message: reason || 'This lab session is not currently active. Please login using the currently active lab.',
                    labInactive: true
                });
            }
        }

        if (!user.password) {
            return res.status(400).json({ message: 'Account has no password set. Please contact admin.' });
        }

        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = password === user.password;
            if (isMatch) {
                const salt = await bcrypt.genSalt(10);
                const newHash = await bcrypt.hash(password, salt);
                await students.doc(userDoc.id).update({ password: newHash });
                user.password = newHash;
            }
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid registration number or password' });
        }

        if (selectedLab) {
            await students.doc(userDoc.id).update({ selectedLab });
            user.selectedLab = selectedLab;
        }

        const payload = {
            user: {
                id: userDoc.id,
                role: 'student',
            },
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            role: 'student',
            activeLab: selectedLab || user.selectedLab || user.assignedLab || '',
            user: {
                id: userDoc.id,
                name: user.name,
                email: user.email,
                regNo: user.regNo,
                role: 'student',
                year: user.year,
                semester: user.semester,
                assignedLab: user.assignedLab,
                assignedLabs: user.assignedLabs || [],
                selectedLab: selectedLab || user.selectedLab || user.assignedLab || '',
                facultyName: user.facultyName,
                completedTasks: user.completedTasks,
            },
        });
    } catch (err) {
        console.error(`[LOGIN ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userDoc = await students.doc(decoded.user.id).get();
        if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
        
        const userData = userDoc.data();
        delete userData.password;
        userData.id = userDoc.id;
        userData._id = userDoc.id;

        const subsSnapshot = await submissions.where('user', '==', userDoc.id).orderBy('submittedAt', 'desc').get();
        const subs = [];
        for (const subDoc of subsSnapshot.docs) {
            const subData = subDoc.data();
            subData.id = subDoc.id;
            subData._id = subDoc.id;
            if (subData.question) {
                const qDoc = await questions.doc(subData.question).get();
                if (qDoc.exists) {
                    const qData = qDoc.data();
                    subData.question = {
                        id: qDoc.id,
                        _id: qDoc.id,
                        title: qData.title,
                        difficulty: qData.difficulty,
                        labName: qData.labName,
                        description: qData.description,
                        sampleTestCases: qData.sampleTestCases,
                        primaryLanguage: qData.primaryLanguage,
                    };
                    if (qData.weeklyTask) {
                        const wDoc = await weeklyTasks.doc(qData.weeklyTask).get();
                        if (wDoc.exists) {
                            const wData = wDoc.data();
                            subData.question.weeklyTask = {
                                id: wDoc.id,
                                _id: wDoc.id,
                                weekNumber: wData.weekNumber,
                                isUnlocked: wData.isUnlocked,
                                unlockDateTime: wData.unlockDateTime,
                                labName: wData.labName
                            };
                        }
                    }
                }
            }
            subs.push(subData);
        }
        userData.submissions = subs;
        res.json(userData);
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
});

router.put('/change-password', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userDoc = await students.doc(decoded.user.id).get();
        if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
        
        const user = userDoc.data();
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (user.password) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Incorrect current password' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await students.doc(userDoc.id).update({ password: hashedPassword });
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(`[CHANGE PASSWORD ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

router.get('/session-status', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userDoc = await students.doc(decoded.user.id).get();
        if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
        const user = userDoc.data();

        const activeLab = user.selectedLab || user.assignedLab;
        if (!activeLab) {
            return res.json({ valid: false, reason: 'No active lab selected. Please login again.' });
        }

        const labStatus = await isLabActive(activeLab);
        res.json({
            valid: labStatus.active,
            activeLab,
            facultyName: user.facultyName || '',
            ...labStatus
        });
    } catch (err) {
        console.error('[SESSION-STATUS ERROR]', err.message);
        res.status(401).json({ valid: false, reason: 'Session expired' });
    }
});

router.put('/update-lab', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userRef = students.doc(decoded.user.id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

        await userRef.update({ selectedLab: req.body.lab });
        
        const updated = await userRef.get();
        const userData = updated.data();
        userData.id = updated.id;
        delete userData.password;
        res.json(userData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
