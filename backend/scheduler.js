const cron = require('node-cron');
const moment = require('moment-timezone');
const WeeklyTask = require('./models/WeeklyTask');
const User = require('./models/User');
const Notification = require('./models/Notification');

// Run every minute to check for unlock schedules
const initScheduler = (socketIo) => {
    cron.schedule('* * * * *', async () => {
        try {
            const Admin = require('./models/Admin');
            const momentNow = moment().tz("Asia/Kolkata");
            const now = momentNow.toDate(); // true UTC date for DB queries
            const currentDay = momentNow.format('dddd');
            const currentTime = momentNow.format('HH:mm');
            
            // 1. Check explicit unlockDateTime in WeeklyTask
            const tasksByDate = await WeeklyTask.find({
                isUnlocked: false,
                unlockDateTime: { $lte: now }
            });

            // 2. Check recurring Faculty schedules (Unlock tasks if within schedule)
            const faculties = await Admin.find({ 
                role: { $in: ['admin', 'labadmin'] },
                labDay: currentDay
            });

            const tasksBySchedule = [];
            for (const faculty of faculties) {
                if (!faculty.startTime || !faculty.endTime) continue;
                
                // If current time is within the lab slot (or just passed start time)
                if (currentTime >= faculty.startTime) {
                    // Find the next available week for this lab
                    const task = await WeeklyTask.findOne({
                        labName: faculty.assignedLab,
                        isUnlocked: false
                    }).sort({ weekNumber: 1 });
                    
                    if (task) tasksBySchedule.push(task);
                }
            }

            const labAdmins = await Admin.find({
                role: 'labadmin',
                weeklyUnlockDay: currentDay,
                weeklyUnlockTime: { $nin: [null, ''] }
            });

            const tasksByLabAdminSchedule = [];
            for (const la of labAdmins) {
                if (!la.assignedLab || !la.weeklyUnlockTime) continue;
                if (currentTime < la.weeklyUnlockTime) continue;
                const task = await WeeklyTask.findOne({
                    labName: la.assignedLab,
                    isUnlocked: false
                }).sort({ weekNumber: 1 });
                if (task) tasksByLabAdminSchedule.push(task);
            }

            // Combine and unique tasks
            const allTasks = [...tasksByDate, ...tasksBySchedule, ...tasksByLabAdminSchedule];
            const uniqueTaskIds = [...new Set(allTasks.map(t => t._id.toString()))];
            
            for (const id of uniqueTaskIds) {
                const task = await WeeklyTask.findById(id);
                if (!task || task.isUnlocked) continue;

                task.isUnlocked = true;
                await task.save();
                
                console.log(`[SCHEDULER] Auto-Unlocked Week ${task.weekNumber} for ${task.labName}`);
                
                // Find all students matching task.labName
                const students = await User.find({ selectedLab: task.labName });
                
                for (const student of students) {
                    const newNotification = new Notification({
                        userId: student._id,
                        text: `Week ${task.weekNumber} is now unlocked for ${task.labName}`,
                        type: 'task',
                        unread: true
                    });
                    await newNotification.save();

                    if (socketIo) {
                        socketIo.emit('newNotification', {
                            userId: student._id,
                            notification: newNotification
                        });
                    }
                }

                if (socketIo) {
                    const update = {
                        labName: task.labName,
                        weekNumber: task.weekNumber,
                        message: `Week ${task.weekNumber} for ${task.labName} is now unlocked!`
                    };
                    socketIo.emit('weekUnlocked', update);
                }
            }

            // 3. Check deadlineDateTime for lab lock notifications
            const tasksByDeadline = await WeeklyTask.find({
                deadlineDateTime: { $lte: now }
            });

            for (const task of tasksByDeadline) {
                const checkNotified = await Notification.findOne({
                    text: `Lab Locked: Week ${task.weekNumber} is now locked for submissions!`,
                    type: 'danger'
                });

                if (!checkNotified) {
                    console.log(`[SCHEDULER] Auto-Locked Week ${task.weekNumber} for ${task.labName}`);
                    
                    const students = await User.find({ selectedLab: task.labName });
                    for (const student of students) {
                        const newNotification = new Notification({
                            userId: student._id,
                            text: `Lab Locked: Week ${task.weekNumber} is now locked for submissions!`,
                            type: 'danger',
                            unread: true
                        });
                        await newNotification.save();

                        if (socketIo) {
                            socketIo.emit('newNotification', {
                                userId: student._id,
                                notification: newNotification
                            });
                        }
                    }
                }
            }

            if (socketIo) {
                socketIo.emit('scheduleCheck'); // Pulse to let clients check if their current lab is open/closed
            }
        } catch (err) {
            console.error('[SCHEDULER ERROR]', err);
        }
    });
    console.log('[SCHEDULER] Auto-unlock cron job started.');
};

module.exports = initScheduler;
