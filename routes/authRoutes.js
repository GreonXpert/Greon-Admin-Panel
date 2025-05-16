// routes/authRoutes.js - Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyOTP);

// Protected routes
router.get('/profile', auth, authController.getProfile);

module.exports = router;