// routes/journeyRoutes.js
const express = require('express');
const router = express.Router();

const {
  getAllJourney,
  getJourneyById,
  addJourney,
  updateJourney,
  deleteJourney,
  reorderJourney
} = require('../controllers/journeyController');

const { uploadJourney } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllJourney);
router.get('/:id', getJourneyById);

// Private routes (Admin only)
router.post('/', 
  protect, 
  authorize('admin', 'superadmin'), 
  uploadJourney, 
  addJourney
);

router.put('/:id', 
  protect, 
  authorize('admin', 'superadmin'), 
  uploadJourney, 
  updateJourney
);

router.delete('/:id', 
  protect, 
  authorize('admin', 'superadmin'), 
  deleteJourney
);

router.put('/reorder/milestones', 
  protect, 
  authorize('admin', 'superadmin'), 
  reorderJourney
);

module.exports = router;
