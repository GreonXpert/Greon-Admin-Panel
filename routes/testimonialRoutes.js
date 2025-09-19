// routes/testimonialRoutes.js
const express = require('express');
const router = express.Router();

const {
  getTestimonials,
  createTestimonial,
   getCount,  
  updateTestimonial,
  deleteTestimonial,
  updateStatus,
  toggleFeatured,
  getPublicSubmissionLink,     // <-- NEW
  publicCreateTestimonial,     // <-- NEW
} = require('../controllers/testimonialController');

const { protect, authorize } = require('../middleware/auth');
const { uploadTestimonialPhoto, handleUploadError } = require('../middleware/upload');



// Public: get a submission URL + code + count (no auth, no randomness)
router.get('/count', getCount);     
router.post('/submission-link', getPublicSubmissionLink);

// Public: submit a testimonial (photo optional, field name: "photo")
router.post(
  '/public',
  uploadTestimonialPhoto,
  handleUploadError,
  publicCreateTestimonial
);


// Public: list
router.get('/', getTestimonials);

// Admin: create with photo upload (field name: 'photo'); fallback to 'avatar' in body
router.post(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  uploadTestimonialPhoto,
  handleUploadError,
  createTestimonial
);

// Admin: update
router.put(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  uploadTestimonialPhoto,
  handleUploadError,
  updateTestimonial
);

// Admin: status + featured
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), updateStatus);
router.patch('/:id/feature', protect, authorize('admin', 'superadmin'), toggleFeatured);

// Admin: delete
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteTestimonial);

module.exports = router;
