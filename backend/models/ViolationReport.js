const mongoose = require('mongoose');

const violationReportSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    labName: { type: String, required: true },
    title: { type: String, required: true },
    details: { type: String, default: '' },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

violationReportSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('ViolationReport', violationReportSchema);
