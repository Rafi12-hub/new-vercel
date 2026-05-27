const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { schedules, students } = require('../config/dbHelper');
const { admin } = require('../config/firebase');

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

router.get('/', authAny, async (req, res) => {
    try {
        let eventsSnap;
        if (req.admin) {
            if (req.admin.role === 'labadmin' || req.admin.role === 'faculty') {
                eventsSnap = await schedules.where('labName', '==', req.admin.assignedLab).get();
            } else {
                eventsSnap = await schedules.get();
            }
        } else if (req.user) {
            const userDoc = await students.doc(req.user.id).get();
            if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
            const user = userDoc.data();
            const labName = user.assignedLab || user.selectedLab;
            eventsSnap = await schedules.where('labName', '==', labName).get();
        }

        const events = [];
        for (const doc of eventsSnap.docs) {
            const data = doc.data();
            data.id = doc.id;
            data._id = doc.id; // For backwards compatibility
            if (data.start && data.start.toDate) data.start = data.start.toDate();
            if (data.end && data.end.toDate) data.end = data.end.toDate();
            events.push(data);
        }
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/', authAny, async (req, res) => {
    try {
        if (!req.admin) return res.status(403).json({ message: 'Forbidden' });
        
        const { title, description, start, end, type, labName, section, year, color } = req.body;
        
        const newEventRef = await schedules.add({
            title,
            description,
            start: new Date(start),
            end: new Date(end),
            type,
            labName: labName || req.admin.assignedLab,
            section,
            year,
            createdBy: req.admin.id,
            color,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const newEventDoc = await newEventRef.get();
        const newEvent = newEventDoc.data();
        newEvent.id = newEventDoc.id;
        newEvent._id = newEventDoc.id;
        
        if (req.app.locals.io) {
            req.app.locals.io.emit('scheduleUpdated', newEvent);
        }

        res.json(newEvent);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.delete('/:id', authAny, async (req, res) => {
    try {
        if (!req.admin) return res.status(403).json({ message: 'Forbidden' });
        const eventRef = schedules.doc(req.params.id);
        const eventDoc = await eventRef.get();
        if (!eventDoc.exists) return res.status(404).json({ message: 'Event not found' });

        const event = eventDoc.data();
        if (!['hod'].includes(req.admin.role) && event.labName !== req.admin.assignedLab) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await eventRef.delete();
        
        if (req.app.locals.io) {
            req.app.locals.io.emit('scheduleUpdated', { deletedId: req.params.id });
        }

        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
