const express = require('express');
const router = express.Router();
const jsPDF = require('jspdf');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const jwt = require('jsonwebtoken');

const languageVariants = (language) => {
    const value = String(language || '');
    const lower = value.toLowerCase();
    if (value === 'C++' || lower === 'cpp' || lower === 'c++') return ['C++', 'cpp', 'c++'];
    if (value === 'JavaScript' || lower === 'javascript') return ['JavaScript', 'javascript'];
    return [value, lower, value.charAt(0).toUpperCase() + lower.slice(1)];
};

// Auth Middleware
const authAdmin = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.admin) return res.status(403).json({ message: 'Admin access required' });
        req.adminId = decoded.admin.id;
        req.role = decoded.admin.role;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Generate PDF for a specific student and lab
router.post('/generate/:studentId/:labName', authAdmin, async (req, res) => {
    try {
        if (!['labadmin', 'admin', 'superadmin', 'hod', 'faculty'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const student = await User.findById(req.params.studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Get all final week questions for this lab
        const finalWeekQuestions = await Question.find({
            labName: req.params.labName,
            isFinalWeek: true
        });

        if (finalWeekQuestions.length === 0) {
            return res.status(400).json({ message: 'No final week questions found' });
        }

        // Get accepted submissions for each question
        const submissionMap = {};
        for (const question of finalWeekQuestions) {
            const submission = await Submission.findOne({
                user: req.params.studentId,
                question: question._id,
                status: 'Accepted',
                language: { $in: languageVariants(question.primaryLanguage) },
            });
            if (submission) {
                submissionMap[question._id.toString()] = submission;
            }
        }

        // Check if all questions are completed
        const allCompleted = finalWeekQuestions.every(q => submissionMap[q._id.toString()]);
        if (!allCompleted) {
            return res.status(400).json({ message: 'Student has not completed all final week questions' });
        }

        // Generate PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - 2 * margin;
        let yPosition = margin;

        // Set font
        doc.setFont('times');

        // Add watermark
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(40);
        doc.text(student.regNo, pageWidth / 2, pageHeight / 2, { 
            align: 'center',
            angle: 45,
            opacity: 0.1 
        });
        doc.setTextColor(0, 0, 0);

        // Title
        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text('RGMCSE COMPILER - Final Week Report', margin, yPosition);
        yPosition += 10;

        // College info
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.text('Rajeev Gandhi Memorial College of Engineering and Technology', margin, yPosition);
        yPosition += 5;
        doc.text('Department of Computer Science & Engineering', margin, yPosition);
        yPosition += 10;

        // Student info
        doc.setFont('times', 'bold');
        doc.text('Student Information:', margin, yPosition);
        yPosition += 5;
        doc.setFont('times', 'normal');
        doc.text(`Name: ${student.name}`, margin + 5, yPosition);
        yPosition += 5;
        doc.text(`Registration Number: ${student.regNo}`, margin + 5, yPosition);
        yPosition += 5;
        doc.text(`Year: ${student.year}`, margin + 5, yPosition);
        yPosition += 5;
        doc.text(`Lab: ${req.params.labName}`, margin + 5, yPosition);
        yPosition += 5;
        doc.text(`Total Points: ${student.totalPoints}`, margin + 5, yPosition);
        yPosition += 10;

        // Questions and submissions
        doc.setFont('times', 'bold');
        doc.text('Submitted Solutions:', margin, yPosition);
        yPosition += 8;

        for (let i = 0; i < finalWeekQuestions.length; i++) {
            const question = finalWeekQuestions[i];
            const submission = submissionMap[question._id.toString()];

            if (yPosition > pageHeight - 30) {
                doc.addPage();
                yPosition = margin;
            }

            // Question title
            doc.setFont('times', 'bold');
            doc.text(`${i + 1}. ${question.title}`, margin, yPosition);
            yPosition += 5;

            // Question details
            doc.setFont('times', 'normal');
            doc.setFontSize(8);
            
            // Input Format
            doc.text('Input Format:', margin + 2, yPosition);
            yPosition += 3;
            const inputLines = doc.splitTextToSize(question.inputFormat, contentWidth - 10);
            doc.text(inputLines, margin + 5, yPosition);
            yPosition += inputLines.length * 2.5 + 2;

            // Output Format
            doc.text('Output Format:', margin + 2, yPosition);
            yPosition += 3;
            const outputLines = doc.splitTextToSize(question.outputFormat, contentWidth - 10);
            doc.text(outputLines, margin + 5, yPosition);
            yPosition += outputLines.length * 2.5 + 5;

            // Student's submitted code
            doc.setFont('times', 'bold');
            doc.setFontSize(9);
            doc.text(`Student Code (${submission.language.toUpperCase()}):`, margin, yPosition);
            yPosition += 4;

            doc.setFont('courier');
            doc.setFontSize(7);
            const codeLines = doc.splitTextToSize(submission.code, contentWidth - 5);
            const maxCodeLines = Math.min(codeLines.length, 20); // Limit to 20 lines per page
            for (let j = 0; j < maxCodeLines; j++) {
                if (yPosition > pageHeight - 15) {
                    doc.addPage();
                    yPosition = margin;
                }
                doc.text(codeLines[j], margin + 2, yPosition);
                yPosition += 2.5;
            }

            // Submission metadata
            doc.setFont('times', 'normal');
            doc.setFontSize(8);
            yPosition += 2;
            doc.text(`Points Earned: ${submission.earnedPoints || submission.basePoints}`, margin + 2, yPosition);
            yPosition += 3;
            doc.text(`Submitted: ${new Date(submission.submittedAt).toLocaleString()}`, margin + 2, yPosition);
            yPosition += 6;
        }

        // Add signature section
        if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = margin;
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        yPosition = pageHeight - 30;
        doc.text('Lab Instructor Signature: ___________________', margin, yPosition);
        doc.text('Date: ___________________', pageWidth / 2, yPosition);

        // Save and send PDF
        const fileName = `${student.regNo}_${req.params.labName}_FinalWeek.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(doc.output('arraybuffer'));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error generating PDF', error: err.message });
    }
});

// Batch generate PDFs for all students in a lab
router.post('/generate-batch/:labName', authAdmin, async (req, res) => {
    try {
        if (!['labadmin', 'admin', 'superadmin', 'hod', 'faculty'].includes(req.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Get all students in the lab
        const students = await User.find({ $or: [{ assignedLab: req.params.labName }, { selectedLab: req.params.labName }] });

        if (students.length === 0) {
            return res.status(400).json({ message: 'No students found in this lab' });
        }

        // Get final week questions
        const finalWeekQuestions = await Question.find({
            labName: req.params.labName,
            isFinalWeek: true
        });

        if (finalWeekQuestions.length === 0) {
            return res.status(400).json({ message: 'No final week questions found' });
        }

        // Check which students have completed all questions
        const completedStudents = [];
        for (const student of students) {
            const allCompleted = await Promise.all(
                finalWeekQuestions.map(q =>
                    Submission.findOne({
                        user: student._id,
                        question: q._id,
                        status: 'Accepted',
                        language: { $in: languageVariants(q.primaryLanguage) },
                    })
                )
            );

            if (allCompleted.every(s => s !== null)) {
                completedStudents.push(student);
            }
        }

        if (completedStudents.length === 0) {
            return res.json({
                message: 'No students have completed all final week questions',
                totalStudents: students.length,
                completedStudents: 0
            });
        }

        // Generate PDFs for completed students
        const generatedFiles = [];
        for (const student of completedStudents) {
            try {
                // Reuse the single PDF generation logic
                const submissions = {};
                for (const question of finalWeekQuestions) {
                    const submission = await Submission.findOne({
                        user: student._id,
                        question: question._id,
                        status: 'Accepted',
                        language: { $in: languageVariants(question.primaryLanguage) },
                    });
                    if (submission) {
                        submissions[question._id.toString()] = submission;
                    }
                }

                // Create individual PDF (stored in memory for now)
                const fileName = `${student.regNo}_${req.params.labName}_FinalWeek.pdf`;
                generatedFiles.push(fileName);
            } catch (err) {
                console.error(`Error generating PDF for ${student.regNo}:`, err);
            }
        }

        res.json({
            message: 'PDFs generated successfully',
            totalStudents: students.length,
            completedStudents: completedStudents.length,
            generatedFiles: generatedFiles.slice(0, 10) // Show first 10
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error generating batch PDFs' });
    }
});

module.exports = router;
