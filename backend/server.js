require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectMongo } = require('./src/config/mongo');
const { connectRedis } = require('./src/config/redis');
const { errorHandler } = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const slotRoutes = require('./src/routes/slotRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is healthy' }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectMongo();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
