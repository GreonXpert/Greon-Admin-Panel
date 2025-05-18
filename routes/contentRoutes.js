// routes/contentRoutes.js - Content Management Routes
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const auth = require('../middleware/auth');

// All routes are protected - require authentication
router.use(auth);

// Get all content sections
router.get('/', contentController.getAllContent);

// Get content by section
router.get('/:section', contentController.getContentBySection);

// Create or update content for a section
router.post('/:section', contentController.updateContent);

// Delete content by section (mark as inactive)
router.delete('/:section', contentController.deleteContent);

// Get content history for a section
router.get('/:section/history', contentController.getContentHistory);

// Restore a previous content version
router.post('/restore/:contentId', contentController.restoreContent);

module.exports = router;