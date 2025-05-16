// utils/otpGenerator.js - OTP Generator Utility
const crypto = require('crypto');

const generateOTP = () => {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { generateOTP };
