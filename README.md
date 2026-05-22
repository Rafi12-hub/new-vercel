<div align="center">
  <img src="frontend/public/logos/rgm-logo.jpeg" alt="RGMCET Logo" width="100"/>
</div>

# RGMCET Compiler – Web‑Based Programming Lab & Compiler

![React](https://img.shields.io/badge/React-Frontend-blue)
![Node](https://img.shields.io/badge/Node.js-Backend-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-darkgreen)

## Rajeev Gandhi Memorial College Of Engineering And Technology
### Department of Computer Science and Engineering

A cutting‑edge, web‑based programming laboratory platform that empowers students, faculty, lab administrators, and super administrators to collaborate, code, and manage labs efficiently.

---

## 📖 Project Overview

RGMCET Compiler is a centralized coding and lab management platform developed for managing:

- Student coding practice
- Weekly programming labs
- Faculty monitoring
- Lab scheduling
- Question management
- Progress analytics
- Real-time tracking

The system provides role-based access for:
- Students
- Faculty
- Lab Admins
- Admins
- Super Admins

---

## ✨ Key Features

### 🎓 Student Experience
- Secure authentication
- Weekly coding challenges
- Integrated online compiler
- Detailed progress & accuracy analytics
- Submission history with notifications
- Real‑time dashboard for instant insights

### 👨‍🏫 Faculty Dashboard
- Faculty‑only login
- Assign and manage student groups
- Create, edit, and schedule questions
- Monitor student progress and weekly completion
- Subject‑based access controls

### 🛠️ Administrative Tools
- Comprehensive student and faculty management
- Lab session scheduling and oversight
- Advanced reporting & analytics with visual dashboards
- Centralized question bank management

### 👑 Super Administrator Control
- Full user and role management
- Subject and lab assignment
- Configurable lab timing and weekly unlock system
- Complete system access with audit capabilities

---

## 🚀 Advanced Capabilities
- Instant real‑time notifications
- Automated weekly unlock mechanisms
- Dynamic analytics with live charts and reports
- Robust role‑based authentication
- Fully responsive modern UI with dark‑mode support
- Secure, scalable database management

---

## 💻 Technologies Used

**Frontend**
- React.js
- Tailwind CSS
- Framer Motion
- Recharts

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB

**Authentication**
- JWT Authentication

---

## 👥 System Roles

| Role | Access |
|------|--------|
| **Student** | Solve Questions & Track Progress |
| **Faculty** | Manage Students & Questions |
| **Lab Admin** | Manage Lab Sessions |
| **Admin** | Manage System Data |
| **Super Admin** | Full System Control |

---

## 📸 Screenshots

### Dashboard
![Dashboard](./screenshots/dashboard.png)

### Student Analytics
![Analytics](./screenshots/analytics.png)

### Admin Portal
![Admin](./screenshots/admin.png)

### Compiler
![Compiler](./screenshots/compiler.png)

---

## 📁 Folder Structure

```bash
RGM-COMPILER/
│
├── frontend/
├── backend/
├── screenshots/
├── README.md
└── package.json
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/rgmcet-compiler.git
cd rgmcet-compiler
```

### 2. Install Dependencies

**Frontend**

```bash
cd frontend
npm install
```

**Backend**

```bash
cd backend
npm install
```

---

## 🚦 Complete Workflow

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rgmcet-compiler.git
   cd rgmcet-compiler
   ```
2. **Install dependencies** (frontend & backend) as described in the Installation section.
3. **Configure environment variables** in `backend/.env` (see the Environment Variables section).
4. **Start the backend**:
   ```bash
   cd backend
   npm start
   ```
5. **Start the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
6. Open the application in your browser at `http://localhost:5173` (or the URL displayed by the frontend).
7. **Register / log in** as a Student, Faculty, Lab Admin, or Super Admin.
8. **Create labs, assign questions, and monitor progress** via the respective dashboards.
9. **Submit code** using the integrated online compiler and view real‑time results and analytics.
10. **Generate reports** and view analytics from the Admin panel.

---

## ▶️ Run Project

**Start Frontend**
```bash
cd frontend
npm run dev
```

**Start Backend**
```bash
cd backend
npm start
```

---

## 🔐 Environment Variables

Create `.env` file inside the `backend` folder:

```env
MONGODB_URI=your_mongodb_url
JWT_SECRET=your_secret_key
PORT=5000
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=YOUR_RAPIDAPI_KEY_HERE
```

---

## 📈 Upcoming Features
- AI‑driven code evaluation and feedback
- Integrated plagiarism detection
- Competitive leaderboard system
- Exportable PDF reports
- Automated email notifications
- Virtual viva (oral exam) module
- Contest mode for coding competitions

---

## 🌟 Project Advantages
- Streamlined lab management workflow
- Comprehensive tracking of student coding progress
- Significant reduction in manual administrative tasks
- Automated weekly programming cycles
- Centralized dashboard for real‑time monitoring and insights

---

## 🏛️ Developed For

**Rajeev Gandhi Memorial College Of Engineering And Technology**  
Department of Computer Science and Engineering

---

## 📜 License

This project is developed for educational and institutional use.

---

## 📬 Contact

For project queries or support:

- Department of CSE
- RGMCET
