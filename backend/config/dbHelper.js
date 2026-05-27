const { db } = require('./firebase');

const students = db.collection('students');
const hods = db.collection('hods');
const faculty = db.collection('faculty');
const labAdmins = db.collection('labAdmins');
const labs = db.collection('labs');
const schedules = db.collection('schedules');
const questions = db.collection('questions');
const submissions = db.collection('submissions');
const analytics = db.collection('analytics');
const notifications = db.collection('notifications');
const violations = db.collection('violations');
const generatedPDFs = db.collection('generatedPDFs');
const weeklyTasks = db.collection('weeklyTasks');

module.exports = {
    students,
    hods,
    faculty,
    labAdmins,
    labs,
    schedules,
    questions,
    submissions,
    analytics,
    notifications,
    violations,
    generatedPDFs,
    weeklyTasks
};
