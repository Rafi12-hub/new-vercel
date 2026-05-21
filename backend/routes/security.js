const express = require('express');
const router = express.Router();
const ViolationReport = require('../models/ViolationReport');
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

        const populatedReport = await ViolationReport.findById(report._id).populate('student', 'name regNo');

        if (req.app.locals.io) {
            // Emitting to lab admin (or global)
            req.app.locals.io.emit('violationAlert', populatedReport);
            req.app.locals.io.emit('notification', {
                text: `Security Alert: ${populatedReport.student?.name || 'Student'} - ${type}`,
                type: 'danger',
                userId,
            });
        }

        res.status(201).json(report);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error recording violation' });
    }
});

module.exports = router;
