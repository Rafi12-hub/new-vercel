# RGMCSE COMPILER - Quick Reference Card

## 🚀 START HERE

### Step 1: Start Backend
```bash
cd backend
npm run dev
```
✅ Runs on `http://localhost:5000`

### Step 2: Start Frontend (NEW TERMINAL)
```bash
cd frontend
npm run dev
```
✅ Opens at `http://localhost:5173`

### Step 3: Login with Test Credentials
**Student Login:**
- RegNo: `24091A0514`
- Password: `123456`

**Admin Login:**
- Email: `syedamanmirzanulla@gmail.com`
- Password: `Syed@123`
- Select Role: Faculty, Lab Admin, or HOD

---

## 📍 Key Endpoints Reference

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Student registration |
| `/api/auth/login` | POST | Student login |
| `/api/admin/login` | POST | Admin login |

### Code Execution
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/execute/run` | POST | Run sample tests |
| `/api/execute/submit` | POST | Submit solution |

### Analytics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analytics/student/stats` | GET | Student dashboard |
| `/api/analytics/lab/students` | GET | Lab admin view |
| `/api/analytics/hod/dashboard` | GET | HOD dashboard |

### PDF Generation
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pdf/generate/:studentId/:labName` | POST | Single PDF |
| `/api/pdf/generate-batch/:labName` | POST | Batch PDFs |

---

## 🎓 Lab Modules (11 Total)

| Lab Code | Lab Name |
|----------|----------|
| C | C Programming Fundamentals |
| DS | Data Structures |
| ADSAA | Advanced DS & Algorithms |
| JAVA | OOPS through Java |
| PYTHON | Python Programming |
| DBMS | Database Management Systems |
| OS | Operating Systems |
| CN | Computer Networks |
| AI | Artificial Intelligence |
| ML | Machine Learning |
| FSAD | Full Stack Application Development |

---

## 🎯 User Flows

### Student Flow
1. **Register** → Name, Email, RegNo, Year, Lab, Password
2. **Login** → RegNo + Password
3. **View Dashboard** → Points, Rank, Progress
4. **Select Question** → From their assigned lab
5. **Code Solution** → In Monaco editor
6. **Run Tests** → Against sample cases
7. **Submit** → Gets validated against hidden cases
8. **Earn Points** → Automatic on acceptance
9. **Check Analytics** → See progress and ranking

### Lab Admin Flow
1. **Login** → Email + Password, Select "Lab Admin"
2. **Create Questions** → Add title, description, test cases
3. **Configure Points** → Base points + time bonus
4. **Set Schedule** → Unlock/lock times
5. **Monitor Students** → View submissions and stats
6. **Check Violations** → See who violated security rules
7. **Generate PDFs** → For final week submissions

### HOD Flow
1. **Login** → Email + Password, Select "HOD"
2. **View Dashboard** → Department-wide analytics
3. **See Best Students** → By language
4. **Check Year-wise Stats** → Breakdown by year
5. **Monitor Progress** → Overall department performance

---

## 🔐 Security Features

| Feature | Behavior |
|---------|----------|
| **Tab Switch** | Detected, reported as violation |
| **Screenshot** | PrintScreen blocked, warned |
| **Copy/Paste** | Disabled in editor |
| **Right Click** | Disabled in editor |
| **Developer Tools** | Disabled |
| **Violation Counter** | Increments on each violation |
| **Auto Lock** | After 3 violations |

---

## 📊 Database Collections

All auto-created on startup. Key fields:

**Users** - Student accounts with:
- Registration number (unique)
- Assigned lab
- Total points & rank
- Submission history
- Violation count

**Admins** - Staff accounts with:
- Role (superadmin/hod/faculty/labadmin)
- Assigned lab/department
- Questions managed
- Students assigned

**Questions** - Lab questions with:
- Title, description, constraints
- Sample + hidden test cases
- Base points + time bonus
- Unlock/lock times
- Week number

**Submissions** - Student code with:
- Language & code
- Status (Accepted/Wrong Answer/etc)
- Points earned
- Test cases passed
- Execution metrics

---

## 💾 File Structure

```
RGM COMPILER/
├── backend/
│   ├── index.js (Main server)
│   ├── package.json
│   ├── config/
│   │   └── db.js (MongoDB)
│   ├── models/
│   │   ├── User.js
│   │   ├── Admin.js
│   │   ├── Question.js
│   │   ├── Submission.js
│   │   └── ...
│   └── routes/
│       ├── auth.js
│       ├── execute.js
│       ├── analytics.js
│       ├── pdf.js
│       └── ...
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css (Global styles)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProblemDetail.jsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── SecurityModule.jsx
│   │   │   └── ...
│   │   └── context/
│   │       └── AuthContext.jsx
│   └── public/
│       └── logos/
└── Documentation/
    ├── IMPLEMENTATION_GUIDE.md
    ├── DEPLOYMENT_CHECKLIST.md
    └── FEATURES_SUMMARY.md
```

---

## ⚙️ Configuration

### .env (Backend)
```
MONGODB_URI=mongodb://localhost:27017/rgmcse
JWT_SECRET=your_jwt_secret_here
PORT=5000
TZ=Asia/Kolkata
```

### System Requirements
- Node.js v16+
- MongoDB (local or Atlas)
- Compilers: gcc, g++, javac, python3, node

---

## 🎨 Color Reference

```css
Primary: #8254ee     /* Purple */
Secondary: #e7c965  /* Gold */
Background: #090909 /* Dark Gray */
Text: #c1cfc1       /* Light Gray */
Success: #00d084    /* Green */
Error: #ef4444      /* Red */
```

---

## 📱 Responsive Design

- ✅ Desktop (1920x1080+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 767px)

---

## ⏱️ Key Timing

| Action | Time | Purpose |
|--------|------|---------|
| JWT Expiry | 24 hours | Security |
| Code Timeout | 5 seconds | Resource limit |
| Page Load Target | < 3 seconds | UX |
| Submission Delay | Instant | Real-time feedback |

---

## 🆘 Quick Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
mongod

# Check ports are free
lsof -i :5000
lsof -i :27017
```

### Frontend won't load
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Compilation fails
```bash
# Install compilers
# Ubuntu/Debian:
sudo apt-get install build-essential openjdk-11-jdk python3

# macOS:
brew install gcc java python3
```

---

## 📞 Support Commands

```bash
# Check backend logs
tail -f backend/logs.txt

# MongoDB shell
mongosh

# Frontend dev server logs
npm run dev  # Shows in terminal

# Kill port if stuck
# Windows: netstat -ano | findstr :5000
# macOS/Linux: lsof -i :5000 | grep LISTEN
```

---

## ✅ Verification Checklist

After starting:
- [ ] Backend running on :5000
- [ ] Frontend running on :5173
- [ ] Can open http://localhost:5173
- [ ] LoginPage loads
- [ ] Can login with test credentials
- [ ] Dashboard shows (for students)
- [ ] No console errors

---

## 🎯 Common Tasks

### Create a New Lab Question (Lab Admin)
1. Login as Lab Admin
2. Go to "Create Question"
3. Fill details (title, description, etc)
4. Add sample test cases
5. Add hidden test cases
6. Set base points (e.g., 100)
7. Set week number and unlock times
8. Click "Create"

### Monitor Student Progress (Lab Admin)
1. Login as Lab Admin
2. Go to "Analytics"
3. View all students in your lab
4. Click student name for details
5. See submissions and points

### Generate Final Week PDFs (Lab Admin)
1. Login as Lab Admin
2. Go to "Reports"
3. Click "Generate PDF" for student
4. Or "Batch Generate" for all students
5. PDF downloads to your computer

---

## 🚀 Performance Tips

1. **Database**: Use indexes on regNo, email, assignedLab
2. **Backend**: Cache question list in memory
3. **Frontend**: Lazy-load Monaco editor
4. **Images**: Compress logos before using
5. **Monitoring**: Check MongoDB indexes regularly

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| IMPLEMENTATION_GUIDE.md | Complete feature details |
| DEPLOYMENT_CHECKLIST.md | Testing procedures |
| FEATURES_SUMMARY.md | Overview of all features |
| This file | Quick reference |

---

## 🎉 You're All Set!

Your **RGMCSE COMPILER** is ready to use!

**Next Steps:**
1. Start both servers
2. Test with provided credentials
3. Create first lab questions
4. Onboard admin team
5. Go live!

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Update**: May 2026

