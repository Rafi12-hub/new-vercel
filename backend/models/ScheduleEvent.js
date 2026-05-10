const mongoose = require('mongoose');

const ScheduleEventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    type: { 
        type: String, 
        enum: ['unlock', 'test', 'deadline', 'announcement', 'lab'],
        default: 'lab'
    },
    labName: { type: String },
    section: { type: String },
    year: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    color: { type: String, default: '#8254ee' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduleEvent', ScheduleEventSchema);
