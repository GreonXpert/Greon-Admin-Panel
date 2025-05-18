// controllers/authController.js - Authentication Controller
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/otpGenerator');
const mailer = require('../config/mailer');

// Request OTP for login
exports.requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if email is provided
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Check if email is the admin email from env
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized access attempt' 
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Save OTP to database (replace if exists)
    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, otp });
    
    // Send OTP via email
    const emailSent = await mailer.sendOTPEmail(email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send OTP. Please try again.' 
      });
    }
    
    // Check if user exists, create if not
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: 'Admin',
        email,
        role: 'admin',
      });
    }
    
    console.log(`OTP sent to admin email: ${email}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent to your email' 
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Verify OTP and login
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }
    
    // Check if email is the admin email
    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized access attempt' 
      });
    }
    
    // Find the OTP record
    const otpRecord = await OTP.findOne({ email });
    
    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired or not found. Please request a new OTP.' 
      });
    }
    
    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.' 
      });
    }
    
    // OTP verified, find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update user status
    user.isVerified = true;
    user.lastLogin = Date.now();
    await user.save();
    
    // Delete used OTP
    await OTP.findOneAndDelete({ email });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`Admin authenticated successfully: ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Test protected route
exports.testProtected = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'This is a protected route',
    user: req.user
  });
};