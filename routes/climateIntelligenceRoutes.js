// routes/climateIntelligence.js
const express = require('express');
const router = express.Router();

const {
  getFeatures,
  addFeature,
  updateFeature,
  deleteFeature,
} = require('../controllers/climateIntelligenceController');

const { uploadClimateFeature } = require('../middleware/upload'); // adjust path if your upload.js lives elsewhere
const { protect, authorize } = require('../middleware/auth'); // Assuming you want to protect these routes

// Public
router.get('/features', getFeatures);

// Private (attach your auth middleware if needed)
// Upload field name MUST be 'image'
router.post('/features', protect,authorize('admin', 'superadmin'),   uploadClimateFeature, addFeature);
router.put('/features/:id',protect,authorize('admin', 'superadmin'),   uploadClimateFeature, updateFeature);
router.delete('/features/:id',protect,authorize('admin', 'superadmin'),  deleteFeature);

module.exports = router;
