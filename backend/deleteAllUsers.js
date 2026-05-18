require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/antigravity')
  .then(() => {
    console.log('Connected to MongoDB');
    return User.deleteMany({});
  })
  .then((result) => {
    console.log(`Deleted ${result.deletedCount} users from the database`);
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
