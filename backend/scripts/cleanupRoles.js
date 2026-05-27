const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function cleanupRoles() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rgm-compiler');

    const Admin = require('../models/Admin');

    console.log('=== Role Cleanup ===\n');

    // 1. Remove obsolete roles (Director, Principal, Faculty Admin, Superadmin)
    const removed = await Admin.deleteMany({ role: { $in: ['principal', 'director', 'faculty_admin', 'superadmin'] } });
    console.log(`Removed ${removed.deletedCount} accounts with obsolete roles`);

    // 2. Convert any remaining superadmin → hod
    const converted = await Admin.updateMany(
        { role: 'superadmin' },
        { $set: { role: 'hod' } }
    );
    if (converted.modifiedCount > 0) {
        console.log(`Converted ${converted.modifiedCount} superadmin → hod`);
    }

    // 3. List remaining accounts grouped by role
    const admins = await Admin.find({}).select('name email role assignedLab isActive').lean();
    console.log('\n=== Current Admin Accounts ===');
    const byRole = {};
    admins.forEach(a => {
        byRole[a.role] = (byRole[a.role] || 0) + 1;
        console.log(`${String(a.role).padEnd(12)} | ${String(a.name || '-').padEnd(22)} | ${String(a.email || '-').padEnd(32)} | Lab: ${String(a.assignedLab || '-').padEnd(10)} | ${a.isActive !== false ? 'Active' : 'Disabled'}`);
    });

    console.log(`\nTotal: ${admins.length} admin accounts`);
    if (Object.keys(byRole).length > 0) {
        console.log(`Roles: ${Object.entries(byRole).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }

    // 4. Validate that only allowed roles exist
    const allowedRoles = ['hod', 'faculty', 'labadmin'];
    const invalidRoles = Object.keys(byRole).filter(r => !allowedRoles.includes(r));
    if (invalidRoles.length > 0) {
        console.log(`\n⚠ WARNING: Invalid roles still present: ${invalidRoles.join(', ')}`);
    } else {
        console.log('\n✓ All accounts have valid roles (hod, faculty, labadmin)');
    }

    await mongoose.disconnect();
    console.log('\nCleanup complete.');
}

cleanupRoles().catch(err => {
    console.error(err);
    process.exit(1);
});
