require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');
const WeeklyTask = require('./models/WeeklyTask');

const addQuestion = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Find or create Week 11 for ADSAA
        let week = await WeeklyTask.findOne({ weekNumber: 11, labName: 'ADSAA' });
        
        if (!week) {
            week = await WeeklyTask.create({
                weekNumber: 11,
                labName: 'ADSAA',
                unlockDateTime: new Date(),
                isUnlocked: true
            });
            console.log('Created Week 11 for ADSAA lab.');
        }

        const newQuestion = await Question.create({
            title: 'Merge Sort',
            description: 'Implement Merge Sort algorithm to sort an array in ascending order.',
            labName: 'ADSAA',
            difficulty: 'Medium',
            points: 20,
            solveTime: 40,
            inputFormat: 'First line contains number of elements.\nSecond line contains array elements.',
            outputFormat: 'Sorted array elements separated by spaces.',
            constraints: '1 <= n <= 10^5\n-10^9 <= arr[i] <= 10^9',
            sampleTestCases: [{ input: '5\n38 27 43 3 9', output: '3 9 27 38 43' }],
            hiddenTestCases: [
                { input: '5\n5 4 3 2 1', output: '1 2 3 4 5' }, // Reverse sorted
                { input: '6\n1 5 1 5 1 5', output: '1 1 1 5 5 5' }, // Duplicate elements
                { input: '10\n100 90 80 70 60 50 40 30 20 10', output: '10 20 30 40 50 60 70 80 90 100' } // Large input arrays (mock)
            ],
            tags: ['Sorting', 'Divide and Conquer', 'Merge Sort'],
            weeklyTask: week._id
        });

        // Add question to week
        week.questions.push(newQuestion._id);
        await week.save();

        console.log('Successfully added the "Merge Sort" question to ADSAA Week 11!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

addQuestion();
