// models/Content.js - Enhanced Website Content Model
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

// Additional index for better query performance
ContentSchema.index({ section: 1, createdAt: -1 });

// Pre-save middleware to ensure only one active record per section
ContentSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    // If creating a new active document, deactivate existing ones
    await this.constructor.updateMany(
      { 
        section: this.section, 
        isActive: true,
        _id: { $ne: this._id }
      },
      { isActive: false }
    );
  }
  next();
});

// Static method to get active content by section
ContentSchema.statics.getActiveBySection = function(section) {
  return this.findOne({ section, isActive: true }).select('-__v');
};

// Static method to ensure only one active content per section
ContentSchema.statics.ensureOneActive = async function(section, content, userId) {
  // First, deactivate any existing active content
  await this.updateMany(
    { section, isActive: true },
    { isActive: false }
  );
  
  // Then create new active content
  return this.create({
    section,
    content,
    isActive: true,
    createdBy: userId,
    updatedBy: userId
  });
};

// Instance method to get version number for this content
ContentSchema.methods.getVersionNumber = async function() {
  const count = await this.constructor.countDocuments({
    section: this.section,
    createdAt: { $lte: this.createdAt }
  });
  return count;
};

module.exports = mongoose.model('Content', ContentSchema);