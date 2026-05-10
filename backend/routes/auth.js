const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// =====================================
// Student Authentication Routes
// =====================================

/**
 * Student Login Route
 * Validates registration number and DOB (used as password).
 * Returns a JWT token for secure API access.
 */
router.post('/login', async (req, res) => {
    let { regNo, password } = req.body;
    
    console.log("Incoming:", req.body);

    if (regNo) {
        regNo = regNo.trim().toUpperCase();
    }
    
    console.log("Normalized RegNo:", regNo);

    try {
        let user = await User.findOne({ regNo });
        console.log("User Found:", user);

        if (!user) {
            console.log(`[LOGIN FAILED] Reason: User not found for regNo: ${regNo}`);
            return res.status(400).json({ message: 'Invalid Registration Number or Password' });
        }

        const bcrypt = require('bcryptjs');
        let isMatch = false;
        if (user.password) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Legacy demo account fallback
            isMatch = (user.dob === password) || (password === 'Student@123');
        }

        if (!isMatch) {
            console.log(`[LOGIN FAILED] Reason: Password mismatch.`);
            return res.status(400).json({ message: 'Invalid Registration Number or Password' });
        }

        console.log(`[LOGIN SUCCESS] User authenticated: ${regNo}`);

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token, 
                    role: 'student',
                    user: { 
                        id: user.id, 
                        name: user.name, 
                        regNo: user.regNo, 
                        role: 'student',
                        completedTasks: user.completedTasks 
                    } 
                });
            }
        );
    } catch (err) {
        console.error(`[LOGIN ERROR] Server error: ${err.message}`);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/me
// @desc    Get current user data
router.get('/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id).select('-dob').populate('submissions');
        res.json(user);
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
});

// @route   PUT api/auth/update-lab
// @desc    Update user's selected lab
router.put('/update-lab', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.selectedLab = req.body.lab;
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
