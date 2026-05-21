const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    labName: { type: String },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    primaryLanguage: { type: String, required: true, enum: ['C', 'C++', 'Java', 'Python'] },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    constraints: { type: String, required: true },
    sampleInput: { type: String, required: true },
    sampleOutput: { type: String, required: true },
    hiddenInput: { type: String },
    hiddenOutput: { type: String },
    weekNumber: { type: Number, required: true },
    isFinalWeek: { type: Boolean, default: false },
    unlockStartTime: { type: Date },
    unlockEndTime: { type: Date },
    createdAt: { type: Date, default: Date.now },
    // Keeping original arrays for backward compatibility if needed in execute route
    sampleTestCases: [{
        input: String,
        output: String
    }],
    hiddenTestCases: [{
        input: String,
        output: String
    }],
    tags: [{ type: String }],
    weeklyTask: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyTask' }
});

module.exports = mongoose.model('Question', questionSchema);
