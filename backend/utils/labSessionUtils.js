const { schedules, faculty, labAdmins, questions } = require('../config/dbHelper');

async function isLabActive(labName) {
    if (!labName) return { active: false, reason: 'No lab specified' };

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check ScheduleEvent for currently active lab events
    const eventsSnap = await schedules.where('labName', '==', labName).where('type', '==', 'lab').get();
    let activeEvent = null;
    for (const doc of eventsSnap.docs) {
        const data = doc.data();
        const start = data.start && data.start.toDate ? data.start.toDate() : new Date(data.start);
        const end = data.end && data.end.toDate ? data.end.toDate() : new Date(data.end);
        if (start <= now && end >= now) {
            activeEvent = data;
            break;
        }
    }

    if (activeEvent) {
        return { active: true, source: 'event', event: activeEvent };
    }

    // Check Admin schedules for this lab (Faculty and Lab Admins)
    const admins = [];
    const facSnap = await faculty.where('assignedLab', '==', labName).get();
    facSnap.docs.forEach(d => admins.push(d.data()));
    
    const labAdmSnap = await labAdmins.where('assignedLab', '==', labName).get();
    labAdmSnap.docs.forEach(d => admins.push(d.data()));

    for (const admin of admins) {
        if (admin.labDay && admin.startTime && admin.endTime) {
            if (admin.labDay === currentDay) {
                if (admin.startTime <= currentHHMM && currentHHMM <= admin.endTime) {
                    return {
                        active: true,
                        source: 'admin',
                        labDay: admin.labDay,
                        startTime: admin.startTime,
                        endTime: admin.endTime,
                        facultyName: admin.name
                    };
                }
            }
        }
    }

    // Check if there are any questions for this lab with unlock windows
    const anyQuestionSnap = await questions.where('labName', '==', labName).limit(1).get();
    if (!anyQuestionSnap.empty) {
        const anyQuestion = anyQuestionSnap.docs[0].data();
        if (anyQuestion.unlockStartTime && anyQuestion.unlockEndTime) {
            const uStart = anyQuestion.unlockStartTime && anyQuestion.unlockStartTime.toDate ? anyQuestion.unlockStartTime.toDate() : new Date(anyQuestion.unlockStartTime);
            const uEnd = anyQuestion.unlockEndTime && anyQuestion.unlockEndTime.toDate ? anyQuestion.unlockEndTime.toDate() : new Date(anyQuestion.unlockEndTime);
            if (now >= uStart && now <= uEnd) {
                return { active: true, source: 'question' };
            }
        }
    }

    // Default: if no schedules exist, consider lab active to allow access
    if (!activeEvent && admins.every(a => !a.labDay)) {
        return { active: true, source: 'default', note: 'No schedule defined - access allowed' };
    }

    return { active: false, reason: 'Lab session is not currently active' };
}

module.exports = { isLabActive };
