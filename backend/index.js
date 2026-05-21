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
const connectDB = require('./config/db');

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

// Connect to Database
connectDB().then(async () => {
    // Auto-seed Database on startup if empty
    const User = require('./models/User');
    const Admin = require('./models/Admin');
    
    try {
        const userCount = await User.countDocuments();
        const adminCount = await Admin.countDocuments();
        
        if (adminCount === 0 && userCount === 0) {
            console.log('[AUTO-SEED] Database is empty. Seeding default accounts...');
            
            // Super Admin
            await Admin.create({ 
                email: 'hod@rgmcet.edu', 
                password: 'HOD@1907', 
                role: 'superadmin' 
            });

            // Admin
            await Admin.create({
                email: 'syedamanmirzanulla@gmail.com',
                password: 'Syed@1907',
                role: 'admin',
                name: 'Faculty Admin',
                assignedLab: 'DS',
            });

            // Lab Admins
            await Admin.create({ email: 'c.labadmin@rgm.edu', password: 'Admin@123', role: 'labadmin', assignedLab: 'C' });
            await Admin.create({ email: 'java.labadmin@rgm.edu', password: 'Admin@123', role: 'labadmin', assignedLab: 'OOPS through Java' });
            await Admin.create({ email: 'pythonadmin@platformhub.com', password: 'Admin@123', role: 'labadmin', assignedLab: 'Python' });

            // Default Student
            await User.create({
                name: 'John Doe', 
                email: 'john@rgm.edu', 
                collegeName: 'RGM College', 
                branch: 'CSE', 
                section: 'A', 
                classAndYear: '2nd Year', 
                regNo: '24091A0514', 
                dob: '26/03/2006', 
                selectedLab: 'DBMS', 
                completedTasks: 0, 
                weeklyProgress: []
            });
            console.log('[AUTO-SEED] Seeding complete.');
        }
    } catch (err) {
        console.error('[AUTO-SEED] Error:', err);
    }
});

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

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
