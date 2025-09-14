const express = require('express');
const router = express.Router();
const {
  getPartnerships,
  addPartnership,
  updatePartnership,     // NEW
  deletePartnership,     // NEW
  getRecognitions,
  addRecognition,
  updateRecognition,     // NEW
  deleteRecognition      // NEW
} = require('../controllers/trustedByController');
const { uploadPartnership, uploadRecognition } = require('../middleware/upload');

// Partnership routes
router.route('/partnerships')
  .get(getPartnerships)
  .post(uploadPartnership, addPartnership);

router.route('/partnerships/:id')
  .put(uploadPartnership, updatePartnership)   // image optional on update
  .delete(deletePartnership);

// Recognition routes
router.route('/recognitions')
  .get(getRecognitions)
  .post(uploadRecognition, addRecognition);

router.route('/recognitions/:id')
  .put(uploadRecognition, updateRecognition)   // image optional on update
  .delete(deleteRecognition);

module.exports = router;
