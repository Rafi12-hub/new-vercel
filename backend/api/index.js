const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Provide a no-op `io` so routes referencing `app.locals.io` won't crash in serverless.
app.locals.io = { emit: () => {}, on: () => {} };

// Mount existing routes (keeps same URL structure as local server)
app.use('/api/auth', require('../routes/auth'));
app.use('/api/questions', require('../routes/questions'));
app.use('/api/execute', require('../routes/execute'));
app.use('/api/admin', require('../routes/admin'));
app.use('/api/schedule', require('../routes/schedule'));
app.use('/api/security', require('../routes/security'));
app.use('/api/lab', require('../routes/lab'));
app.use('/api/notifications', require('../routes/notifications'));
app.use('/api/analytics', require('../routes/analytics'));
app.use('/api/pdf', require('../routes/pdf'));
app.use('/api', require('../routes/dashboard'));

module.exports = serverless(app);
