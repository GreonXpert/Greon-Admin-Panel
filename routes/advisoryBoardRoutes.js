const express = require('express');
const router = express.Router();
const {
    getAdvisoryMembers,
    addAdvisoryMember,
    updateAdvisoryMember,
    deleteAdvisoryMember
} = require('../controllers/advisoryBoardController');
const { uploadAdvisoryMember } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(getAdvisoryMembers)
    .post(protect, authorize('admin', 'superadmin'), uploadAdvisoryMember, addAdvisoryMember);

router.route('/:id')
    .put(protect, authorize('admin', 'superadmin'), uploadAdvisoryMember, updateAdvisoryMember)
    .delete(protect, authorize('admin', 'superadmin'), deleteAdvisoryMember);

module.exports = router;
