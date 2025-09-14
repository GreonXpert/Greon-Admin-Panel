const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  createAdmin,
  getUsers,
  logout
} = require('../controllers/authController');

const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes
router.post('/register', optionalAuth, register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Admin/Superadmin routes
router.get('/users', protect, authorize('admin', 'superadmin'), getUsers);

// Superadmin only routes
router.post('/create-admin', protect, authorize('superadmin'), createAdmin);

module.exports = router;
