<div align="center">
  <img src="public/logos/rgm-logo.jpeg" alt="RGM Logo" width="100" height="100" />
  <img src="public/logos/ripple-logo.png" alt="Department Logo" width="100" height="100" />
  <h1>RGMCSE COMPILER</h1>
  <p><strong>Rajeev Gandhi Memorial College of Engineering and Technology</strong></p>
  <p><em>Department of Computer Science & Engineering</em></p>
  <p>An AI-powered online coding platform for CSE lab management, code submission, evaluation, and real-time progress tracking.</p>
</div>

---

## Features

- **Multi-role Dashboard** — Role-based interfaces for HOD, Faculty, Lab Admin, and Students
- **Real-time Code Compiler** — Built-in Monaco Editor with support for C, C++, Java, Python, JavaScript, and more
- **Auto-grading & Evaluation** — Automated test case execution with AI-assisted code review
- **Liveness Detection** — Face authentication during exams using face-api.js
- **Weekly Task Management** — Structured weekly lab assignments with unlock schedules
- **Points & Analytics** — Gamified scoring with detailed performance analytics via Recharts
- **PDF Report Generation** — Auto-generated final week reports with college logos, watermarks, and page numbers
- **Real-time Notifications** — Socket.IO-powered live alerts for submissions, schedules, and system events
- **Admin Controls** — Lab management, student/faculty oversight, email/password resets, account controls

## Roles

| Role | Capabilities |
|------|-------------|
| **HOD** | Full department oversight: analytics, faculty & lab admin management, password/email resets, account enable/disable |
| **Faculty** | Question management, student tracking, analytics, schedule management, points management, submission tracking |
| **Lab Admin** | Assigned lab management: question publishing, student tracking, submission monitoring, weekly scheduling |
| **Student** | Code submission, progress tracking, lab enrollment, PDF download |

## Tech Stack

### Frontend
- **React 19** with Vite 8
- **Monaco Editor** (@monaco-editor/react) for code editing
- **Framer Motion** for animations
- **Recharts** for analytics dashboards
- **Lucide React** for icons
- **Tailwind CSS 4** for styling
- **jsPDF** for client-side PDF generation
- **Socket.IO Client** for real-time features
- **face-api.js** for liveness detection

### Backend
- **Node.js** with **Express 5**
- **MongoDB** via **Mongoose 9**
- **JWT Authentication** with bcryptjs
- **Socket.IO** for real-time events
- **jsPDF** for server-side PDF generation
- **node-cron** for scheduled tasks
- **dotenv** for environment configuration

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd RGMCSE-COMPILER

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rgmcse-compiler
JWT_SECRET=your_jwt_secret_key
```

### Running the Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend API on `http://localhost:5173/api`.

### Seeding Data

```bash
cd backend
npm run seed
```

## Project Structure

```
RGMCSE-COMPILER/
├── backend/
│   ├── models/          # Mongoose schemas (User, Question, Submission, etc.)
│   ├── routes/          # Express API routes
│   ├── middleware/       # Auth & validation middleware
│   ├── scripts/         # Seed & utility scripts
│   ├── index.js         # Server entry point
│   └── seed.js          # Database seeder
├── frontend/
│   ├── public/
│   │   ├── logos/       # College & department logos
│   │   └── models/      # face-api.js models
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # Auth & app context
│   │   └── App.jsx      # Root app component
│   └── index.html
└── README.md
```

## Security

- JWT-based authentication for admin and student access
- Password hashing with bcryptjs
- Role-based route protection
- Liveness detection for exam integrity
- Secure PDF generation with admin-only access

## License

This project is developed for academic use by **Rajeev Gandhi Memorial College of Engineering and Technology**, Department of Computer Science & Engineering.
