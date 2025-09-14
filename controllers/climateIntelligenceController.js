// controllers/ClimateIntelligence/ciController.js
const mongoose = require('mongoose');
const CiFeature = require('../models/ciFeature');

// Normalize benefits from various inputs into an array of strings
function normalizeBenefits(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean).map(String);

  // Try JSON array string
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch (_) {}

  // Fallback: split by newline or comma
  return String(input)
    .split(/\r?\n|,/)
    .map(s => s.trim())
    .filter(Boolean);
}

// @desc    Get all Climate Intelligence features
// @route   GET /api/ci/features
// @access  Public
exports.getFeatures = async (_req, res) => {
  try {
    const features = await CiFeature.find().sort({ createdAt: 1 });
    return res.json({ success: true, data: features });
  } catch (error) {
    console.error('getFeatures error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add a Climate Intelligence feature (image required)
// @route   POST /api/ci/features
// @access  Private
exports.addFeature = async (req, res) => {
  try {
    const { icon, title, description } = req.body;
    const benefits = normalizeBenefits(req.body.benefits);

    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide title and description' });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'Please upload an image' });
    }

    const imageUrl = `/uploads/ClimateIntelligence/${req.file.filename}`;

    // colorHex and shape are OPTIONAL now; include only if provided
    const doc = {
      icon,
      title,
      description,
      benefits,
      imageUrl
    };
    if (typeof req.body.colorHex !== 'undefined') doc.colorHex = req.body.colorHex;
    if (typeof req.body.shape !== 'undefined') doc.shape = req.body.shape;

    const feature = new CiFeature(doc);
    await feature.save();

    // Emit fresh list
    const io = req.app.get('io');
    const features = await CiFeature.find().sort({ createdAt: 1 });
    io.to('climateIntelligence').emit('ci-features-updated', { success: true, data: features });

    return res.status(201).json({ success: true, data: feature });
  } catch (error) {
    console.error('addFeature error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a Climate Intelligence feature (image optional)
// @route   PUT /api/ci/features/:id
// @access  Private
exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid feature id' });
    }

    const updates = {};
    // Always optional fields
    ['icon', 'title', 'description', 'colorHex', 'shape'].forEach((k) => {
      if (typeof req.body[k] !== 'undefined') updates[k] = req.body[k];
    });

    if (typeof req.body.benefits !== 'undefined') {
      updates.benefits = normalizeBenefits(req.body.benefits);
    }

    if (req.file) {
      updates.imageUrl = `/uploads/ClimateIntelligence/${req.file.filename}`;
    }

    const updated = await CiFeature.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Feature not found' });
    }

    // Emit fresh list
    const io = req.app.get('io');
    const features = await CiFeature.find().sort({ createdAt: 1 });
    io.to('climateIntelligence').emit('ci-features-updated', { success: true, data: features });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateFeature error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a Climate Intelligence feature
// @route   DELETE /api/ci/features/:id
// @access  Private
exports.deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid feature id' });
    }

    const removed = await CiFeature.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Feature not found' });
    }

    // Emit fresh list
    const io = req.app.get('io');
    const features = await CiFeature.find().sort({ createdAt: 1 });
    io.to('climateIntelligence').emit('ci-features-updated', { success: true, data: features });

    return res.json({ success: true, message: 'Feature deleted' });
  } catch (error) {
    console.error('deleteFeature error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
