// routes/contentRoutes.js - Enhanced Content Management Routes
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const auth = require('../middleware/auth');

// Public route - no authentication required
// Get content by section
router.get('/:section', contentController.getContentBySection);

// Get all content sections
router.get('/', contentController.getAllContent);

// All routes below require authentication
router.use(auth);



// Create or update content for a section (creates new version for history)
router.post('/:section', contentController.updateContent);

// Edit existing content (updates without creating new version)
router.put('/:section', contentController.editContent);

// Upsert content (create or replace - ensures only one record)
router.patch('/:section', contentController.upsertContent);

// Bulk edit multiple sections
router.put('/bulk/edit', contentController.bulkEditContent);

// Delete content by section (mark as inactive)
router.delete('/:section', contentController.deleteContent);

// Get content history for a section
router.get('/:section/history', contentController.getContentHistory);

// Restore a previous content version
router.post('/restore/:contentId', contentController.restoreContent);

module.exports = router;