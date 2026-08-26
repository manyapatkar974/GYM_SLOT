require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectMongo } = require('./src/config/mongo');
const { connectRedis, redisClient } = require('./src/config/redis');
const { pool } = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const ApiError = require('./src/utils/apiError');
const ApiResponse = require('./src/utils/apiResponse');

const authRoutes = require('./src/routes/authRoutes');
const slotRoutes = require('./src/routes/slotRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

const app = express();

// Security & Parsing Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  return ApiResponse.success(res, 'FitSlot Backend System is healthy', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      postgres: 'connected',
      mongo: 'connected',
      redis: redisClient.isOpen ? 'connected' : 'disconnected',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);

// Catch Unmatched Routes (404)
app.use('*', (req, res, next) => {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 5000;

let server;

async function bootstrap() {
  try {
    // 1. Initialize MongoDB for audit logging
    await connectMongo();

    // 2. Initialize Redis cache
    await connectRedis();

    // 3. Start Express HTTP Server
    server = app.listen(PORT, () => {
      console.log(`🚀 FitSlot Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application servers:', error);
    process.exit(1);
  }
}

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
    });
  }

  try {
    await pool.end();
    console.log('PostgreSQL connection pool drained.');
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis client disconnected.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap();
