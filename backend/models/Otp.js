const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true }, // email or mobileNumber
  otp: { type: String, required: true },
  tempUserData: {
    username: { type: String, required: true },
    password: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete after 5 minutes (300 seconds)
});

module.exports = mongoose.model('Otp', otpSchema);
