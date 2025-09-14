// routes/storyRoutes.js - FIXED VERSION
const express = require('express');
const { body } = require('express-validator');
const StoryController = require('../controllers/storyController');
const { uploadSustainabilityStory } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth'); // If you have auth

const router = express.Router();

// Validation middleware
const storyValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  
  body('category')
    .isIn(['Blog', 'Video', 'Resources'])
    .withMessage('Category must be Blog, Video, or Resources'),
  
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) return true;
      throw new Error('Tags must be an array or comma-separated string');
    }),
  
  // Conditional validations
  body('author')
    .if((value, { req }) => req.body.category === 'Blog')
    .notEmpty()
    .withMessage('Author is required for blog posts'),
  
  body('videoUrl')
    .if((value, { req }) => req.body.category === 'Video')
    .isURL()
    .withMessage('Valid video URL is required for videos'),
  
  body('fileType')
    .if((value, { req }) => req.body.category === 'Resources')
    .optional()
    .isIn(['PDF', 'Excel', 'Word', 'PowerPoint'])
    .withMessage('Invalid file type for resources'),
  
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value')
];

// Public Routes
router.get('/', StoryController.getAllStories);
router.get('/featured', StoryController.getFeaturedStories);
router.get('/trending', StoryController.getTrendingStories);
router.get('/analytics', StoryController.getAnalytics);

// FIXED: Ensure correct order - specific routes before parameterized routes
router.get('/:id/download', StoryController.downloadStoryFile);
 router.get('/:id', StoryController.getStoryById);

// Private Routes (with authentication and file upload)
router.post('/',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  uploadSustainabilityStory,
  storyValidation,
  StoryController.createStory
);

router.put('/:id',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth  
  uploadSustainabilityStory,
  storyValidation,
  StoryController.updateStory
);

router.delete('/:id',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  StoryController.deleteStory
);

// Engagement and Comments
router.post('/:id/engagement', [
  body('action')
    .isIn(['like', 'share', 'click', 'download', 'view'])
    .withMessage('Invalid action type')
], StoryController.trackEngagement);

router.post('/:id/comments', [
  body('user')
    .trim()
    .notEmpty()
    .withMessage('User name is required'),
  body('message')
    .trim()
    .notEmpty()  
    .withMessage('Comment message is required')
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters')
], StoryController.addComment);

module.exports = router;
