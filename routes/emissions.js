const express = require('express');
const router = express.Router();
const {
  getAllEmissions,
  getEmissionByYear,
  addEmissionData,
  updateEmissionData,
  deleteEmissionData
} = require('../controllers/emissionController');

// Get all emissions data
router.get('/', getAllEmissions);

// Get emissions data by year
router.get('/:year', getEmissionByYear);

// Add new emissions data
router.post('/', addEmissionData);

// Update emissions data by year
router.put('/:year', updateEmissionData);

// Delete emissions data by year
router.delete('/:year', deleteEmissionData);

module.exports = router;
