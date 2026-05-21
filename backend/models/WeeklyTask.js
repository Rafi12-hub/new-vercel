const mongoose = require('mongoose');

const weeklyTaskSchema = new mongoose.Schema({
    weekNumber: { type: Number, required: true },
    labName: { type: String, required: true },
    assignedFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    unlockDay: { type: String }, // e.g., "Thursday"
    unlockTime: { type: String }, // e.g., "10:30"
    unlockDateTime: { type: Date }, // Actual calculated date
    deadlineDateTime: { type: Date }, // For student dashboard alerts
    isUnlocked: { type: Boolean, default: false },
    isFinalWeek: { type: Boolean, default: false },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
});

module.exports = mongoose.model('WeeklyTask', weeklyTaskSchema);
