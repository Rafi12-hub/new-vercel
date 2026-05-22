const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'hod', 'faculty', 'labadmin', 'admin'], default: 'superadmin' },
    name: { type: String, required: true },
    assignedLab: { type: String },
    assignedDepartment: { type: String, default: 'CSE' },
    
    // Lab Scheduling
    labDay: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    weeklyUnlockDay: { type: String },
    weeklyUnlockTime: { type: String },
    
    // Statistics
    totalQuestionsAdded: { type: Number, default: 0 },
    totalStudentsAssigned: { type: Number, default: 0 },
    totalStudentsCompleted: { type: Number, default: 0 },
    
    // Questions Management
    questionsManaged: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    
    // Assigned Students (for faculty/lab admin)
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Admin', adminSchema);
