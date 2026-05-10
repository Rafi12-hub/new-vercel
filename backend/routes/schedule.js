const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ScheduleEvent = require('../models/ScheduleEvent');
const User = require('../models/User');

// Auth Middleware (Supports both Admin and User)
const authAny = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        req.admin = decoded.admin;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// @route   GET api/schedule
// @desc    Get schedule events based on role
router.get('/', authAny, async (req, res) => {
    try {
        let query = {};
        if (req.admin) {
            if (req.admin.role === 'labadmin' || req.admin.role === 'admin') {
                query.labName = req.admin.assignedLab;
            }
            // Superadmin sees everything
        } else if (req.user) {
            // Student sees events for their lab
            const user = await User.findById(req.user.id);
            query.labName = user.selectedLab;
        }

        const events = await ScheduleEvent.find(query).populate('createdBy', 'name email role');
        res.json(events);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   POST api/schedule
// @desc    Create a new schedule event
router.post('/', authAny, async (req, res) => {
    try {
        if (!req.admin) return res.status(403).json({ message: 'Forbidden' });
        
        const { title, description, start, end, type, labName, section, year, color } = req.body;
        
        const newEvent = new ScheduleEvent({
            title,
            description,
            start,
            end,
            type,
            labName: labName || req.admin.assignedLab,
            section,
            year,
            createdBy: req.admin.id,
            color
        });

        await newEvent.save();
        
        // Notify via Socket.io if available
        if (req.app.locals.io) {
            req.app.locals.io.emit('scheduleUpdated', newEvent);
        }

        res.json(newEvent);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/schedule/:id
// @desc    Delete an event
router.delete('/:id', authAny, async (req, res) => {
    try {
        if (!req.admin) return res.status(403).json({ message: 'Forbidden' });
        const event = await ScheduleEvent.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Lab admins can only delete their own lab's events
        if (req.admin.role !== 'superadmin' && event.labName !== req.admin.assignedLab) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await ScheduleEvent.findByIdAndDelete(req.params.id);
        
        if (req.app.locals.io) {
            req.app.locals.io.emit('scheduleUpdated', { deletedId: req.params.id });
        }

        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
