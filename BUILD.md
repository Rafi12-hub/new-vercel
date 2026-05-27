# RGMCSE Compiler - Build & Deployment Guide

## 🔨 Building the Application

### Frontend Build

```bash
cd frontend
npm install
npm run build
```

Output: `frontend/dist/` (ready for hosting)

### Backend Setup

```bash
cd backend
npm install
```

Backend runs in Node.js (no build needed)

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Free Tier Available)

**Backend Deployment:**

1. Connect GitHub repo to Vercel
2. Select `backend` root directory
3. Add environment variables from `backend/.env`
4. Set build command: (leave empty - no build needed)
5. Set start command: `npm start` or `npm run dev`

**Frontend Deployment:**

1. Create separate Vercel project
2. Select `frontend` root directory
3. Build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
4. Environment variables:
   ```
   VITE_BACKEND_URL=https://your-backend-domain.vercel.app
   VITE_SOCKET_URL=https://your-backend-domain.vercel.app
   (Plus all VITE_FIREBASE_* variables)
   ```

### Option 2: Railway (Free Tier - $5/month after)

**Setup:**

1. Sign up at https://railway.app
2. Create new project
3. Connect GitHub repo
4. Add environment variables
5. Deploy both frontend and backend

### Option 3: Render (Free Tier Available)

**Backend:**
```
1. Connect GitHub repo
2. Select Node.js
3. Build command: npm install
4. Start command: npm start
```

**Frontend:**
```
1. Build locally: npm run build
2. Deploy dist/ folder to Static Site
```

### Option 4: Self-Hosted (AWS EC2, DigitalOcean, etc.)

**Linux Setup:**

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB (or use Atlas)
sudo apt-get install -y mongodb

# Clone repository
git clone <your-repo>
cd csecompiler-

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with production values
pm2 start npm --name "compiler-backend" -- start

# Setup frontend
cd ../frontend
npm install
npm run build
# Serve dist/ with nginx or Apache
```

---

## 📋 Pre-Deployment Checklist

### Backend
- [ ] MongoDB URI configured and tested
- [ ] Firebase Admin credentials added
- [ ] Judge0 API key (if using code execution)
- [ ] JWT_SECRET changed to strong value
- [ ] FRONTEND_URL and BACKEND_URL updated
- [ ] Environment: NODE_ENV=production
- [ ] CORS domains configured for production

### Frontend
- [ ] Firebase API key verified
- [ ] VITE_BACKEND_URL points to production backend
- [ ] Build test: `npm run build` succeeds
- [ ] No console errors or warnings
- [ ] All pages tested and working
- [ ] Responsive design verified

### Database
- [ ] MongoDB Atlas cluster created
- [ ] Database backups enabled
- [ ] User permissions configured
- [ ] Collections indexed
- [ ] Connection limits set

### Security
- [ ] HTTPS enabled
- [ ] .env files excluded from git
- [ ] API keys rotated
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all APIs
- [ ] SQL injection prevention (Mongoose)
- [ ] XSS protection enabled

---

## 🌍 Production Environment Setup

### Minimal Production .env (Backend)

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=<strong-random-secret-256-chars>

# Firebase
FIREBASE_PROJECT_ID=rgmcse-compiler
FIREBASE_CLIENT_EMAIL=<from-json>
FIREBASE_PRIVATE_KEY=<from-json>
FIREBASE_STORAGE_BUCKET=<bucket-name>
FIREBASE_API_KEY=<api-key>

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/rgmcse-compiler

# Judge0 (optional)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your-key>

# URLs
FRONTEND_URL=https://rgmcse-compiler.com
BACKEND_URL=https://api.rgmcse-compiler.com
```

### Minimal Production .env (Frontend)

```env
VITE_FIREBASE_API_KEY=<key>
VITE_FIREBASE_AUTH_DOMAIN=rgmcse-compiler.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rgmcse-compiler
VITE_FIREBASE_STORAGE_BUCKET=<bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<id>
VITE_FIREBASE_APP_ID=<app-id>

VITE_BACKEND_URL=https://api.rgmcse-compiler.com
VITE_SOCKET_URL=https://api.rgmcse-compiler.com
```

---

## 🔄 Continuous Integration/Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main, deploy]

jobs:
  backend-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "rgmcse-compiler-api"
          appdir: "backend"

  frontend-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      - uses: vercel/action@master
        with:
          vercel-token: ${{secrets.VERCEL_TOKEN}}
          vercel-args: '--prod'
```

---

## 🐛 Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl https://api.rgmcse-compiler.com/api/health

# Frontend loads
curl https://rgmcse-compiler.com

# Test login endpoint
curl -X POST https://api.rgmcse-compiler.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### Monitoring

1. **Error Tracking**: Setup Sentry.io
2. **Logging**: CloudWatch, Datadog, or Loggly
3. **Performance**: New Relic or DataDog
4. **Uptime Monitoring**: UptimeRobot or Pingdom
5. **Database Monitoring**: MongoDB Atlas dashboard

---

## 📊 Performance Optimization

### Frontend
```bash
# Analyze bundle
npm run build --report

# Optimize images
npm install -D vite-plugin-compression
npm install -g @squoosh/cli
```

### Backend
```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Connection pooling
const mongooseOpts = {
  maxPoolSize: 10,
  minPoolSize: 5,
};
```

---

## 🔐 Security Hardening

### HTTPS/SSL
```bash
# Let's Encrypt with Nginx
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d rgmcse-compiler.com
```

### DDoS Protection
- Enable Cloudflare
- Set rate limiting
- Enable WAF rules

### Database Security
```bash
# MongoDB Network Access
- Allow only backend IP
- Enable authentication
- Use encrypted connections
```

---

## 📞 Getting Help

- **Vercel**: https://vercel.com/docs
- **Railway**: https://railway.app/docs
- **Firebase**: https://firebase.google.com/docs
- **MongoDB**: https://docs.mongodb.com/
- **Express.js**: https://expressjs.com/

---

**Last Updated**: 2025-05-27
**Status**: Deployment Guide Ready ✅
