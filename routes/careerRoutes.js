// routes/careerRoutes.js - Career and Application Routes

const express = require('express');
const { body } = require('express-validator');
const CareerController = require('../controllers/careerController');
const { uploadCareer, uploadApplication } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth'); // If you have auth

const router = express.Router();

// Validation middleware for job creation/update
const jobValidation = [
  body('jobRole')
    .trim()
    .notEmpty()
    .withMessage('Job role is required')
    .isLength({ max: 200 })
    .withMessage('Job role must not exceed 200 characters'),
  body('shortDescription')
    .trim()
    .notEmpty()
    .withMessage('Short description is required')
    .isLength({ max: 300 })
    .withMessage('Short description must not exceed 300 characters'),
  body('jobDescription')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ max: 2000 })
    .withMessage('Job description must not exceed 2000 characters'),
  body('experienceRequired')
    .trim()
    .notEmpty()
    .withMessage('Experience required is required'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('jobType')
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'])
    .withMessage('Invalid job type'),
  body('department')
    .isIn(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product', 'Design'])
    .withMessage('Invalid department'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'closed', 'draft'])
    .withMessage('Invalid status'),
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value')
];

// Validation middleware for job applications
const applicationValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage('Valid phone number is required'),
  body('experience')
    .trim()
    .notEmpty()
    .withMessage('Experience is required'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Current/desired position is required'),
  body('noticePeriod')
    .trim()
    .notEmpty()
    .withMessage('Notice period is required'),
  body('education.degree')
    .trim()
    .notEmpty()
    .withMessage('Degree is required'),
  body('education.field')
    .trim()
    .notEmpty()
    .withMessage('Field of study is required'),
  body('education.institution')
    .trim()
    .notEmpty()
    .withMessage('Institution is required'),
  body('education.year')
    .isInt({ min: 1950, max: 2030 })
    .withMessage('Valid graduation year is required'),
  body('location.current')
    .trim()
    .notEmpty()
    .withMessage('Current location is required'),
  body('consentToDataProcessing')
    .isBoolean()
    .withMessage('Consent to data processing is required')
    .custom((value) => {
      if (!value) {
        throw new Error('You must consent to data processing to apply');
      }
      return true;
    })
];

// Public Routes - Job Listings
router.get('/', CareerController.getAllJobs);
router.get('/featured', CareerController.getFeaturedJobs);
router.get('/department/:department', CareerController.getJobsByDepartment);
router.get('/:id', CareerController.getJobById);

// Public Routes - Job Applications
router.post('/:jobId/apply',
  uploadApplication,
  applicationValidation,
  CareerController.applyForJob
);

// Admin Routes - Job Management (protected)
router.post('/',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  uploadCareer,
  jobValidation,
  CareerController.createJob
);

router.put('/:id',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  uploadCareer,
  jobValidation,
  CareerController.updateJob
);

router.delete('/:id',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  CareerController.deleteJob
);

// Admin Routes - Application Management (protected)
router.get('/admin/applications',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  CareerController.getAllApplications
);

router.get('/admin/applications/:id',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  CareerController.getApplicationById
);

router.put('/admin/applications/:id/status',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  [
    body('status')
      .isIn(['pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn'])
      .withMessage('Invalid status'),
    body('note')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Note must not exceed 1000 characters')
  ],
  CareerController.updateApplicationStatus
);

router.get('/admin/applications/:id/resume',
  // protect, authorize('admin', 'superadmin'), // Uncomment if you have auth
  CareerController.downloadResume
);

module.exports = router;
