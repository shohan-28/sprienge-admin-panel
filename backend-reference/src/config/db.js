const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sprienge';
  await mongoose.connect(uri, {
    // mongoose v7 removes some options; keep defaults
  });
  console.log('MongoDB connected');
};
