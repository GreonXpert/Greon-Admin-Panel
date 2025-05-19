// routes/imageRoutes.js - Image Management Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
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

// Public routes (no authentication required)
// Get images by category (public endpoint for frontend display)
router.get('/category/:category', imageController.getImagesByCategory);

// Get single image by ID (public endpoint)
router.get('/:id', imageController.getImageById);

// All routes below require authentication
router.use(auth);

// Upload image (supports both multipart and base64)
router.post('/upload', upload.single('image'), imageController.uploadImage);

// Get all images with filtering and pagination
router.get('/', imageController.getAllImages);

// Get image statistics
router.get('/stats/summary', imageController.getImageStats);

// Update image metadata
router.put('/:id', imageController.updateImage);

// Replace image file
router.put('/:id/replace', upload.single('image'), imageController.replaceImage);

// Delete image (soft delete by default, permanent with forceDelete=true)
router.delete('/:id', imageController.deleteImage);

module.exports = router;