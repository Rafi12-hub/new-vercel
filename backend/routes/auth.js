const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize DOB for comparison: accepts DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD */
function normalizeDobInput(input) {
    if (input == null) return '';
    const raw = String(input).trim();
    if (!raw) return '';
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const [, y, m, d] = iso;
        return `${d}/${m}/${y}`;
    }
    const slash = raw.replace(/-/g, '/').split('/').map((p) => p.trim());
    if (slash.length !== 3) return raw.toLowerCase();
    const [a, b, c] = slash;
    let day;
    let month;
    let year;
    if (c.length === 4) {
        day = a.padStart(2, '0');
        month = b.padStart(2, '0');
        year = c;
    } else if (a.length === 4) {
        year = a;
        month = b.padStart(2, '0');
        day = c.padStart(2, '0');
    } else {
        day = a.padStart(2, '0');
        month = b.padStart(2, '0');
        year = c.length === 2 ? `20${c}` : c;
    }
    return `${day}/${month}/${year}`;
}

// =====================================
// Student Authentication Routes
// =====================================

/**
 * Student login: Registration Number + Date of Birth (DOB).
 * Registration number match is case-insensitive.
 */
router.post('/login', async (req, res) => {
    const { regNo, dob } = req.body;

    if (!regNo || !dob) {
        return res.status(400).json({ message: 'Registration number and date of birth are required' });
    }

    const regTrim = String(regNo).trim();
    const regPattern = new RegExp(`^${escapeRegExp(regTrim)}$`, 'i');

    try {
        const user = await User.findOne({ regNo: regPattern });

        if (!user) {
            return res.status(400).json({ message: 'Invalid registration number or date of birth' });
        }

        const entered = normalizeDobInput(dob);
        const stored = normalizeDobInput(user.dob || '');
        const isMatch = entered === stored;

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid registration number or date of birth' });
        }

        const payload = {
            user: {
                id: user.id,
                role: 'student',
            },
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                role: 'student',
                user: {
                    id: user.id,
                    name: user.name,
                    regNo: user.regNo,
                    role: 'student',
                    completedTasks: user.completedTasks,
                },
            });
        });
    } catch (err) {
        console.error(`[LOGIN ERROR] ${err.message}`);
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
        const user = await User.findById(decoded.user.id)
            .select('-dob')
            .populate({
                path: 'submissions',
                options: { sort: { submittedAt: -1 } },
                populate: {
                    path: 'question',
                    select: 'title difficulty labName weeklyTask description sampleTestCases primaryLanguage',
                    populate: { path: 'weeklyTask', select: 'weekNumber isUnlocked unlockDateTime labName' }
                }
            });
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
