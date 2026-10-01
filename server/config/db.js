const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vit_projecthub';
  try {
    await mongoose.connect(uri);
    console.log(`[db] connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
