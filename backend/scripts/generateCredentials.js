const fs = require('fs');
const path = require('path');
const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
    ShadingType, TableLayoutType
} = require('docx');

const outputPath = path.join(__dirname, '..', 'amans_file.docx');

async function generateCredentials() {
    const mongoose = require('mongoose');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rgmcompiler');

    const Admin = require('../models/Admin');
    const User = require('../models/User');

    const admins = await Admin.find({}).lean();
    const students = await User.find({}).lean();

    // Separate admins by role
    const hods = admins.filter(a => a.role === 'hod');
    const faculty = admins.filter(a => a.role === 'faculty');
    const labAdmins = admins.filter(a => a.role === 'labadmin');

    // Helper: create a styled header row
    function headerRow(cells, shadeColor = '1a1a2e') {
        return new TableRow({
            tableHeader: true,
            children: cells.map(text => new TableCell({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text, bold: true, color: 'ffffff', size: 20, font: 'Calibri' })]
                })],
                shading: { type: ShadingType.SOLID, color: shadeColor },
                width: { size: 25, type: WidthType.PERCENTAGE }
            }))
        });
    }

    function dataRow(cells, alt = false) {
        return new TableRow({
            children: cells.map(text => new TableCell({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: String(text), size: 18, font: 'Calibri', color: alt ? '#cccccc' : '#ffffff' })]
                })],
                shading: { type: ShadingType.SOLID, color: alt ? '16213e' : '0f3460' }
            }))
        });
    }

    const sections = [];

    // Title
    sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'RGMCSE Compiler Platform', bold: true, size: 36, color: 'e7c965', font: 'Calibri' })]
    }));
    sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'User Credentials Report', size: 28, color: '8254ee', font: 'Calibri' })]
    }));
    sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-GB')}`, size: 18, color: '888888', font: 'Calibri' })]
    }));

    // ============== HOD CREDENTIALS ==============
    sections.push(new Paragraph({
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: 'HOD Credentials', bold: true, size: 24, color: 'ff5c5c', font: 'Calibri' })]
    }));
    if (hods.length > 0) {
        sections.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                headerRow(['S.No', 'Name', 'Email', 'Password', 'Role']),
                ...hods.map((a, i) => dataRow([String(i + 1), a.name || '-', a.email, a.password || '-', a.role], i % 2 === 1))
            ]
        }));
    } else {
        sections.push(new Paragraph({ children: [new TextRun({ text: 'No HOD accounts found.', color: '888888' })] }));
    }

    // ============== FACULTY CREDENTIALS ==============
    sections.push(new Paragraph({
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: 'Faculty Credentials', bold: true, size: 24, color: '34d399', font: 'Calibri' })]
    }));
    if (faculty.length > 0) {
        sections.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                headerRow(['S.No', 'Name', 'Email', 'Password', 'Lab', 'Role']),
                ...faculty.map((a, i) => dataRow([String(i + 1), a.name || '-', a.email, a.password || '-', a.assignedLab || '-', a.role], i % 2 === 1))
            ]
        }));
    } else {
        sections.push(new Paragraph({ children: [new TextRun({ text: 'No Faculty accounts found.', color: '888888' })] }));
    }

    // ============== LAB ADMIN CREDENTIALS ==============
    sections.push(new Paragraph({
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: 'Lab Admin Credentials', bold: true, size: 24, color: 'e7c965', font: 'Calibri' })]
    }));
    if (labAdmins.length > 0) {
        sections.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                headerRow(['S.No', 'Name', 'Email', 'Password', 'Assigned Lab', 'Role']),
                ...labAdmins.map((a, i) => dataRow([String(i + 1), a.name || '-', a.email, a.password || '-', a.assignedLab || '-', a.role], i % 2 === 1))
            ]
        }));
    } else {
        sections.push(new Paragraph({ children: [new TextRun({ text: 'No Lab Admin accounts found.', color: '888888' })] }));
    }

    // ============== STUDENT SAMPLE ==============
    sections.push(new Paragraph({
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: 'Student Accounts (Sample - First 50)', bold: true, size: 24, color: '06b6d4', font: 'Calibri' })]
    }));
    const sampleStudents = students.slice(0, 50);
    if (sampleStudents.length > 0) {
        sections.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                headerRow(['S.No', 'Name', 'Reg No', 'DOB (Password)', 'Year', 'Semester', 'Lab', 'Section']),
                ...sampleStudents.map((s, i) => dataRow([
                    String(i + 1), s.name || '-', s.regNo || '-',
                    s.dateOfBirth || 'DOB not set', s.year || '-',
                    s.semester || '-', s.assignedLab || s.selectedLab || '-',
                    s.section || '-'
                ], i % 2 === 1))
            ]
        }));
        sections.push(new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: `Showing ${Math.min(50, students.length)} of ${students.length} total students.`, size: 16, color: '888888', font: 'Calibri' })]
        }));
    } else {
        sections.push(new Paragraph({ children: [new TextRun({ text: 'No student accounts found.', color: '888888' })] }));
    }

    // Footer note
    sections.push(new Paragraph({
        spacing: { before: 400 },
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: '333333' } },
        children: [new TextRun({ text: 'RGMCSE Compiler Platform - Confidential', size: 16, color: '666666', font: 'Calibri' })]
    }));

    const doc = new Document({
        title: 'RGMCSE Credentials',
        description: 'User credentials for RGMCSE Compiler Platform',
        styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
        sections: [{ children: sections }]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Credentials file generated at: ${outputPath}`);

    await mongoose.disconnect();
}

generateCredentials().catch(err => {
    console.error('Error generating credentials:', err);
    process.exit(1);
});
