const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    labName: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    
    // Code & I/O
    primaryLanguage: { type: String, required: true, enum: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'SQL', 'c', 'cpp', 'java', 'python', 'javascript', 'sql'] },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    constraints: { type: String, required: true },
    
    // Test Cases
    sampleInput: { type: String, required: true },
    sampleOutput: { type: String, required: true },
    hiddenInput: { type: String, required: true },
    hiddenOutput: { type: String, required: true },
    
    // Test Case Arrays (for backward compatibility)
    sampleTestCases: [{
        input: String,
        output: String
    }],
    hiddenTestCases: [{
        input: String,
        output: String
    }],
    
    // Week & Availability
    weekNumber: { type: Number, required: true },
    isFinalWeek: { type: Boolean, default: false },
    unlockStartTime: { type: Date },
    unlockEndTime: { type: Date },
    
    // Scoring
    basePoints: { type: Number, default: 100 },
    timeBonus: { type: Number, default: 0 },
    maxTimeForFullPoints: { type: Number, default: 60 }, // in minutes
    
    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    tags: [{ type: String }],
    weeklyTask: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyTask' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    
    // Statistics
    totalAttempts: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 }
});

module.exports = mongoose.model('Question', questionSchema);
