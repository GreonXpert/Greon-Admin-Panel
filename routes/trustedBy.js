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
  deleteRecognition,      // NEW
   getProductIcons,
  getProductIcon,
  addProductIcon,
  updateProductIcon,
  deleteProductIcon
} = require('../controllers/trustedByController');
const { uploadPartnership, uploadRecognition, uploadProductIcon } = require('../middleware/upload');

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

// ========================= NEW PRODUCT ICON ROUTES =========================
// Product Icons routes
// Product Icons routes
router.route('/product-icons')
  .get(getProductIcons)
  .post(uploadProductIcon, addProductIcon);

router.route('/product-icons/:id')
  .get(getProductIcon)
  .put(uploadProductIcon, updateProductIcon)
  .delete(deleteProductIcon);


module.exports = router;
