const express = require('express');
const router = express.Router();
const {
  getPbsCategories,
  addPbsCategory,
  updatePbsCategory,
  deletePbsCategory,
  getPbsFrameworks,
  addPbsFramework,
  updatePbsFramework,
  deletePbsFramework,
  getPbsFrameworksByCategory
} = require('../controllers/PoweredByScience/pbsController');
const { uploadPbsFramework } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth'); // Assuming you want to protect these routes

// Category routes
router.route('/categories')
  .get(getPbsCategories)
  .post(protect, authorize('admin', 'superadmin'), addPbsCategory);

router.route('/categories/:id')
    .put(protect, authorize('admin', 'superadmin'), updatePbsCategory)
    .delete(protect, authorize('admin', 'superadmin'), deletePbsCategory);

// Framework routes
router.route('/frameworks')
  .get(getPbsFrameworks)
  .post(protect, authorize('admin', 'superadmin'), uploadPbsFramework, addPbsFramework);

router.route('/frameworks/:id')
    .put(protect, authorize('admin', 'superadmin'), uploadPbsFramework, updatePbsFramework)
    .delete(protect, authorize('admin', 'superadmin'), deletePbsFramework);

router.route('/frameworks/category/:categoryId')
    .get(getPbsFrameworksByCategory);

module.exports = router;