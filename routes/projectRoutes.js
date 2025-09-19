// routes/projectRoutes.js

const express = require('express');
const router = express.Router();

const {
  getAllProjects,
  getProjectById,
  addProject,
  updateProject,
  deleteProject,
  reorderProjects,
} = require('../controllers/projectController');

const { uploadProjects } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

// Admin only
router.post(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  uploadProjects,    // handles mainImage + images[]
  addProject
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  uploadProjects,    // allows replacing mainImage and/or adding more images
  updateProject
);

router.delete(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  deleteProject
);

router.put(
  '/reorder',
  protect,
  authorize('admin', 'superadmin'),
  reorderProjects
);

module.exports = router;
