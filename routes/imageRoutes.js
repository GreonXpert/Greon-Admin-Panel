// routes/imageRoutes.js - FIXED Version
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose'); // Add this import
const imageController = require('../controllers/imageController');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Temporary storage, will be moved by controller
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Create temp directory if it doesn't exist
const fs = require('fs');
const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image ID format'
    });
  }
  
  next();
};

// Public routes (no authentication required)
// Get images by category (public endpoint for frontend display)
router.get('/category/:category', imageController.getImagesByCategory);

// Get single image by ID (public endpoint) - FIXED: Added validation
router.get('/:id', validateObjectId, imageController.getImageById);

// All routes below require authentication
router.use(auth);

// Get all images with filtering and pagination
router.get('/', imageController.getAllImages);

// Upload image (supports both multipart and base64)
router.post('/upload', upload.single('image'), imageController.uploadImage);

// Get image statistics
router.get('/stats/summary', imageController.getImageStats);

// Update image metadata - FIXED: Added validation
router.put('/:id', validateObjectId, imageController.updateImage);

// Replace image file - FIXED: Added validation
router.put('/:id/replace', validateObjectId, upload.single('image'), imageController.replaceImage);

// Delete image (soft delete by default, permanent with forceDelete=true) - FIXED: Added validation
router.delete('/:id', validateObjectId, imageController.deleteImage);

module.exports = router;