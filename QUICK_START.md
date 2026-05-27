# 🚀 RGMCSE Compiler - Quick Start Guide

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js >= 18
- npm or yarn
- Git
- MongoDB Atlas account (free tier)
- Firebase project configured

---

## Step 1: Clone & Install (2 min)

```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

---

## Step 2: Configure Environment Variables (2 min)

### Backend (.env) - Already configured, just verify:
```env
PORT=5000
JWT_SECRET=supersecretkey_rgm_compiler_change_in_prod
FIREBASE_API_KEY=AIzaSyANaYM4a-bk4jS6kPegLlAjTU_ZgkjorB0
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/rgmcse-compiler
```

### Frontend (.env) - Already configured with Firebase:
```env
VITE_FIREBASE_API_KEY=AIzaSyANaYM4a-bk4jS6kPegLlAjTU_ZgkjorB0
VITE_BACKEND_URL=http://localhost:5000
```

> **⚠️ TODO**: Add your MongoDB connection string to backend/.env

---

## Step 3: Start the Application (1 min)

### Terminal 1 - Backend
```bash
cd backend
npm run dev
# Should show: "Server running on http://localhost:5000"
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
# Should show: "Local: http://localhost:5173"
```

---

## Step 4: Access the Application

🌐 **Frontend**: http://localhost:5173
⚙️ **Backend**: http://localhost:5000

---

## 📝 Test Login (After seeding)

### Default Accounts (auto-created on first run):

| Role | Email | Password |
|------|-------|----------|
| HOD | hod.cse@rgmcet.edu | HOD@123 |
| Faculty | faculty.adsaa@rgmcet.edu | Faculty.ADSAA@123 |
| Lab Admin | labadmin.cse@rgmcet.edu | Lab@123 |
| Student | john@rgm.edu | Syed@123 |

---

## ⚠️ What You Need to Do Now

### CRITICAL - Next Steps:

1. **🔑 MongoDB Setup** (Required for database)
   ```
   1. Go to https://www.mongodb.com/cloud/atlas
   2. Create FREE cluster
   3. Create database user
   4. Get connection string
   5. Update MONGODB_URI in backend/.env
   ```

2. **🔐 Rotate Firebase Credentials** (Security)
   - Your Firebase credentials were exposed
   - Go to Firebase Console > Service Accounts
   - Generate new private key
   - Update backend/.env

3. **⚡ Judge0 API** (Optional - for code execution)
   - Sign up at https://rapidapi.com/judge0-official/api/judge0-ce
   - Get API key
   - Update JUDGE0_API_KEY in backend/.env

---

## 🛠️ Troubleshooting

### Backend won't start?
```bash
# Check port 5000 is free
lsof -i :5000
# Kill process: kill -9 <PID>

# Try clearing cache
rm -rf node_modules package-lock.json
npm install
```

### Firebase connection error?
```
1. Verify VITE_FIREBASE_API_KEY is correct
2. Verify VITE_FIREBASE_PROJECT_ID is correct
3. Check Firebase project exists and is enabled
```

### MongoDB connection error?
```
1. Verify MONGODB_URI is correct
2. Check MongoDB Atlas cluster is running
3. Verify IP whitelist includes your IP
```

---

## 📚 Full Documentation

- **Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **Build Instructions**: See `BUILD.md`
- **Original README**: See `README.md`

---

## 🎯 Next: Production Deployment

Once local setup works:

1. Choose hosting platform (Vercel, Railway, Render, AWS)
2. Configure production environment variables
3. Build and deploy frontend
4. Deploy backend with database
5. Test in production
6. Setup monitoring

👉 See `DEPLOYMENT_GUIDE.md` for detailed instructions

---

## 📞 Support

- **Firebase Issues**: https://firebase.google.com/support
- **MongoDB Issues**: https://docs.mongodb.com/
- **Node.js Issues**: https://nodejs.org/en/docs/
- **React Issues**: https://react.dev/

---

**Status**: ✅ Setup Ready
**Next**: Add MongoDB → Start Servers → Begin Development

Happy Coding! 🎉
