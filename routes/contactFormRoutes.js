// routes/contactFormRoutes.js
const express = require('express');
const router = express.Router();
const {
  createContactForm,
  getAllContactForms,
  getContactFormById,
  updateContactForm,
  addResponse,
  deleteContactForm,
  getAnalytics,
  bulkMarkAsRead
} = require('../controllers/contactFormController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/', createContactForm);

// Private routes (Admin/SuperAdmin only)
router.get('/', protect, authorize('admin', 'superadmin'), getAllContactForms);
router.get('/analytics/dashboard', protect, authorize('admin', 'superadmin'), getAnalytics);
router.put('/bulk/mark-read', protect, authorize('admin', 'superadmin'), bulkMarkAsRead);
router.get('/:id', protect, authorize('admin', 'superadmin'), getContactFormById);
router.put('/:id', protect, authorize('admin', 'superadmin'), updateContactForm);
router.post('/:id/responses', protect, authorize('admin', 'superadmin'), addResponse);
router.delete('/:id', protect, authorize('superadmin'), deleteContactForm);

module.exports = router;
