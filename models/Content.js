// models/Content.js - Website Content Model
const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  // Section identifier
  section: {
    type: String,
    required: true,
    enum: ['hero', 'climateIntelligence', 'trustedLeaders', 'precisionInAction', 
           'regulatoryReporting', 'advisoryBoard', 'sustainabilityStories'],
    index: true
  },
  
  // Main content data (stored as JSON)
  content: {
    type: Object,
    required: true
  },
  
  // Status of the content
  isActive: {
    type: Boolean,
    default: true
  },
  
  // User references for tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true
});

// Ensure only one active version per section
ContentSchema.index({ section: 1, isActive: 1 }, { 
  unique: true,
  partialFilterExpression: { isActive: true }
});

module.exports = mongoose.model('Content', ContentSchema);