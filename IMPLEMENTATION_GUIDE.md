# RGMCSE COMPILER - Complete Implementation Guide

## 🎓 Project Overview
RGMCSE COMPILER is a premium AI-powered coding platform for **Rajeev Gandhi Memorial College of Engineering and Technology**. It provides students with a complete lab management, code compilation, and assessment system with real-time tracking and analytics.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure your environment
npm run dev          # Start development server
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev          # Start Vite dev server
```

The application will be available at `http://localhost:5173`

---

## 🔐 Authentication & Test Credentials

### Student Login
- **Registration Number**: 24091A0514
- **Password**: 123456

### Admin/Faculty/Lab Admin/HOD Login
- **Email**: syedamanmirzanulla@gmail.com
- **Password**: Syed@123
- **Available Roles**: Faculty, Lab Admin, HOD (toggle in UI)

---

## 📚 Key Features Implemented

### 1. **Role-Based Access Control**
- ✅ **Student**: Access only their assigned lab and questions
- ✅ **Faculty**: Manage course materials and student tracking
- ✅ **Lab Admin**: Manage questions, test cases, and student analytics
- ✅ **HOD**: Department-wide analytics and reporting

### 2. **Code Compilation & Execution**
Supported Languages:
- C
- C++
- Java
- Python
- JavaScript
- SQL

Features:
- Local code compilation
- Sample test case execution
- Hidden test case validation
- Real-time output and error reporting
- Syntax highlighting with Monaco Editor

### 3. **Points & Scoring System**
- Base points per question (configurable by Lab Admin)
- Time bonus for fast solutions
- Automatic points calculation and storage
- Success rate tracking
- Real-time point updates via Socket.IO

### 4. **Lab Management**
Supported Labs (11 total):
1. **C** - C Programming Fundamentals
2. **DS** - Data Structures
3. **ADSAA** - Advanced Data Structures & Algorithms
4. **JAVA** - OOPS through Java
5. **PYTHON** - Python Programming
6. **DBMS** - Database Management Systems
7. **OS** - Operating Systems
8. **CN** - Computer Networks
9. **AI** - Artificial Intelligence
10. **ML** - Machine Learning
11. **FSAD** - Full Stack Application Development

### 5. **Security Features**
- ✅ Tab-switch detection and violation reporting
- ✅ Screenshot prevention with instant compiler lock
- ✅ Copy/paste disabled in editor
- ✅ Violation counter with auto-lock after 3 violations
- ✅ Violation tracking and admin notification
- ✅ Security violation reports for Lab Admins

### 6. **Analytics & Dashboards**
- ✅ **Student Dashboard**: Points, rank, weekly/monthly progress, submission history
- ✅ **Lab Admin Dashboard**: Student analytics, question difficulty stats, violation reports
- ✅ **HOD Dashboard**: Department-wide analytics, year-wise breakdown, best students by language

### 7. **PDF Generation**
- Individual student PDFs with:
  - Student information
  - All submitted code for final week
  - Submission details (language, points, timestamp)
  - Watermark with registration number
  - Professional formatting (Times New Roman, 10pt)

### 8. **Week/Schedule Management**
- Week-based question release
- Configurable unlock/lock times
- Timezone: Asia/Kolkata (India Standard Time)
- Final week marking for PDF generation
- Auto-unlock via scheduler

### 9. **Real-Time Updates**
Socket.IO Events:
- Submission notifications
- Points updates
- Acceptance announcements
- Security violation alerts
- Leaderboard updates

---

## 📁 Database Schema

### User Model
```javascript
{
  name, email, regNo, password, year,
  assignedLab, facultyName,
  totalPoints, rank,
  acceptedSubmissions, totalSubmissions, successRate,
  weeklyProgress, monthlyProgress,
  violations (array), violationCount,
  isCompilerLocked, lockedUntil,
  submissions (array of IDs),
  createdAt, updatedAt, isActive
}
```

### Question Model
```javascript
{
  title, description, labName, difficulty,
  primaryLanguage, inputFormat, outputFormat, constraints,
  sampleInput, sampleOutput, sampleTestCases,
  hiddenInput, hiddenOutput, hiddenTestCases,
  weekNumber, isFinalWeek,
  basePoints, timeBonus, maxTimeForFullPoints,
  unlockStartTime, unlockEndTime,
  createdBy (Admin ID),
  tags, weeklyTask (ID),
  totalAttempts, totalAccepted
}
```

### Submission Model
```javascript
{
  user (ID), question (ID),
  language, code,
  status, output, error,
  testCasesPassed, totalTestCases,
  sampleTestsPassed, hiddenTestsPassed,
  timeComplexity, spaceComplexity,
  executionTime, memory,
  solveTime, basePoints, timeBonus, earnedPoints,
  attemptNumber, isPreviouslyAccepted,
  isLatestAttempt,
  submittedAt, createdAt, updatedAt
}
```

### Admin Model
```javascript
{
  email, password, role (superadmin/hod/faculty/labadmin), name,
  assignedLab, assignedDepartment,
  labDay, startTime, endTime,
  weeklyUnlockDay, weeklyUnlockTime,
  totalQuestionsAdded, totalStudentsAssigned,
  questionsManaged, assignedStudents,
  createdAt, updatedAt, isActive
}
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - Student login
- `GET /api/auth/me` - Get current student
- `POST /api/admin/login` - Admin login
- `GET /api/admin/me` - Get current admin

### Questions
- `GET /api/questions` - List questions (filtered by student's lab)
- `GET /api/questions/:id` - Get question details
- `POST /api/questions/create` - Create question (Lab Admin only)
- `PUT /api/questions/:id` - Update question (Lab Admin only)
- `DELETE /api/questions/:id` - Delete question (Lab Admin only)

### Code Execution
- `POST /api/execute/run` - Run against sample test cases
- `POST /api/execute/submit` - Submit solution (hidden + sample tests)

### Analytics
- `GET /api/analytics/student/stats` - Student dashboard stats
- `GET /api/analytics/student/submissions` - Student submission history
- `GET /api/analytics/lab/students` - Lab students analytics (Lab Admin)
- `GET /api/analytics/lab/questions` - Lab questions analytics (Lab Admin)
- `GET /api/analytics/hod/dashboard` - Department analytics (HOD only)
- `POST /api/analytics/violation/report` - Report security violation
- `GET /api/analytics/lab/violations` - Get lab violations (Lab Admin)

### PDF Generation
- `POST /api/pdf/generate/:studentId/:labName` - Generate individual PDF
- `POST /api/pdf/generate-batch/:labName` - Generate batch PDFs for all completed students

---

## 🎨 UI/UX Design

### Color Scheme
- **Background**: #090909 (Dark Gray)
- **Primary Accent**: #8254ee (Purple)
- **Secondary Accent**: #e7c965 (Gold)
- **Text**: #c1cfc1 (Light Gray)
- **Success**: #00d084 (Green)
- **Error**: #ef4444 (Red)

### Typography
- **Global Font**: Times New Roman
- **Editor Font**: Monaco/Courier (18px)
- **Console Font**: Monospace (16px)
- **UI Elements**: Times New Roman (varying sizes)

### Effects
- Glassmorphism containers
- Smooth animations with Framer Motion
- Real-time confetti on success
- Floating points animation on acceptance
- Gradient backgrounds

---

## 🔧 Configuration

### Environment Variables (.env)
```
MONGODB_URI=mongodb://localhost:27017/rgmcse
JWT_SECRET=your_jwt_secret_here
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_judge0_key_here
PORT=5000
```

### Timezone
- Set globally to Asia/Kolkata in `backend/index.js`
- All times displayed in IST

---

## 📊 Usage Examples

### For Students
1. Register with name, email, reg number, year, assigned lab
2. Login with registration number
3. View assigned lab questions
4. Code solutions in Monaco editor with multiple languages
5. Run against sample test cases
6. Submit solution (validates hidden test cases)
7. Earn points automatically on acceptance
8. Track progress and rankings in dashboard

### For Lab Admins
1. Login as Lab Admin
2. Create questions with:
   - Question details and constraints
   - Sample and hidden test cases
   - Points configuration
   - Week number and unlock times
3. View student analytics
4. Track submission success rates
5. Monitor security violations
6. Generate PDFs for final week

### For HOD
1. Login as HOD/Super Admin
2. View department-wide analytics
3. See year-wise and lab-wise breakdowns
4. Identify best students by programming language
5. Monitor overall system usage

---

## 🔒 Security Measures

### Implemented
1. **JWT Authentication** - Secure token-based auth
2. **Password Hashing** - bcryptjs with salt
3. **Copy/Paste Prevention** - Disabled in editor
4. **Screenshot Prevention** - PrintScreen and shortcuts blocked
5. **Tab-Switch Detection** - Warns and reports violations
6. **Violation Tracking** - Auto-lock after 3 violations
7. **Socket.IO Auth** - Authenticated connections only
8. **CORS Protection** - Configured for frontend origin

### Recommendations
1. Use HTTPS in production
2. Implement rate limiting
3. Add CSRF protection
4. Use environment variables for secrets
5. Regular security audits

---

## 🚨 Common Issues & Solutions

### Issue: "Lab is currently closed"
**Solution**: Check question unlock times. Ensure current time is between `unlockStartTime` and `unlockEndTime`.

### Issue: Code execution fails
**Solution**: Ensure required compilers are installed:
- For C/C++: `gcc` and `g++`
- For Java: `java` and `javac`
- For Python: `python3`
- For Node.js: `node`

### Issue: Database connection fails
**Solution**: 
1. Ensure MongoDB is running
2. Check MONGODB_URI in .env
3. Verify database name

### Issue: Socket.IO events not received
**Solution**:
1. Check browser console for connection errors
2. Ensure CORS origin matches frontend URL
3. Verify Socket.IO package versions match

---

## 📈 Scalability Considerations

### Database Optimization
- Add indexes on frequently queried fields
- Implement pagination for large result sets
- Archive old submissions periodically

### Backend Optimization
- Implement caching for question data
- Use connection pooling for database
- Implement request queuing for code execution

### Frontend Optimization
- Lazy load Monaco editor
- Implement virtual scrolling for large lists
- Compress assets and use CDN

---

## 🎯 Future Enhancements

1. **Machine Learning Integration** - Code plagiarism detection
2. **Advanced Analytics** - Detailed performance reports
3. **Mobile App** - Native iOS/Android applications
4. **Multi-Language Support** - Spanish, Hindi, etc.
5. **IDE Integration** - VS Code extension
6. **Peer Review System** - Code review capabilities
7. **Discussion Forum** - Student Q&A
8. **Video Tutorials** - Integrated learning content

---

## 👥 Support & Contribution

For issues, feature requests, or contributions:
1. Check existing GitHub issues
2. Follow code style guidelines
3. Write tests for new features
4. Submit pull requests with clear descriptions

---

## 📄 License

This project is proprietary software of Rajeev Gandhi Memorial College of Engineering and Technology.

---

## ✨ Team

Developed with ❤️ for RGMCET CSE Department

**Version**: 1.0.0  
**Last Updated**: May 2026  
**Status**: Production Ready ✅

---

## 🎉 Congratulations!

Your RGMCSE COMPILER is now fully set up and ready for use. Start by:
1. Creating questions for each lab
2. Setting up student accounts
3. Configuring week schedules
4. Monitoring student progress

**Happy Coding! 🚀**
