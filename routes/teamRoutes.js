// routes/teamRoutes.js

const express = require('express');
const router = express.Router();

const {
  getAllTeamMembers,
  getTeamMemberById,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  reorderTeamMembers,
  getTeamStats
} = require('../controllers/teamController');

const { uploadTeamMember } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllTeamMembers);
router.get('/stats', getTeamStats);
router.get('/:id', getTeamMemberById);

// Private routes (Admin only)
router.post('/',
  protect,
  authorize('admin', 'superadmin'),
  uploadTeamMember,
  addTeamMember
);

router.put('/:id',
  protect,
  authorize('admin', 'superadmin'),
  uploadTeamMember,
  updateTeamMember
);

router.delete('/:id',
  protect,
  authorize('admin', 'superadmin'),
  deleteTeamMember
);

router.put('/reorder/members',
  protect,
  authorize('admin', 'superadmin'),
  reorderTeamMembers
);

module.exports = router;
