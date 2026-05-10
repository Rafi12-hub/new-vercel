const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'superadmin' }, // superadmin, labadmin, admin (faculty)
    name: { type: String },
    assignedLab: { type: String },
    subject: { type: String },
    assignedSections: [{ type: String }],
    assignedYear: { type: String },
    labDay: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    totalQuestionsAdded: { type: Number, default: 0 },
    totalStudentsCompleted: { type: Number, default: 0 }
});

module.exports = mongoose.model('Admin', adminSchema);
