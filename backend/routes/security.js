const express = require('express');
const router = express.Router();
const ViolationReport = require('../models/ViolationReport');
const Notification = require('../models/Notification');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @route   POST api/security/violation
// @desc    Report a security violation
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

        const report = new ViolationReport({
            student: userId,
            labName: labName || 'Default Lab',
            title: type || 'Security Violation',
            details: details || '',
            severity: severity || 'high',
            status: 'open',
        });

        await report.save();

        const user = await User.findById(userId);
        if (user) {
            user.violations.push({
                type: String(type || 'security').toLowerCase().includes('screen') ? 'screenshot'
                    : String(type || 'security').toLowerCase().includes('tab') || String(type || 'security').toLowerCase().includes('focus') ? 'tabswitch'
                    : 'copypaste',
                timestamp: new Date(),
            });
            user.violationCount = (user.violationCount || 0) + 1;
            if (severity === 'critical' || user.violationCount >= 3) {
                user.isCompilerLocked = true;
                user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
            }
            await user.save();
        }

        const populatedReport = await ViolationReport.findById(report._id).populate('student', 'name regNo');

        const newNotification = new Notification({
            userId,
            text: `Security Alert: ${type || 'Security Violation'} detected!`,
            type: 'danger',
            unread: true
        });
        await newNotification.save();

        if (req.app.locals.io) {
            // Emitting to lab admin (or global)
            req.app.locals.io.emit('violationAlert', populatedReport);
            req.app.locals.io.emit('newNotification', {
                userId,
                notification: newNotification
            });
        }

        res.status(201).json({
            report,
            violationCount: user?.violationCount || 1,
            isCompilerLocked: user?.isCompilerLocked || severity === 'critical',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error recording violation' });
    }
});

// @route   GET api/security/my-violations
// @desc    Get current user's violation reports
router.get('/my-violations', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const reports = await ViolationReport.find({ student: decoded.user.id }).sort({ reportedAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
