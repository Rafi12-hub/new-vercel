const express = require('express');
const router = express.Router();
const { violations, notifications, students } = require('../config/dbHelper');
const { admin } = require('../config/firebase');
const jwt = require('jsonwebtoken');

router.post('/violation', async (req, res) => {
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

        const { type, details, labName, severity } = req.body;

        const newViolationRef = await violations.add({
            student: userId,
            labName: labName || 'Default Lab',
            title: type || 'Security Violation',
            details: details || '',
            severity: severity || 'high',
            status: 'open',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const userDocRef = students.doc(userId);
        const userDoc = await userDocRef.get();
        let userViolationCount = 1;
        let isLocked = severity === 'critical';

        if (userDoc.exists) {
            const userData = userDoc.data();
            const userViolations = userData.violations || [];
            userViolations.push({
                type: String(type || 'security').toLowerCase().includes('screen') ? 'screenshot'
                    : String(type || 'security').toLowerCase().includes('tab') || String(type || 'security').toLowerCase().includes('focus') ? 'tabswitch'
                    : 'copypaste',
                timestamp: new Date()
            });
            userViolationCount = (userData.violationCount || 0) + 1;
            
            if (severity === 'critical' || userViolationCount >= 3) {
                isLocked = true;
            }

            const updateData = {
                violations: userViolations,
                violationCount: userViolationCount,
                isCompilerLocked: isLocked
            };

            if (isLocked) {
                updateData.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour lock
            }

            await userDocRef.update(updateData);
        }

        const newNotifRef = await notifications.add({
            userId,
            text: `Security Alert: ${type || 'Security Violation'} detected!`,
            type: 'danger',
            unread: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const populatedReport = (await newViolationRef.get()).data();
        populatedReport.id = newViolationRef.id;
        if (userDoc.exists) {
            const ud = userDoc.data();
            populatedReport.student = { name: ud.name, regNo: ud.regNo, _id: userId };
        }

        if (req.app.locals.io) {
            req.app.locals.io.emit('violationAlert', populatedReport);
            const notifData = (await newNotifRef.get()).data();
            notifData.id = newNotifRef.id;
            notifData._id = newNotifRef.id;
            req.app.locals.io.emit('newNotification', {
                userId,
                notification: notifData
            });
        }

        res.status(201).json({
            report: populatedReport,
            violationCount: userViolationCount,
            isCompilerLocked: isLocked,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error recording violation' });
    }
});

router.get('/my-violations', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const snapshot = await violations.where('student', '==', decoded.user.id)
            .orderBy('createdAt', 'desc')
            .get();
        const reports = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            data.id = doc.id;
            data._id = doc.id;
            reports.push(data);
        }
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
