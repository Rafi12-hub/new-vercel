# 🗄️ MongoDB Setup Guide for RGMCSE Compiler

## Quick Setup (5 minutes)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Create account with email/password or Google

### Step 2: Create a Cluster
1. After login, click "Create a Deployment"
2. Select "M0 Sandbox" (FREE tier - perfect for development)
3. Select Cloud Provider: AWS
4. Select Region: Asia Pacific (Singapore or Mumbai for India)
5. Click "Create Cluster"
   - ⏳ Wait 5-10 minutes for cluster to be ready

### Step 3: Create Database User
1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Authentication Method: Password
4. Username: `rgmcse_user`
5. Password: Create strong password (save it!)
6. Click "Add User"

### Step 4: Get Connection String
1. Go to "Clusters" in left sidebar
2. Click "Connect" button on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 4.0 or later
5. Copy the connection string
6. Replace:
   - `<username>` with `rgmcse_user`
   - `<password>` with your password
   - `<cluster-name>` (usually already filled)

Example:
```
mongodb+srv://rgmcse_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/rgmcse-compiler?retryWrites=true&w=majority
```

### Step 5: Add IP to Whitelist
1. Go to "Network Access" in left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. ✅ Confirm

### Step 6: Update backend/.env
Add to `backend/.env`:
```env
MONGODB_URI=mongodb+srv://rgmcse_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/rgmcse-compiler?retryWrites=true&w=majority
```

---

## Verification

### Test MongoDB Connection
```bash
cd backend
npm run dev
```

Look for log messages like:
```
[AUTO-SEED] Connected to MongoDB
[AUTO-SEED] Seeding initial data...
```

If you see these, ✅ MongoDB is working!

---

## Using MongoDB with Backend Code

The backend already has Firebase configured, but if you want to use MongoDB instead:

### Option A: Use Firebase (Current - No Changes Needed)
- ✅ Already configured
- ✅ Free tier available
- ✅ Real-time database
- Better for: NoSQL, rapid development

### Option B: Use MongoDB (Alternative)
If switching to MongoDB:

1. Install Mongoose:
```bash
npm install mongoose
```

2. Add connection in `backend/index.js`:
```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});
```

---

## MongoDB Collections Setup

Once connected, the backend will create these collections:

```javascript
// Users Collection
{
  _id: ObjectId,
  name: "John Doe",
  email: "john@example.com",
  password: "hashed",
  role: "student", // or faculty, labadmin, hod
  assignedLab: "DBMS",
  createdAt: Timestamp
}

// Questions Collection
{
  _id: ObjectId,
  title: "Problem 1",
  description: "...",
  language: "cpp",
  testCases: [...],
  difficulty: "easy",
  createdAt: Timestamp
}

// Submissions Collection
{
  _id: ObjectId,
  userId: ObjectId,
  questionId: ObjectId,
  code: "...",
  language: "cpp",
  status: "passed", // or failed, pending
  output: "...",
  submittedAt: Timestamp
}
```

---

## Indexing (Performance)

Add indexes for better performance:

```javascript
// In MongoDB Atlas > Collections > Indexes

// Users Collection
db.users.createIndex({ email: 1 })
db.users.createIndex({ role: 1, assignedLab: 1 })

// Submissions Collection
db.submissions.createIndex({ userId: 1, questionId: 1 })
db.submissions.createIndex({ submittedAt: -1 })

// Questions Collection
db.questions.createIndex({ difficulty: 1, language: 1 })
```

---

## Backup & Monitoring

### Automated Backups (MongoDB Atlas - FREE)
1. Go to "Backup" in left sidebar
2. Enable "Continuous Backups"
3. Set retention to 35 days (default)

### Monitor Cluster
1. Go to "Monitoring" tab
2. Watch:
   - Data Size
   - Connections
   - Read/Write Operations
   - Errors (if any)

### View Data
1. Click "Collections" in Clusters
2. Browse your data
3. Edit/delete documents manually if needed

---

## Troubleshooting

### "Unable to connect to MongoDB"
```
❌ Solution 1: Check IP whitelist
  - Network Access > check your IP is whitelisted
  - Or add 0.0.0.0/0 for anywhere (not secure in production)

❌ Solution 2: Check credentials
  - Username and password match exactly
  - No special characters without URL encoding

❌ Solution 3: Check cluster status
  - Clusters page - cluster should show "Active"
  - Wait if it's still initializing
```

### "Connection timeout"
```
❌ Solution 1: Check internet connection
❌ Solution 2: Check firewall
  - Make sure port 27017 is accessible
❌ Solution 3: Increase timeout
  - In backend/index.js add: serverSelectionTimeoutMS: 10000
```

### "Authentication failed"
```
❌ Solution 1: Verify password
  - Try resetting password in Database Access
❌ Solution 2: Check username
  - Copy exactly from connection string
❌ Solution 3: URL encode special characters
  - @ becomes %40
  - # becomes %23
```

---

## Best Practices

### Development
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rgmcse-compiler-dev
# Use separate DEV database
```

### Production
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rgmcse-compiler
# Use production database
# Enable IP whitelist with specific IPs only
# Enable authentication
# Enable backups
```

### Security
- [ ] Use strong passwords (16+ characters)
- [ ] Enable IP whitelist (not 0.0.0.0/0)
- [ ] Use separate users for dev/prod
- [ ] Enable two-factor authentication on MongoDB Atlas
- [ ] Regular backups
- [ ] Monitor access logs

---

## Cost Estimation

| Feature | Tier | Cost |
|---------|------|------|
| Database | M0 (Sandbox) | $0/month |
| Storage | Up to 512MB | Included |
| Data Backup | 35-day retention | Included |
| Network | Unlimited | Included |
| Support | Community | Free |

**Total**: $0 for development! 🎉

To scale up, upgrade to M2+ ($10+/month) when needed.

---

## Useful Commands

### Via MongoDB Shell (in Atlas)
```javascript
// Use database
use rgmcse-compiler

// Count documents
db.users.countDocuments()

// Find by email
db.users.findOne({ email: "test@example.com" })

// Update user
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "faculty" } }
)

// Delete user
db.users.deleteOne({ email: "test@example.com" })
```

### Via Command Line
```bash
# Connect via mongosh CLI
mongosh "mongodb+srv://user:password@cluster.mongodb.net/rgmcse-compiler"

# List all databases
show databases

# Show collections
show collections

# Export data
mongoexport --uri "mongodb+srv://..." --collection users --out users.json

# Import data
mongoimport --uri "mongodb+srv://..." --collection users --file users.json
```

---

## Next Steps

1. ✅ Create MongoDB Atlas account
2. ✅ Create cluster
3. ✅ Create user
4. ✅ Get connection string
5. ✅ Add to backend/.env
6. 📝 Start backend: `cd backend && npm run dev`
7. 📝 Run seed: `npm run seed`
8. 📝 Start frontend: `cd frontend && npm run dev`

---

## Support

- **MongoDB Docs**: https://docs.mongodb.com/
- **MongoDB Atlas Help**: https://www.mongodb.com/docs/atlas/
- **Free Tier FAQ**: https://www.mongodb.com/docs/atlas/manage-billing/

---

**Setup Time**: ~5 minutes
**Difficulty**: ⭐ Easy
**Cost**: 💰 FREE

You're all set! 🚀
