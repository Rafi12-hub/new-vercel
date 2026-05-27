const cron = require('node-cron');
const moment = require('moment-timezone');
const { db } = require('./config/firebase');
const { weeklyTasks, students, notifications } = require('./config/dbHelper');

// Run every minute to check for unlock schedules
const initScheduler = (socketIo) => {
    cron.schedule('* * * * *', async () => {
        try {
            const momentNow = moment().tz("Asia/Kolkata");
            const now = momentNow.toDate(); // true date for DB queries
            const currentDay = momentNow.format('dddd');
            const currentTime = momentNow.format('HH:mm');

            // 1. Check explicit unlockDateTime in weeklyTasks
            const tasksSnap = await weeklyTasks.where('isUnlocked', '==', false).get();
            
            for (const doc of tasksSnap.docs) {
                const task = doc.data();
                const taskId = doc.id;
                
                let shouldUnlock = false;
                
                // If unlockDateTime is set and <= now
                if (task.unlockDateTime) {
                    const unlockDate = task.unlockDateTime.toDate ? task.unlockDateTime.toDate() : new Date(task.unlockDateTime);
                    if (unlockDate <= now) {
                        shouldUnlock = true;
                    }
                }
                
                // If not unlocked yet, check if there is an active faculty/labadmin schedule matching
                if (!shouldUnlock) {
                    // Check users collection (for faculty/labadmins)
                    const usersSnap = await db.collection('users')
                        .where('role', 'in', ['faculty', 'labadmin'])
                        .where('assignedLab', '==', task.labName)
                        .get();
                        
                    for (const userDoc of usersSnap.docs) {
                        const user = userDoc.data();
                        
                        // Check Faculty recurring labDay schedule
                        if (user.labDay === currentDay && user.startTime) {
                            if (currentTime >= user.startTime) {
                                shouldUnlock = true;
                                break;
                            }
                        }
                        
                        // Check Lab Admin weeklyUnlock schedule
                        if (user.weeklyUnlockDay === currentDay && user.weeklyUnlockTime) {
                            if (currentTime >= user.weeklyUnlockTime) {
                                shouldUnlock = true;
                                break;
                            }
                        }
                    }
                }
                
                if (shouldUnlock) {
                    await weeklyTasks.doc(taskId).update({ isUnlocked: true });
                    console.log(`[SCHEDULER] Auto-Unlocked Week ${task.weekNumber} for ${task.labName}`);
                    
                    // Find all students matching task.labName
                    const studentsSnap = await students.where('assignedLab', '==', task.labName).get();
                    
                    for (const studentDoc of studentsSnap.docs) {
                        const studentId = studentDoc.id;
                        
                        // Create notification
                        const notifRef = await notifications.add({
                            userId: studentId,
                            text: `Week ${task.weekNumber} is now unlocked for ${task.labName}`,
                            type: 'task',
                            unread: true,
                            createdAt: new Date().toISOString()
                        });
                        
                        if (socketIo) {
                            socketIo.emit('newNotification', {
                                userId: studentId,
                                notification: {
                                    id: notifRef.id,
                                    userId: studentId,
                                    text: `Week ${task.weekNumber} is now unlocked for ${task.labName}`,
                                    type: 'task',
                                    unread: true
                                }
                            });
                        }
                    }
                    
                    if (socketIo) {
                        socketIo.emit('weekUnlocked', {
                            labName: task.labName,
                            weekNumber: task.weekNumber,
                            message: `Week ${task.weekNumber} for ${task.labName} is now unlocked!`
                        });
                    }
                }
            }

            // 2. Check deadlineDateTime for lab lock notifications
            const activeTasksSnap = await weeklyTasks.get();
            for (const doc of activeTasksSnap.docs) {
                const task = doc.data();
                if (task.deadlineDateTime) {
                    const deadline = task.deadlineDateTime.toDate ? task.deadlineDateTime.toDate() : new Date(task.deadlineDateTime);
                    if (deadline <= now) {
                        // Check if we already notified
                        const notifiedSnap = await notifications
                            .where('text', '==', `Lab Locked: Week ${task.weekNumber} is now locked for submissions!`)
                            .where('type', '==', 'danger')
                            .limit(1)
                            .get();
                            
                        if (notifiedSnap.empty) {
                            console.log(`[SCHEDULER] Auto-Locked Week ${task.weekNumber} for ${task.labName}`);
                            const studentsSnap = await students.where('assignedLab', '==', task.labName).get();
                            for (const studentDoc of studentsSnap.docs) {
                                const studentId = studentDoc.id;
                                const notifRef = await notifications.add({
                                    userId: studentId,
                                    text: `Lab Locked: Week ${task.weekNumber} is now locked for submissions!`,
                                    type: 'danger',
                                    unread: true,
                                    createdAt: new Date().toISOString()
                                });
                                
                                if (socketIo) {
                                    socketIo.emit('newNotification', {
                                        userId: studentId,
                                        notification: {
                                            id: notifRef.id,
                                            userId: studentId,
                                            text: `Lab Locked: Week ${task.weekNumber} is now locked for submissions!`,
                                            type: 'danger',
                                            unread: true
                                        }
                                    });
                                }
                            }
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
