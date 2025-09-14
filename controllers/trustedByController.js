const mongoose = require('mongoose')
const Partnership = require('../models/partnership');
const Recognition = require('../models/recognition');

// ... (getPartnerships and getRecognitions functions remain the same)
exports.getPartnerships = async (req, res) => {
  try {
    const partnerships = await Partnership.find();
    res.json({ success: true, data: partnerships });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getRecognitions = async (req, res) => {
  try {
    const recognitions = await Recognition.find();
    res.json({ success: true, data: recognitions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// @desc    Add a new partnership with image upload
// @route   POST /api/trusted/partnerships
// @access  Private
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

    const newPartnership = new Partnership({ name, description, imageUrl });
    await newPartnership.save();

    // Emit real-time update
    const io = req.app.get('io');
    const partnerships = await Partnership.find();
    io.to('trustedBy').emit('partnerships-updated', { success: true, data: partnerships });

    res.status(201).json({ success: true, data: newPartnership });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a partnership (image optional)
// @route   PUT /api/trusted/partnerships/:id
// @access  Private
exports.updatePartnership = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid partnership id' });
    }

    const updates = {};
    if (typeof req.body.name !== 'undefined') updates.name = req.body.name;
    if (typeof req.body.description !== 'undefined') updates.description = req.body.description;
    if (req.file) updates.imageUrl = `/uploads/partnerships/${req.file.filename}`;

    const updated = await Partnership.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }

    // Emit real-time update with fresh list
    const io = req.app.get('io');
    const partnerships = await Partnership.find();
    io.to('trustedBy').emit('partnerships-updated', { success: true, data: partnerships });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a partnership
// @route   DELETE /api/trusted/partnerships/:id
// @access  Private
exports.deletePartnership = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid partnership id' });
    }

    const removed = await Partnership.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Partnership not found' });
    }

    // Emit real-time update with fresh list
    const io = req.app.get('io');
    const partnerships = await Partnership.find();
    io.to('trustedBy').emit('partnerships-updated', { success: true, data: partnerships });

    res.json({ success: true, message: 'Partnership deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add a new recognition with image upload
// @route   POST /api/trusted/recognitions
// @access  Private
exports.addRecognition = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a name' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const imageUrl = `/uploads/recognitions/${req.file.filename}`;

    const newRecognition = new Recognition({ name, imageUrl });
    await newRecognition.save();

    // Emit real-time update
    const io = req.app.get('io');
    const recognitions = await Recognition.find();
    io.to('trustedBy').emit('recognitions-updated', { success: true, data: recognitions });
    
    res.status(201).json({ success: true, data: newRecognition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a recognition (image optional)
// @route   PUT /api/trusted/recognitions/:id
// @access  Private
exports.updateRecognition = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid recognition id' });
    }

    const updates = {};
    if (typeof req.body.name !== 'undefined') updates.name = req.body.name;
    if (req.file) updates.imageUrl = `/uploads/recognitions/${req.file.filename}`;

    const updated = await Recognition.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Recognition not found' });
    }

    // Emit real-time update with fresh list
    const io = req.app.get('io');
    const recognitions = await Recognition.find();
    io.to('trustedBy').emit('recognitions-updated', { success: true, data: recognitions });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a recognition
// @route   DELETE /api/trusted/recognitions/:id
// @access  Private
exports.deleteRecognition = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid recognition id' });
    }

    const removed = await Recognition.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Recognition not found' });
    }

    // Emit real-time update with fresh list
    const io = req.app.get('io');
    const recognitions = await Recognition.find();
    io.to('trustedBy').emit('recognitions-updated', { success: true, data: recognitions });

    res.json({ success: true, message: 'Recognition deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};