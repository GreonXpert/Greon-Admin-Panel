// routes/emissionRoutes.js - Emissions Data API Routes
const express = require('express');
const router = express.Router();
const emissionController = require('../controllers/emissionController');
const auth = require('../middleware/auth');

// Public routes (no authentication required)
// Get all emissions data with optional filtering
router.get('/', emissionController.getAllEmissions);

// Get emissions data for a specific year
router.get('/:year', emissionController.getEmissionByYear);

// Get summary statistics for emissions data
router.get('/stats/summary', emissionController.getEmissionStats);

// Protected routes (authentication required)
// Apply auth middleware to all routes below
router.use(auth);

// Create new emissions data
router.post('/', emissionController.createEmission);

// Update emissions data for a specific year
router.put('/:year', emissionController.updateEmission);

// Delete emissions data for a specific year
router.delete('/:year', emissionController.deleteEmission);

// Bulk import emissions data
router.post('/bulk-import', emissionController.bulkImportEmissions);

module.exports = router;