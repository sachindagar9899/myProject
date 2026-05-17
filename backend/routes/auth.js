const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Otp = require('../models/Otp');

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '', // User needs to set this
    pass: process.env.EMAIL_PASS || 'rqicmzevyzjdflmf' // Using the provided app password (spaces removed)
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    if (!isEmail) {
      return res.status(400).json({ message: 'Please enter a valid Email Address' });
    }

    const query = [{ username }, { email }];

    const existingUser = await User.findOne({ $or: query });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to OTP model
    await Otp.findOneAndDelete({ identifier: email }); // Delete any previous OTP
    const newOtp = new Otp({
      identifier: email,
      otp: otpCode,
      tempUserData: { username, password }
    });
    await newOtp.save();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({ message: 'Email service is not configured. Cannot send verification code.' });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'AntiGravity - Your Verification Code',
      text: `Your AntiGravity verification code is: ${otpCode}. It will expire in 5 minutes.`
    });

    res.status(200).json({ message: 'Verification code sent to your email', requireOtp: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    
    const otpRecord = await Otp.findOne({ identifier, otp });
    if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });
    
    const { username, password } = otpRecord.tempUserData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email: identifier, password: hashedPassword });
    await newUser.save();
    
    await Otp.findByIdAndDelete(otpRecord._id);
    
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    console.log(`[Forgot Password] Requested for: ${identifier}`);
    
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (!isEmail) {
      return res.status(400).json({ message: 'Please enter a valid Email Address' });
    }

    // Find user by email
    const user = await User.findOne({ email: identifier });
    
    if (!user) {
      console.log(`[Forgot Password] User not found for: ${identifier}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await Otp.findOneAndDelete({ identifier });
    const newOtp = new Otp({
      identifier,
      otp: otpCode,
      tempUserData: { username: user.username, password: 'reset_flow' } // placeholder
    });
    await newOtp.save();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({ message: 'Email service is not configured. Cannot send reset code.' });
    }

    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: identifier,
        subject: 'AntiGravity - Password Reset Code',
        text: `Your AntiGravity password reset code is: ${otpCode}. It will expire in 5 minutes.`
      });
      console.log(`[Forgot Password] Email sent: ${info.response}`);
    } catch (err) {
      console.error('[Forgot Password] Nodemailer Error:', err);
      return res.status(500).json({ message: 'Failed to send reset code to email' });
    }

    res.status(200).json({ message: 'Reset code sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;
    
    const otpRecord = await Otp.findOne({ identifier, otp });
    if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });
    
    const user = await User.findOne({ email: identifier });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    await Otp.findByIdAndDelete(otpRecord._id);
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { emailOrMobile, password } = req.body;
    
    const user = await User.findOne({ 
      $or: [
        { email: emailOrMobile },
        { username: emailOrMobile }
      ] 
    });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
