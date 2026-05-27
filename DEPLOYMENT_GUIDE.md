# RGMCSE Compiler - Production Deployment Guide

## ✅ Completed Setup Steps

### 1. **Firebase Configuration**
- ✅ Frontend Firebase config set up in `frontend/.env`
- ✅ Backend Firebase Admin SDK configured in `backend/.env`
- ✅ All Firebase credentials populated
- ⚠️ **SECURITY NOTE**: Rotate Firebase credentials immediately as they were exposed in chat

### 2. **Environment Files**
- ✅ `frontend/.env` - Firebase configuration complete
- ✅ `backend/.env` - Template setup with all required fields
- ✅ `.gitignore` updated to exclude `.env` files

### 3. **Backend Dependencies**
- ✅ `package.json` configured with all required packages
- ✅ `node_modules` present with Firebase Admin SDK, Express, JWT, etc.

### 4. **Frontend Dependencies**
- ✅ React 19, Vite, Monaco Editor, and all required packages configured
- ✅ Tailwind CSS, Framer Motion, Socket.IO client ready

---

## 📋 Quick Start Checklist

### Step 1: Setup MongoDB (If Not Done)
```
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a FREE cluster
3. Create a database user
4. Get connection string
5. Update MONGODB_URI in backend/.env
```

Example MongoDB URI format:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/rgmcse-compiler?retryWrites=true&w=majority
```

### Step 2: Setup Judge0 API (Optional but Recommended)
```
1. Go to https://rapidapi.com/judge0-official/api/judge0-ce
2. Subscribe to Judge0 API (free tier available)
3. Copy API Key
4. Update in backend/.env:
   JUDGE0_API_KEY=your_rapidapi_key
```

### Step 3: Setup Firebase Admin Credentials
**The Firebase config for backend Admin SDK is needed:**

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project "rgmcse-compiler"
3. Go to Settings > Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file and copy these values to `backend/.env`:
   ```env
   FIREBASE_PROJECT_ID=rgmcse-compiler
   FIREBASE_CLIENT_EMAIL=your-firebase-client-email@YOUR-PROJECT.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
   FIREBASE_STORAGE_BUCKET=rgmcse-compiler.appspot.com
   ```

### Step 4: Start Backend Server
```bash
cd backend
npm install  # if not done
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
Timezone: Asia/Kolkata
```

### Step 5: Start Frontend Server (New Terminal)
```bash
cd frontend
npm install  # if not done
npm run dev
```

Expected output:
```
VITE v8.x.x building for development
Local: http://localhost:5173
```

### Step 6: Seed Initial Data (Optional)
```bash
cd backend
npm run seed
```

This creates:
- HOD account: `hod.cse@rgmcet.edu` / `HOD@123`
- Faculty accounts
- Lab Admin accounts
- Sample student: `john@rgm.edu` / `Syed@123`

---

## 🚀 Production Deployment

### Option A: Deploy on Vercel (Recommended for Full-Stack)

**Backend on Vercel:**
```bash
cd backend
# Create vercel.json
```

**Frontend on Vercel:**
```bash
cd frontend
npm run build
# Deploy with: vercel
```

### Option B: Deploy on Railway

**Backend:**
```bash
1. Connect GitHub repo to railway.app
2. Add environment variables from backend/.env
3. Set start command: npm run dev or npm start
```

**Frontend:**
```bash
1. Build: npm run build
2. Deploy dist/ folder
```

### Option C: Deploy on AWS

**Backend (Lambda + RDS):**
- Use Serverless Framework
- Setup RDS for MongoDB
- Configure Lambda function

**Frontend (S3 + CloudFront):**
- Build and upload dist/ to S3
- Setup CloudFront CDN

---

## 🔧 Environment Variables Reference

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=change_this_to_secure_value
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_key
FIREBASE_PROJECT_ID=rgmcse-compiler
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_STORAGE_BUCKET=your_bucket
FIREBASE_API_KEY=your_api_key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
FRONTEND_URL=http://localhost:5173  # Change for production
BACKEND_URL=http://localhost:5000   # Change for production
```

### Frontend (`frontend/.env`)
```env
VITE_FIREBASE_API_KEY=AIzaSyANaYM4a-bk4jS6kPegLlAjTU_ZgkjorB0
VITE_FIREBASE_AUTH_DOMAIN=rgmcse-compiler.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rgmcse-compiler
VITE_FIREBASE_STORAGE_BUCKET=rgmcse-compiler.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=524007067895
VITE_FIREBASE_APP_ID=1:524007067895:web:3505d8be31de81921c03f2
```

---

## 🧪 Testing the Application

### Test Login (After seeding)
- **HOD**: hod.cse@rgmcet.edu / HOD@123
- **Faculty**: faculty.adsaa@rgmcet.edu / Faculty.ADSAA@123
- **Lab Admin**: labadmin.cse@rgmcet.edu / Lab@123
- **Student**: john@rgm.edu / Syed@123

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/dashboard` - Dashboard data
- `POST /api/submissions` - Submit code

---

## ⚠️ Important Security Notes

### Credentials Exposed
Your Firebase credentials were shared in chat. **IMMEDIATELY**:
1. Go to Firebase Console
2. Regenerate your private key
3. Update the new credentials in `.env`

### Production Checklist
- [ ] Change JWT_SECRET to a strong random value
- [ ] Use HTTPS for all URLs
- [ ] Enable rate limiting
- [ ] Setup error monitoring (Sentry, etc.)
- [ ] Configure CORS for production domain
- [ ] Enable Firebase security rules
- [ ] Setup database backups
- [ ] Configure email notifications

---

## 🐛 Troubleshooting

### Backend won't start
```
1. Check MongoDB connection string
2. Verify all env variables are set
3. Check port 5000 is not in use
4. npm install in backend directory
```

### Frontend build fails
```
1. npm install in frontend directory
2. npm run build
3. Check for TypeScript errors: npm run lint
```

### Firebase connection failed
```
1. Verify Firebase credentials in backend/.env
2. Check Firebase project exists in console
3. Enable Firestore in Firebase Console
```

### Code execution fails (Judge0)
```
1. Verify Judge0 API key is correct
2. Check API rate limits on RapidAPI
3. Test with curl: 
   curl -X GET https://judge0-ce.p.rapidapi.com/languages
```

---

## 📞 Support Resources

- Firebase Docs: https://firebase.google.com/docs
- Express.js: https://expressjs.com/
- React: https://react.dev
- MongoDB: https://docs.mongodb.com
- Judge0 API: https://rapidapi.com/judge0-official/api/judge0-ce
- Socket.IO: https://socket.io/docs

---

## 📝 Project Architecture

```
Frontend (React + Vite)
├── Components: UI components with Tailwind CSS
├── Pages: Student, Faculty, HOD, Lab Admin dashboards
├── Context: Auth and app state management
└── Firebase: Client-side auth and data

Backend (Node.js + Express)
├── Routes: API endpoints for all features
├── Models: Mongoose schemas (if using MongoDB)
├── Config: Firebase Admin SDK, database setup
├── Middleware: JWT auth, role-based access
└── Utils: Helper functions, code execution

Database (Firebase Firestore)
├── Collections: users, questions, submissions, etc.
└── Real-time sync via Socket.IO

Code Execution (Judge0 API)
├── Supports: C, C++, Java, Python, JavaScript, etc.
└── API Rate Limits: Check RapidAPI dashboard
```

---

**Last Updated**: 2025-05-27
**Status**: Setup Guide Created ✅
