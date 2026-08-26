const mongoose = require('mongoose');

async function connectMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://mongo_user:mongo_password@localhost:27017/gym_logs?authSource=admin';
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

module.exports = { connectMongo };
