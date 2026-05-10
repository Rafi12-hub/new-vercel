const cron = require('node-cron');
const WeeklyTask = require('./models/WeeklyTask');
// const io = require('./server').io; // Removed as socketIo is passed to initScheduler

// Run every minute to check for unlock schedules
const initScheduler = (socketIo) => {
    cron.schedule('* * * * *', async () => {
        try {
            const Admin = require('./models/Admin');
            const now = new Date();
            const currentDay = now.toLocaleString('en-US', { weekday: 'long' });
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            
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

            // Combine and unique tasks
            const allTasks = [...tasksByDate, ...tasksBySchedule];
            const uniqueTaskIds = [...new Set(allTasks.map(t => t._id.toString()))];
            
            for (const id of uniqueTaskIds) {
                const task = await WeeklyTask.findById(id);
                if (!task || task.isUnlocked) continue;

                task.isUnlocked = true;
                await task.save();
                
                console.log(`[SCHEDULER] Auto-Unlocked Week ${task.weekNumber} for ${task.labName}`);
                
                if (socketIo) {
                    const update = {
                        labName: task.labName,
                        weekNumber: task.weekNumber,
                        message: `Week ${task.weekNumber} for ${task.labName} is now unlocked!`
                    };
                    socketIo.emit('weekUnlocked', update);
                    socketIo.emit('notification', {
                        text: update.message,
                        type: 'task',
                        labName: task.labName
                    });
                }
            }
        } catch (err) {
            console.error('[SCHEDULER ERROR]', err);
        }
    });
    console.log('[SCHEDULER] Auto-unlock cron job started.');
};

module.exports = initScheduler;
