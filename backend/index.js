const http = require('http');
const socketIo = require('socket.io');

require('dotenv').config();

process.env.TZ = "Asia/Kolkata";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
const express = require('express');
const cors = require('cors');
const { db, auth } = require('./config/firebase');
const { students, hods, faculty, labAdmins } = require('./config/dbHelper');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Attach io to app so routes can access it
app.locals.io = io;

// Auto-seed Database on startup if empty
(async () => {
    try {
        const usersSnapshot = await db.collection('users').limit(1).get();
        
        if (usersSnapshot.empty) {
            console.log('[AUTO-SEED] Database is empty. Seeding default accounts...');
            
            const bcrypt = require('bcryptjs');

            // Helper to create Firebase Auth user + Firestore doc
            async function createAdminUser(userData) {
                let userRecord;
                try {
                    userRecord = await auth.getUserByEmail(userData.email);
                    console.log(`[AUTO-SEED] User ${userData.email} already exists in Firebase Auth. Updating.`);
                    await auth.updateUser(userRecord.uid, { 
                        password: userData.password, 
                        displayName: userData.name,
                        disabled: false
                    });
                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        userRecord = await auth.createUser({
                            email: userData.email,
                            password: userData.password,
                            displayName: userData.name,
                            disabled: false
                        });
                        console.log(`[AUTO-SEED] Created Firebase Auth user: ${userData.email}`);
                    } else {
                        throw error;
                    }
                }

                await db.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    department: userData.department,
                    assignedLab: userData.assignedLab || null,
                    isActive: true,
                    createdAt: new Date().toISOString()
                }, { merge: true });
                console.log(`[AUTO-SEED] Firestore doc created for ${userData.email} in 'users' collection`);
                return userRecord;
            }

            // HOD
            await createAdminUser({
                name: 'Dr. HOD CSE',
                email: 'hod.cse@rgmcet.edu',
                password: 'HOD@123',
                role: 'hod',
                department: 'CSE'
            });

            // Default Faculty (main)
            await createAdminUser({
                name: 'Faculty CSE',
                email: 'faculty.cse@rgmcet.edu',
                password: 'Faculty@123',
                role: 'faculty',
                department: 'CSE',
                assignedLab: 'C'
            });

            // Faculty per lab
            const facultyAccounts = [
                { name: 'Faculty ADSAA', email: 'faculty.adsaa@rgmcet.edu', password: 'Faculty.ADSAA@123', lab: 'ADSAA', role: 'faculty', department: 'CSE' },
                { name: 'Faculty DBMS', email: 'faculty.dbms@rgmcet.edu', password: 'Faculty.DBMS@123', lab: 'DBMS', role: 'faculty', department: 'CSE' },
                { name: 'Faculty JAVA', email: 'faculty.java@rgmcet.edu', password: 'Faculty.JAVA@123', lab: 'JAVA', role: 'faculty', department: 'CSE' },
                { name: 'Faculty PYTHON', email: 'faculty.python@rgmcet.edu', password: 'Faculty.PYTHON@123', lab: 'PYTHON', role: 'faculty', department: 'CSE' },
                { name: 'Faculty OS', email: 'faculty.os@rgmcet.edu', password: 'Faculty.OS@123', lab: 'OS', role: 'faculty', department: 'CSE' },
                { name: 'Faculty CN&IP', email: 'faculty.cnip@rgmcet.edu', password: 'Faculty.CNIP@123', lab: 'CN', role: 'faculty', department: 'CSE' },
                { name: 'Faculty AI', email: 'faculty.ai@rgmcet.edu', password: 'Faculty.AI@123', lab: 'AI', role: 'faculty', department: 'CSE' },
                { name: 'Faculty ML', email: 'faculty.ml@rgmcet.edu', password: 'Faculty.ML@123', lab: 'ML', role: 'faculty', department: 'CSE' },
                { name: 'Faculty FSAD', email: 'faculty.fsad@rgmcet.edu', password: 'Faculty.FSAD@123', lab: 'FSAD', role: 'faculty', department: 'CSE' },
                { name: 'Faculty C&NS', email: 'faculty.cns@rgmcet.edu', password: 'Faculty.CNS@123', lab: 'C&NS', role: 'faculty', department: 'CSE' },
                { name: 'Faculty TNK', email: 'faculty.tnk@rgmcet.edu', password: 'Faculty.TNK@123', lab: 'TNK', role: 'faculty', department: 'CSE' },
                { name: 'Faculty C', email: 'faculty.c@rgmcet.edu', password: 'Faculty.C@123', lab: 'C', role: 'faculty', department: 'CSE' },
                { name: 'Faculty DS', email: 'faculty.ds@rgmcet.edu', password: 'Faculty.DS@123', lab: 'DS', role: 'faculty', department: 'CSE' },
            ];
            for (const f of facultyAccounts) {
                await createAdminUser({
                    name: f.name,
                    email: f.email,
                    password: f.password,
                    role: f.role,
                    department: f.department,
                    assignedLab: f.lab
                });
            }

            // Default Lab Admin (main)
            await createAdminUser({
                name: 'Lab Admin CSE',
                email: 'labadmin.cse@rgmcet.edu',
                password: 'Lab@123',
                role: 'labadmin',
                department: 'CSE',
                assignedLab: 'C'
            });

            // Lab Admins per lab
            const labAdminsList = [
                { name: 'Lab Admin ADSAA', email: 'labadmin.adsaa@rgmcet.edu', password: 'Lab.ADSAA@123', lab: 'ADSAA', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin OOPJ', email: 'labadmin.oopj@rgmcet.edu', password: 'Lab.OOPJ@123', lab: 'JAVA', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin PYTHON', email: 'labadmin.python@rgmcet.edu', password: 'Lab.PYTHON@123', lab: 'PYTHON', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin DBMS', email: 'labadmin.dbms@rgmcet.edu', password: 'Lab.DBMS@123', lab: 'DBMS', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin OS', email: 'labadmin.os@rgmcet.edu', password: 'Lab.OS@123', lab: 'OS', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin AI', email: 'labadmin.ai@rgmcet.edu', password: 'Lab.AI@123', lab: 'AI', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin ML', email: 'labadmin.ml@rgmcet.edu', password: 'Lab.ML@123', lab: 'ML', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin CN&IP', email: 'labadmin.cnip@rgmcet.edu', password: 'Lab.CNIP@123', lab: 'CN', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin C&NS', email: 'labadmin.cns@rgmcet.edu', password: 'Lab.CNS@123', lab: 'C&NS', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin FSD', email: 'labadmin.fsd@rgmcet.edu', password: 'Lab.FSD@123', lab: 'FSAD', role: 'labadmin', department: 'CSE' },
                { name: 'Lab Admin TNK', email: 'labadmin.tnk@rgmcet.edu', password: 'Lab.TNK@123', lab: 'TNK', role: 'labadmin', department: 'CSE' }
            ];
            for (const la of labAdminsList) {
                await createAdminUser({
                    name: la.name,
                    email: la.email,
                    password: la.password,
                    role: la.role,
                    department: la.department,
                    assignedLab: la.lab
                });
            }

            // Also seed old collections for backward compatibility
            // HOD
            const hodSalt = await bcrypt.genSalt(10);
            await hods.add({ 
                name: 'Dr. HOD CSE',
                email: 'hod.cse@rgmcet.edu', 
                password: await bcrypt.hash('HOD@123', hodSalt), 
                role: 'hod',
                assignedDepartment: 'CSE',
                isActive: true
            });

            for (const f of facultyAccounts) {
                const fSalt = await bcrypt.genSalt(10);
                await faculty.add({ name: f.name, email: f.email, password: await bcrypt.hash(f.password, fSalt), role: 'faculty', assignedLab: f.lab, isActive: true });
            }

            for (const la of labAdminsList) {
                const laSalt = await bcrypt.genSalt(10);
                await labAdmins.add({ name: la.name, email: la.email, password: await bcrypt.hash(la.password, laSalt), role: 'labadmin', assignedLab: la.lab, isActive: true });
            }

            // Default Student
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Syed@123', salt);
            await students.add({
                name: 'John Doe', 
                email: 'john@rgm.edu', 
                collegeName: 'RGM College', 
                branch: 'CSE', 
                section: 'A', 
                classAndYear: '2nd Year', 
                year: '2nd Year',
                regNo: '24091A0514', 
                password: hashedPassword, 
                selectedLab: 'DBMS', 
                assignedLab: 'DBMS', 
                facultyName: 'RGMCSE Faculty',
                completedTasks: 0, 
                weeklyProgress: [],
                isActive: true
            });
            console.log('[AUTO-SEED] Seeding complete.');
        }
    } catch (err) {
        console.error('[AUTO-SEED] Error:', err);
    }
})();

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    
    socket.on('securityViolation', (data) => {
        // Broadcast to all connected admins
        io.emit('adminSecurityAlert', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});

// Dynamic Lab Scheduling System
const initScheduler = require('./scheduler');
initScheduler(io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/execute', require('./routes/execute'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/security', require('./routes/security'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api', require('./routes/dashboard'));

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
