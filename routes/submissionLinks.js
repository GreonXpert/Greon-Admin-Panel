// routes/submissionLinks.js - CREATE THIS FILE IF MISSING
const express = require('express');
const router = express.Router();
const SubmissionLinkController = require('../controllers/submissionLinkController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules
const createSubmissionLinkValidation = [
  body('title').isLength({ min: 1, max: 100 }).withMessage('Title is required and must be under 100 characters'),
  body('allowedCategories').isArray({ min: 1 }).withMessage('At least one category must be allowed'),
  body('maxSubmissions').optional().isInt({ min: 1, max: 100 }).withMessage('Max submissions must be between 1 and 100'),
  body('expiresInDays').optional().isInt({ min: 1, max: 365 }).withMessage('Expiration must be between 1 and 365 days')
];

// Admin/Superadmin routes
router.post('/', protect, authorize('admin', 'superadmin'), createSubmissionLinkValidation, SubmissionLinkController.createSubmissionLink);
router.get('/', protect, authorize('admin', 'superadmin'), SubmissionLinkController.getAllSubmissionLinks);
router.get('/:id', protect, authorize('admin', 'superadmin'), SubmissionLinkController.getSubmissionLink);
router.patch('/:id/toggle', protect, authorize('admin', 'superadmin'), SubmissionLinkController.toggleSubmissionLink);
router.delete('/:id', protect, authorize('admin', 'superadmin'), SubmissionLinkController.deleteSubmissionLink);

// Public routes
router.post('/:token/validate', [
  body('password').isLength({ min: 4, max: 4 }).withMessage('Password must be 4 digits')
], SubmissionLinkController.validateSubmissionLink);

module.exports = router;
