const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    regNo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    year: { type: String, enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'], required: true },
    classAndYear: { type: String, enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
    assignedLab: { type: String, required: true },
    selectedLab: { type: String },
    facultyName: { type: String, required: true },
    collegeName: { type: String, default: 'Rajeev Gandhi Memorial College Of Engineering And Technology' },
    branch: { type: String, default: 'CSE' },
    section: { type: String, default: '' },
    subjectName: { type: String, default: '' },
    
    // Points & Ranking
    totalPoints: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    
    // Progress Tracking
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }],
    completedTasks: { type: Number, default: 0 },
    acceptedSubmissions: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    
    // Weekly & Monthly Progress
    weeklyProgress: [{
        week: { type: Number },
        tasksCompleted: { type: Number, default: 0 },
        totalTasks: { type: Number, default: 0 },
        progress: { type: Number, default: 0 },
        points: { type: Number, default: 0 }
    }],
    monthlyProgress: [{
        month: { type: String },
        points: { type: Number, default: 0 },
        submissions: { type: Number, default: 0 }
    }],
    
    // Security & Violations
    violations: [{
        type: { type: String, enum: ['tabswitch', 'screenshot', 'copypaste'], required: true },
        timestamp: { type: Date, default: Date.now },
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }
    }],
    violationCount: { type: Number, default: 0 },
    isCompilerLocked: { type: Boolean, default: false },
    lockedUntil: { type: Date },
    
    // Account Information
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

userSchema.pre('validate', function syncLegacyStudentFields() {
    if (!this.assignedLab && this.selectedLab) this.assignedLab = this.selectedLab;
    if (!this.selectedLab && this.assignedLab) this.selectedLab = this.assignedLab;
    if (!this.year && this.classAndYear) this.year = this.classAndYear;
    if (!this.classAndYear && this.year) this.classAndYear = this.year;
});

module.exports = mongoose.model('User', userSchema);
