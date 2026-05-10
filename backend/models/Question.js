const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    labName: { type: String },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    constraints: { type: String, required: true },
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
