const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rgm-compiler');

        const admins = [
            { email: 'clabadmin@platformhub.com', password: 'C@123', role: 'labadmin', assignedLab: 'C' },
            { email: 'pythonadmin@platformhub.com', password: 'Python@123', role: 'labadmin', assignedLab: 'PYTHON' },
            { email: 'dbmsadmin@platformhub.com', password: 'DBMS@123', role: 'labadmin', assignedLab: 'DBMS' }
        ];

        for (const admin of admins) {
            let existing = await Admin.findOne({ email: admin.email });
            if (!existing) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(admin.password, salt);
                await Admin.create({ ...admin, password: hashedPassword });
                console.log(`Created admin: ${admin.email}`);
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(admin.password, salt);
                existing.password = hashedPassword;
                existing.assignedLab = admin.assignedLab;
                await existing.save();
                console.log(`Updated admin: ${admin.email}`);
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
