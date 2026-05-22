require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Question = require('./models/Question');
const Admin = require('./models/Admin');
const WeeklyTask = require('./models/WeeklyTask');
const ProgressTracking = require('./models/ProgressTracking');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await User.deleteMany();
        await Question.deleteMany();
        await Admin.deleteMany();
        await WeeklyTask.deleteMany();
        await ProgressTracking.deleteMany();

        // Create Super Admins
        await Admin.create({
            name: 'HOD CSE',
            email: 'hod@rgmcet.edu',
            password: 'HOD@1907',
            role: 'superadmin'
        });
        await Admin.create({
            name: 'Syed Aman',
            email: 'syedamanmirzanulla@gmail.com',
            password: 'Syed@1907',
            role: 'superadmin'
        });

        // Create Lab Admins
        const labAdmins = [
            { lab: 'C', email: 'c.labadmin@rgm.edu', password: 'C@123' },
            { lab: 'DS', email: 'ds.labadmin@rgm.edu', password: 'DS@123' },
            { lab: 'ADSAA', email: 'adsaa.labadmin@rgm.edu', password: 'ADSAA@123' },
            { lab: 'OS', email: 'os.labadmin@rgm.edu', password: 'OS@123' },
            { lab: 'CN', email: 'cn.labadmin@rgm.edu', password: 'CN@123' },
            { lab: 'JAVA', email: 'java.labadmin@rgm.edu', password: 'JAVA@123' },
            { lab: 'PYTHON', email: 'python.labadmin@rgm.edu', password: 'PYTHON@123' },
            { lab: 'DBMS', email: 'dbms.labadmin@rgm.edu', password: 'DBMS@123' },
            { lab: 'ML', email: 'ml.labadmin@rgm.edu', password: 'ML@123' },
            { lab: 'CNS', email: 'cns.labadmin@rgm.edu', password: 'CNS@123' },
            { lab: 'FSAD', email: 'fsad.labadmin@rgm.edu', password: 'FSAD@123' },
            { lab: 'AI', email: 'ai.labadmin@rgm.edu', password: 'AI@123' },
            { lab: 'Tinkering Lab', email: 'tinkering.labadmin@rgm.edu', password: 'TINKER@123' }
        ];

        for (const admin of labAdmins) {
            await Admin.create({
                name: `${admin.lab} Lab Admin`,
                email: admin.email,
                password: admin.password,
                role: 'labadmin',
                assignedLab: admin.lab
            });
        }

        // Add Mock Users
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Syed@123', salt);

        await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            collegeName: 'RGM College',
            branch: 'CSE',
            section: 'A',
            subjectName: 'DBMS',
            classAndYear: '2nd Year',
            facultyName: 'Dr. Smith',
            regNo: '24091A0514',
            password: hashedPassword,
            selectedLab: 'DBMS',
            completedTasks: 0,
            weeklyProgress: []
        });

        await User.create({
            name: 'Jane Smith',
            email: 'jane@example.com',
            collegeName: 'RGM College',
            branch: 'CSE',
            section: 'B',
            subjectName: 'OOP',
            classAndYear: '3rd Year',
            facultyName: 'Dr. John',
            regNo: '24091A0515',
            password: hashedPassword,
            selectedLab: 'JAVA',
            assignedLab: 'JAVA',
            completedTasks: 0,
            weeklyProgress: []
        });

        // Create a weekly task first
        const week1 = await WeeklyTask.create({
            weekNumber: 1,
            labName: 'C',
            unlockDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
            isUnlocked: true
        });

        const week2 = await WeeklyTask.create({
            weekNumber: 2,
            labName: 'JAVA',
            unlockDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
            isUnlocked: false
        });

        // Create Questions
        const questions = [
            {
                title: 'Two Sum',
                description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
                labName: 'C',
                difficulty: 'Easy',
                inputFormat: 'First line contains n (size of array). Second line contains n integers. Third line contains target.',
                outputFormat: 'Two space-separated integers representing the indices.',
                constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
                sampleTestCases: [{ input: '4\n2 7 11 15\n9', output: '0 1' }],
                hiddenTestCases: [{ input: '3\n3 2 4\n6', output: '1 2' }],
                tags: ['Array', 'Hash Table'],
                weeklyTask: week1._id
            },
            {
                title: 'Reverse String',
                description: 'Write a function that reverses a string.',
                labName: 'C',
                difficulty: 'Easy',
                inputFormat: 'A single string s.',
                outputFormat: 'The reversed string.',
                constraints: '1 <= s.length <= 10^5\ns consists of printable ascii characters.',
                sampleTestCases: [{ input: 'hello', output: 'olleh' }],
                hiddenTestCases: [{ input: 'world', output: 'dlrow' }],
                tags: ['String', 'Two Pointers'],
                weeklyTask: week1._id
            },
            {
                title: 'Merge Intervals',
                description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
                labName: 'JAVA',
                difficulty: 'Medium',
                inputFormat: 'First line n. Next n lines contain start and end.',
                outputFormat: 'Merged intervals, one per line.',
                constraints: '1 <= intervals.length <= 10^4',
                sampleTestCases: [{ input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18' }],
                hiddenTestCases: [{ input: '2\n1 4\n4 5', output: '1 5' }],
                tags: ['Array', 'Sorting'],
                weeklyTask: week2._id
            }
        ];

        const insertedQuestions = await Question.insertMany(questions);
        
        // Link questions to weeks
        week1.questions = insertedQuestions.filter(q => q.weeklyTask.equals(week1._id)).map(q => q._id);
        await week1.save();

        week2.questions = insertedQuestions.filter(q => q.weeklyTask.equals(week2._id)).map(q => q._id);
        await week2.save();

        console.log('Database seeded successfully!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
