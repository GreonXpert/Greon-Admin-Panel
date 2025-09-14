const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc Register user
// @route POST /api/auth/register
// @access Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Only superadmin can create admin users
    if (role && role === 'admin') {
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can create admin users'
        });
      }
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      role: role || 'user'
    };

    // If created by authenticated user, add createdBy field
    if (req.user) {
      userData.createdBy = req.user._id;
    }

    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    // Emit real-time update if Socket.IO is available
    const io = req.app.get('io');
    if (io) {
      io.emit('user-registered', {
        user: user,
        registeredBy: req.user || null,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Login user
// @route POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    // Check password
        const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // IMPORTANT: Remove password from the user object before sending the response
    user.password = undefined;

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('user-login', {
        user: user,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
// @access Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Create admin (Superadmin only)
// @route POST /api/auth/create-admin
// @access Private (Superadmin only)
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      createdBy: req.user._id
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('admin-created', {
        admin: admin,
        createdBy: req.user,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: admin,
      message: 'Admin created successfully'
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Get all users (Admin/Superadmin only)
// @route GET /api/auth/users
// @access Private (Admin/Superadmin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('createdBy', 'name email role');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Logout user
// @route POST /api/auth/logout
// @access Private
exports.logout = async (req, res) => {
  try {
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('user-logout', {
        user: req.user,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
