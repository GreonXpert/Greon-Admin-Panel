const mongoose = require('mongoose');
const Partnership = require('../models/partnership');
const Recognition = require('../models/recognition');
const ProductIcon = require('../models/productIcon');
const fs = require('fs').promises;
const path = require('path');

// Helper function to delete image file
const deleteImageFile = async (imageUrl) => {
  try {
    if (!imageUrl) return;
    
    // Extract filename from URL path
    // imageUrl format: "/uploads/productIcons/filename.jpg"
    const filename = path.basename(imageUrl);
    
    // Determine the folder based on URL path
    let folderPath = '';
    if (imageUrl.includes('/uploads/productIcons/')) {
      folderPath = path.join(__dirname, '..', 'uploads', 'productIcons');
    } else if (imageUrl.includes('/uploads/partnerships/')) {
      folderPath = path.join(__dirname, '..', 'uploads', 'partnerships');
    } else if (imageUrl.includes('/uploads/recognitions/')) {
      folderPath = path.join(__dirname, '..', 'uploads', 'recognitions');
    } else {
      console.log('⚠️ Unknown image path format:', imageUrl);
      return;
    }
    
    const filePath = path.join(folderPath, filename);
    
    // Check if file exists and delete it
    await fs.access(filePath);
    await fs.unlink(filePath);
    console.log(`🗑️ Deleted image file: ${filePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️ Image file not found (already deleted):', imageUrl);
    } else {
      console.error('❌ Error deleting image file:', error);
    }
  }
};



// ========================= EXISTING FUNCTIONS (KEEP AS THEY ARE) =========================
exports.getPartnerships = async (req, res) => {
  try {
    const partnerships = await Partnership.find().sort({ createdAt: -1 });
    res.json({ success: true, data: partnerships });
  } catch (error) {
    console.error('❌ Error fetching partnerships:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getRecognitions = async (req, res) => {
  try {
    const recognitions = await Recognition.find().sort({ createdAt: -1 });
    res.json({ success: true, data: recognitions });
  } catch (error) {
    console.error('❌ Error fetching recognitions:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Get all product icons
// @route GET /api/trusted/product-icons
// @access Public
exports.getProductIcons = async (req, res) => {
  try {
    const productIcons = await ProductIcon.find().sort({ createdAt: -1 })
    res.json({ 
      success: true, 
      data: productIcons,
    });
  } catch (error) {
    console.error('❌ Error fetching product icons:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Add a new partnership with image upload
// @route POST /api/trusted/partnerships
// @access Private
exports.addPartnership = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Please provide name and description' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const imageUrl = `/uploads/partnerships/${req.file.filename}`;
    const newPartnership = new Partnership({
      name,
      description,
      imageUrl,
    });

    await newPartnership.save();
    const io = req.app.get('io');
    const partnerships = await Partnership.find().sort({ createdAt: -1 });
    io.to('trustedBy').emit('partnerships-updated', { success: true, data: partnerships });

    console.log(`✅ Created partnership: ${newPartnership.name}`);
    res.status(201).json({ success: true, data: newPartnership });
  } catch (error) {
    console.error('❌ Error creating partnership:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Update a partnership
// @route PUT /api/trusted/partnerships/:id
// @access Private
exports.updatePartnership = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid partnership ID' });
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.file) updates.imageUrl = `/uploads/partnerships/${req.file.filename}`;

    const updated = await Partnership.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }

    const io = req.app.get('io');
    const partnerships = await Partnership.find().sort({ createdAt: -1 });
    io.to('trustedBy').emit('partnerships-updated', { success: true, data: partnerships });

    console.log(`✅ Updated partnership: ${updated.name}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Error updating partnership:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Delete a partnership
// @route DELETE /api/trusted/partnerships/:id
// @access Private
exports.deletePartnership = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid partnership ID' });
    }

    // Find the partnership first to get the image URL
    const partnership = await Partnership.findById(id);
    
    if (!partnership) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }

    // Delete the partnership from database
    const removed = await Partnership.findByIdAndDelete(id);
    
    // Delete the associated image file
    if (removed && removed.imageUrl) {
      await deleteImageFile(removed.imageUrl);
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const partnerships = await Partnership.find().sort({ createdAt: -1 });
      io.to('trustedBy').emit('partnerships-updated', { success: true, data: partnerships });
    }

    console.log(`✅ Deleted partnership and image: ${removed.name}`);
    res.json({ success: true, message: 'Partnership and image deleted successfully', data: removed });
  } catch (error) {
    console.error('❌ Error deleting partnership:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Add a new recognition with image upload
// @route POST /api/trusted/recognitions
// @access Private
exports.addRecognition = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide recognition name' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const imageUrl = `/uploads/recognitions/${req.file.filename}`;
    const newRecognition = new Recognition({
      name,
      imageUrl,
    });

    await newRecognition.save();
    const io = req.app.get('io');
    const recognitions = await Recognition.find().sort({ createdAt: -1 });
    io.to('trustedBy').emit('recognitions-updated', { success: true, data: recognitions });

    console.log(`✅ Created recognition: ${newRecognition.name}`);
    res.status(201).json({ success: true, data: newRecognition });
  } catch (error) {
    console.error('❌ Error creating recognition:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Update a recognition
// @route PUT /api/trusted/recognitions/:id
// @access Private
exports.updateRecognition = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid recognition ID' });
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.file) updates.imageUrl = `/uploads/recognitions/${req.file.filename}`;

    const updated = await Recognition.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Recognition not found' });
    }

    const io = req.app.get('io');
    const recognitions = await Recognition.find().sort({ createdAt: -1 });
    io.to('trustedBy').emit('recognitions-updated', { success: true, data: recognitions });

    console.log(`✅ Updated recognition: ${updated.name}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Error updating recognition:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Delete a recognition
// @route DELETE /api/trusted/recognitions/:id
// @access Private
exports.deleteRecognition = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid recognition ID' });
    }

    // Find the recognition first to get the image URL
    const recognition = await Recognition.findById(id);
    
    if (!recognition) {
      return res.status(404).json({ success: false, message: 'Recognition not found' });
    }

    // Delete the recognition from database
    const removed = await Recognition.findByIdAndDelete(id);
    
    // Delete the associated image file
    if (removed && removed.imageUrl) {
      await deleteImageFile(removed.imageUrl);
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const recognitions = await Recognition.find().sort({ createdAt: -1 });
      io.to('trustedBy').emit('recognitions-updated', { success: true, data: recognitions });
    }

    console.log(`✅ Deleted recognition and image: ${removed.name}`);
    res.json({ success: true, message: 'Recognition and image deleted successfully', data: removed });
  } catch (error) {
    console.error('❌ Error deleting recognition:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ========================= SIMPLIFIED PRODUCT ICON FUNCTIONS =========================



// @desc Get single product icon by ID
// @route GET /api/trusted/product-icons/:id
// @access Public
exports.getProductIcon = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product icon ID' });
    }
    
    const productIcon = await ProductIcon.findById(id);
    
    if (!productIcon) {
      return res.status(404).json({ success: false, message: 'Product icon not found' });
    }
    
    res.json({ success: true, data: productIcon });
  } catch (error) {
    console.error('❌ Error fetching product icon:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Add a new product icon
// @route POST /api/trusted/product-icons
// @access Private
exports.addProductIcon = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validation
    if (!name || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name and description' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a product image' 
      });
    }
    
    const imageUrl = `/uploads/productIcons/${req.file.filename}`;
    
    const newProductIcon = new ProductIcon({
      name,
      description,
      imageUrl
    });
    
    await newProductIcon.save();
    
    // Emit real-time update
    const io = req.app.get('io');
    const productIcons = await ProductIcon.find().sort({ createdAt: -1 });
    io.to('trustedBy').emit('product-icons-updated', { success: true, data: productIcons });
    
    console.log(`✅ Created product icon: ${newProductIcon.name}`);
    res.status(201).json({ success: true, data: newProductIcon });
  } catch (error) {
    console.error('❌ Error creating product icon:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Update a product icon
// @route PUT /api/trusted/product-icons/:id
// @access Private
exports.updateProductIcon = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product icon ID' });
    }
    
    const updates = {};
    
    // Handle text fields
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    
    // Handle image update
    if (req.file) {
      updates.imageUrl = `/uploads/productIcons/${req.file.filename}`;
    }
    
    const updated = await ProductIcon.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product icon not found' });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    const productIcons = await ProductIcon.find().sort({ createdAt: -1 });
    io.to('trustedBy').emit('product-icons-updated', { success: true, data: productIcons });
    
    console.log(`✅ Updated product icon: ${updated.name}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Error updating product icon:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc Delete a product icon
// @route DELETE /api/trusted/product-icons/:id
// @access Private
exports.deleteProductIcon = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product icon ID' });
    }
    
    // Find the product icon first to get the image URL
    const productIcon = await ProductIcon.findById(id);
    
    if (!productIcon) {
      return res.status(404).json({ success: false, message: 'Product icon not found' });
    }
    
    // Delete the product icon from database
    const removed = await ProductIcon.findByIdAndDelete(id);
    
    // Delete the associated image file
    if (removed && removed.imageUrl) {
      await deleteImageFile(removed.imageUrl);
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const productIcons = await ProductIcon.find().sort({ createdAt: -1 });
      io.to('trustedBy').emit('product-icons-updated', { success: true, data: productIcons });
    }
    
    console.log(`✅ Deleted product icon and image: ${removed.name}`);
    res.json({ success: true, message: 'Product icon and image deleted successfully', data: removed });
  } catch (error) {
    console.error('❌ Error deleting product icon:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

