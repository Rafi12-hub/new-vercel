const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    
    // Code & Language
    language: { type: String, required: true, enum: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'SQL', 'c', 'cpp', 'java', 'python', 'javascript', 'sql'] },
    code: { type: String, required: true },
    
    // Execution Results
    status: { type: String, enum: ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded', 'Compilation Error', 'Pending'], default: 'Pending' },
    output: { type: String },
    error: { type: String },
    
    // Test Cases
    testCasesPassed: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    sampleTestsPassed: { type: Number, default: 0 },
    hiddenTestsPassed: { type: Number, default: 0 },
    
    // Metrics
    timeComplexity: String,
    spaceComplexity: String,
    executionTime: { type: Number }, // in milliseconds
    memory: { type: Number }, // in KB
    
    // Timing & Points
    solveTime: { type: Number }, // in seconds from start to submission
    submittedAt: { type: Date, default: Date.now },
    basePoints: { type: Number, default: 0 },
    timeBonus: { type: Number, default: 0 },
    accuracyBonus: { type: Number, default: 0 },
    earnedPoints: { type: Number, default: 0 },
    
    // Attempts
    attemptNumber: { type: Number, default: 1 },
    isPreviouslyAccepted: { type: Boolean, default: false },
    
    // Metadata
    isLatestAttempt: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
