# 🚀 Firebase Hosting - Complete Deployment Guide

## Step 1: Prerequisites

### Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Verify Installation
```bash
firebase --version
```

---

## Step 2: Authenticate with Firebase

### Login to Firebase
```bash
firebase login
```

This will:
- Open browser for Google login
- Authenticate your Firebase project
- Return to terminal when complete

### Verify Authentication
```bash
firebase projects:list
```

You should see: `rgmcse-compiler` in the list

---

## Step 3: Build Frontend for Production

### Build React App
```bash
cd frontend
npm run build
```

Expected output:
```
dist/
├── index.html
├── assets/
│   ├── main.xxxxx.js
│   ├── main.xxxxx.css
│   └── ...
└── manifest.json
```

### Verify Build
```bash
# Check dist folder exists and has files
ls -la dist/
```

---

## Step 4: Update Environment Variables for Production

### Update frontend/.env for production
```env
VITE_FIREBASE_API_KEY=AIzaSyANaYM4a-bk4jS6kPegLlAjTU_ZgkjorB0
VITE_FIREBASE_AUTH_DOMAIN=rgmcse-compiler.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rgmcse-compiler
VITE_FIREBASE_STORAGE_BUCKET=rgmcse-compiler.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=524007067895
VITE_FIREBASE_APP_ID=1:524007067895:web:3505d8be31de81921c03f2

# Update these for your Firebase Hosting domain
VITE_BACKEND_URL=https://us-central1-rgmcse-compiler.cloudfunctions.net
VITE_SOCKET_URL=https://us-central1-rgmcse-compiler.cloudfunctions.net
```

### Rebuild with new environment variables
```bash
npm run build
```

---

## Step 5: Configure Backend for Cloud Functions

### Option A: Deploy Node.js Backend as Cloud Functions

#### 1. Update backend package.json
Add this to `backend/package.json`:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "RGMCSE Compiler Backend",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "engines": {
    "node": "18"
  }
}
```

#### 2. Create functions/index.js wrapper
```javascript
// backend/functions/index.js
const functions = require('firebase-functions');
const app = require('../index.js');

exports.api = functions.https.onRequest(app);
```

#### 3. Update backend/.env for Cloud Functions
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=change_this_in_production

# Firebase - already configured
FIREBASE_PROJECT_ID=rgmcse-compiler
FIREBASE_STORAGE_BUCKET=rgmcse-compiler.appspot.com

# Database
MONGODB_URI=your_production_mongodb_uri_here
```

### Option B: Keep Backend Separate (Recommended)

If using separate backend (Vercel):
- Deploy backend to Vercel, Railway, or Render separately
- Frontend will call your backend API
- Update VITE_BACKEND_URL to your backend domain

---

## Step 6: Deploy to Firebase

### From Project Root
```bash
firebase deploy
```

This will:
- Upload frontend build to Firebase Hosting
- Deploy any Cloud Functions (if using)
- Show deployment status and URLs

### Expected Output
```
Deploy complete!

Project Console: https://console.firebase.google.com/project/rgmcse-compiler/overview
Hosting URL: https://rgmcse-compiler.firebaseapp.com
Hosting Site: https://rgmcse-compiler-xxxxx.web.app
```

---

## Step 7: Verify Deployment

### Check Frontend
1. Visit: `https://rgmcse-compiler.firebaseapp.com`
2. Verify page loads without errors
3. Check console for any errors (F12)
4. Test navigation

### Check Backend Connectivity
```bash
# Test backend endpoint
curl https://us-central1-rgmcse-compiler.cloudfunctions.net/api/health
```

---

## Post-Deployment Configuration

### Update Firebase Hosting Security Rules
Go to Firebase Console > Hosting > Security Rules

```
rules_version = '2';
service firebase.hosting {
  match '{segment=**}' {
    allow read, write: if request.method == 'GET';
  }
}
```

### Enable SSL Certificate
Firebase automatically provides HTTPS

### Setup Custom Domain (Optional)
1. Firebase Console > Hosting > Domain
2. Click "Add custom domain"
3. Add your domain (e.g., rgmcse-compiler.com)
4. Follow DNS setup instructions

---

## Environment Variables for Production

### Firebase Functions Environment
Set via Firebase Console or CLI:

```bash
firebase functions:config:set backend.mongodb_uri="your_uri" backend.jwt_secret="your_secret"
```

Or use `.env.production`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rgmcse-compiler
JWT_SECRET=strong_production_secret
JUDGE0_API_KEY=your_key
```

---

## Monitoring & Logs

### View Deployment Logs
```bash
firebase hosting:channel:list
firebase functions:log
```

### Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select project: `rgmcse-compiler`
3. View logs in Functions > Logs section

### Enable Error Tracking
Firebase Console > Analytics > Crashlytics (optional)

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
cd frontend
rm -rf dist node_modules
npm install
npm run build
```

### Deployment Fails
```bash
# Check project setup
firebase projects:list

# Initialize Firebase in current directory
firebase init
```

### Frontend Shows 404
- Ensure `dist/` folder exists
- Verify `firebase.json` points to correct path
- Check rewrite rules include `destination: "/index.html"`

### Backend Connection Issues
- Check VITE_BACKEND_URL is correct
- Verify Cloud Functions deployed
- Check CORS configuration

---

## Rollback Deployment

### Rollback to Previous Version
```bash
firebase hosting:channels:list
firebase hosting:clone source target
```

---

## File Structure

```
csecompiler-/
├── firebase.json          ← Hosting config
├── .firebaserc            ← Project config
├── frontend/
│   ├── dist/              ← Build output (deployed)
│   ├── src/
│   ├── package.json
│   └── .env
├── backend/
│   ├── index.js
│   ├── package.json
│   ├── routes/
│   └── .env
└── README.md
```

---

## Quick Command Reference

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if needed)
firebase init

# Build frontend
cd frontend && npm run build

# Deploy to Firebase
firebase deploy

# View logs
firebase functions:log

# View hosting deployments
firebase hosting:site:list
```

---

## Cost Estimation

| Service | Free Tier | Cost |
|---------|-----------|------|
| Hosting | 1GB/month storage | Free |
| Functions | 2M/month invocations | Free* |
| Firestore | 25K reads/day | Free* |
| Storage | 5GB | Free |
| Total | Most features | FREE (usually) |

*Generous free tier - scales when you exceed limits

---

## Next Steps

1. ✅ Build frontend: `npm run build`
2. ✅ Setup .env for production
3. ✅ Deploy: `firebase deploy`
4. ✅ Visit your live site
5. ✅ Test all features
6. ✅ Setup custom domain (optional)

---

## Support

- Firebase Docs: https://firebase.google.com/docs/hosting
- Firebase CLI: https://firebase.google.com/docs/cli
- Cloud Functions: https://firebase.google.com/docs/functions

---

**Ready to Deploy!** 🚀

Follow steps 1-7 above to go live.
