const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rgm-compiler');

        const admins = [
            { email: 'labadmin.c@platformhub.com', password: 'C@123', role: 'labadmin', name: 'C Lab Admin', assignedLab: 'C' },
            { email: 'labadmin.python@platformhub.com', password: 'Python@123', role: 'labadmin', name: 'Python Lab Admin', assignedLab: 'PYTHON' },
            { email: 'labadmin.dbms@platformhub.com', password: 'DBMS@123', role: 'labadmin', name: 'DBMS Lab Admin', assignedLab: 'DBMS' },
            { email: 'faculty.c@platformhub.com', password: 'FacultyC@123', role: 'faculty', name: 'C Faculty', assignedLab: 'C' },
            { email: 'faculty.dbms@platformhub.com', password: 'FacultyDBMS@123', role: 'faculty', name: 'DBMS Faculty', assignedLab: 'DBMS' },
        ];

        for (const admin of admins) {
            let existing = await Admin.findOne({ email: admin.email });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(admin.password, salt);
            if (!existing) {
                await Admin.create({ ...admin, password: hashedPassword });
                console.log(`Created ${admin.role}: ${admin.email}`);
            } else {
                existing.password = hashedPassword;
                existing.assignedLab = admin.assignedLab;
                existing.role = admin.role;
                existing.name = admin.name;
                await existing.save();
                console.log(`Updated ${admin.role}: ${admin.email}`);
            }
        }
        console.log('Admin seeding complete.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmins();
