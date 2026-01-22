const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');

// Connect to MongoDB
connectDB();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workoutRoutes = require('./routes/workouts');
const leaderboardRoutes = require('./routes/leaderboard');
const challengeRoutes = require('./routes/challenges');
const notificationRoutes = require('./routes/notifications');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const adminChallengeRoutes = require('./routes/admin-challenges');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security middleware (but allow video endpoints)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: '*', // In production, specify allowed origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Request parsing
// Only parse JSON for application/json content type, not for multipart uploads
app.use(express.json({
  limit: '50mb',
  type: 'application/json'
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Log all incoming requests to debug
app.use((req, res, next) => {
  console.log('[REQUEST]', req.method, req.path, {
    hasBody: !!req.body,
    contentType: req.get('content-type'),
    query: req.query
  });
  next();
});

// Rate limiting
app.use(rateLimiter);

// Serve uploaded videos as static files
// DISABLED: Videos now stored in Oracle Cloud Object Storage
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'UNYIELDING API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      workouts: '/api/workouts',
      leaderboard: '/api/leaderboard',
      challenges: '/api/challenges',
      notifications: '/api/notifications',
      videos: '/api/videos',
      admin: '/api/admin',
      uploads: '/uploads',
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/challenges', adminChallengeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 UNYIELDING Server running on http://0.0.0.0:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📹 Video uploads enabled`);
});

module.exports = app;
