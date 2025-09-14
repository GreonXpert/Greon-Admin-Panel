// routes/pendingSubmissions.js - UPDATED WITH NEW UPLOAD MIDDLEWARE
const express = require('express');
const router = express.Router();
const PendingSubmissionController = require('../controllers/pendingSubmissionController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { uploadExternalSubmission, uploadSustainabilityStory, handleUploadError } = require('../middleware/upload');

// ✅ Enhanced validation rules for external submissions
const submitStoryValidation = [
  body('password').isLength({ min: 4, max: 4 }).withMessage('Password must be 4 digits'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title is required and must be under 200 characters'),
  body('description').isLength({ min: 1, max: 500 }).withMessage('Description is required and must be under 500 characters'),
  body('content').isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('category').isIn(['Blog', 'Video', 'Resources']).withMessage('Invalid category'),
  body('submitterName').isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('submitterEmail').isEmail().withMessage('Valid email is required'),
  
  // ✅ NEW: Category-specific validations
  body('videoUrl').if(body('category').equals('Video')).isURL().withMessage('Valid video URL required for videos'),
  body('resourceType').if(body('category').equals('Resources')).isIn(['PDF', 'Excel', 'Word', 'PowerPoint']).withMessage('Invalid resource type'),
];

// ✅ Public routes - Updated to use new upload middleware
router.post('/:token/submit', 
  uploadExternalSubmission,
  handleUploadError,
  submitStoryValidation, 
  PendingSubmissionController.submitStory
);

// ✅ Admin/Superadmin routes - Updated to use sustainability story upload for approval
router.get('/', 
  protect, 
  authorize('admin', 'superadmin'), 
  PendingSubmissionController.getAllPendingSubmissions
);

router.get('/:id', 
  protect, 
  authorize('admin', 'superadmin'), 
  PendingSubmissionController.getPendingSubmission
);

router.post('/:id/approve', 
  protect, 
  authorize('admin', 'superadmin'), 
  uploadSustainabilityStory,  // Allow admin to upload replacement image
  handleUploadError,
  PendingSubmissionController.approveSubmission
);

router.post('/:id/reject', 
  protect, 
  authorize('admin', 'superadmin'), 
  [
    body('reviewNotes').isLength({ min: 1 }).withMessage('Review notes are required for rejection')
  ], 
  PendingSubmissionController.rejectSubmission
);

router.post('/:id/request-revision', 
  protect, 
  authorize('admin', 'superadmin'), 
  [
    body('revisionRequested').isLength({ min: 1 }).withMessage('Revision details are required')
  ], 
  PendingSubmissionController.requestRevision
);

router.delete('/:id', 
  protect, 
  authorize('admin', 'superadmin'), 
  PendingSubmissionController.deleteSubmission
);

module.exports = router;
