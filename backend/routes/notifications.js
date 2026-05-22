const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// @route   GET api/notifications
// @desc    Get all notifications for authenticated user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(30);
        res.json(notifications);
    } catch (err) {
        console.error(`[GET NOTIFICATIONS ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/notifications/mark-all-read
// @desc    Mark all notifications as read
router.put('/mark-all-read', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, unread: true },
            { $set: { unread: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error(`[MARK ALL READ ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark a specific notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        notification.unread = false;
        await notification.save();
        res.json(notification);
    } catch (err) {
        console.error(`[MARK READ ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

// @route   POST api/notifications
// @desc    Create a notification manually (e.g. for PDF generated notification)
router.post('/', authMiddleware, async (req, res) => {
    const { text, type } = req.body;
    if (!text) {
        return res.status(400).json({ message: 'Notification text is required' });
    }
    try {
        const newNotification = new Notification({
            userId: req.user.id,
            text,
            type: type || 'info',
            unread: true
        });
        await newNotification.save();
        
        // Emit via socket if available
        const io = req.app.locals.io;
        if (io) {
            io.emit('newNotification', { userId: req.user.id, notification: newNotification });
        }

        res.json(newNotification);
    } catch (err) {
        console.error(`[CREATE NOTIFICATION ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

module.exports = router;
