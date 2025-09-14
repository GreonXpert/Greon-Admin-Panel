// routes/solutionRoutes.js

const express = require('express');
const router = express.Router();

const {
  getAllSolutions,
  getSolutionById,
  addSolution,
  updateSolution,
  deleteSolution,
  reorderSolutions,
  getSolutionStats
} = require('../controllers/solutionController');

const { uploadSolutions } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllSolutions);
router.get('/stats', getSolutionStats);
router.get('/:id', getSolutionById);

// Private routes (Admin only)
router.post('/',
  protect,
  authorize('admin', 'superadmin'),
  uploadSolutions,
  addSolution
);

router.put('/:id',
  protect,
  authorize('admin', 'superadmin'),
  uploadSolutions,
  updateSolution
);

router.delete('/:id',
  protect,
  authorize('admin', 'superadmin'),
  deleteSolution
);

router.put('/reorder/solutions',
  protect,
  authorize('admin', 'superadmin'),
  reorderSolutions
);

module.exports = router;
