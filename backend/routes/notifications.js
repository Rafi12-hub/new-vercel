const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { notifications } = require('../config/dbHelper');
const { admin } = require('../config/firebase');

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

router.get('/', authMiddleware, async (req, res) => {
    try {
        const snapshot = await notifications.where('userId', '==', req.user.id)
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();
        const notifs = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            data.id = doc.id;
            data._id = doc.id;
            notifs.push(data);
        }
        res.json(notifs);
    } catch (err) {
        console.error(`[GET NOTIFICATIONS ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

router.put('/mark-all-read', authMiddleware, async (req, res) => {
    try {
        const snapshot = await notifications.where('userId', '==', req.user.id).where('unread', '==', true).get();
        const batch = admin.firestore().batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { unread: false });
        });
        await batch.commit();
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error(`[MARK ALL READ ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const docRef = notifications.doc(req.params.id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        const data = docSnap.data();
        if (data.userId !== req.user.id) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        await docRef.update({ unread: false });
        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data();
        updatedData.id = updatedDoc.id;
        updatedData._id = updatedDoc.id;
        res.json(updatedData);
    } catch (err) {
        console.error(`[MARK READ ERROR] ${err.message}`);
        res.status(500).send('Server error');
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { text, type } = req.body;
    if (!text) {
        return res.status(400).json({ message: 'Notification text is required' });
    }
    try {
        const newRef = await notifications.add({
            userId: req.user.id,
            text,
            type: type || 'info',
            unread: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const doc = await newRef.get();
        const newNotification = doc.data();
        newNotification.id = doc.id;
        newNotification._id = doc.id;
        
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
