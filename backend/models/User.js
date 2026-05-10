const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    collegeName: { type: String },
    branch: { type: String },
    section: { type: String },
    subjectName: { type: String },
    classAndYear: { type: String },
    facultyName: { type: String },
    regNo: { type: String, required: true, unique: true },
    password: { type: String }, // Hashed password for new auth
    dob: { type: String }, // Legacy (Format: DD/MM/YYYY)
    selectedLab: { type: String },
    completedTasks: { type: Number, default: 0 },
    weeklyProgress: [{
        week: Number,
        tasksCompleted: Number
    }],
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }]
});

module.exports = mongoose.model('User', userSchema);
