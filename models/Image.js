// models/Image.js - Image Management Model
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  // Original filename
  originalName: {
    type: String,
    required: true
  },
  
  // Unique filename stored on server
  filename: {
    type: String,
    required: true,
    unique: true
  },
  
  // Image category/type
  category: {
    type: String,
    required: true,
    enum: ['hero', 'partners', 'advisors', 'stories', 'logo', 'icons', 'general'],
    default: 'general'
  },
  
  // Purpose/usage of the image
  purpose: {
    type: String,
    required: true,
    enum: [
      'partner_logo', 'advisor_photo', 'story_image', 'hero_background',
      'company_logo', 'section_icon', 'general_image', 'award_logo',
      'recognition_logo', 'feature_icon'
    ]
  },
  
  // Associated content/entity ID (optional)
  entityId: {
    type: String,
    required: false
  },
  
  // File details
  mimetype: {
    type: String,
    required: true
  },
  
  size: {
    type: Number,
    required: true
  },
  
  // Alt text for accessibility
  altText: {
    type: String,
    default: ''
  },
  
  // Description/notes
  description: {
    type: String,
    default: ''
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // User references
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // URL path for access
  url: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
ImageSchema.index({ category: 1, purpose: 1 });
ImageSchema.index({ isActive: 1 });
ImageSchema.index({ uploadedBy: 1 });

// Virtual for full URL
ImageSchema.virtual('fullUrl').get(function() {
  return `${process.env.BASE_URL || 'http://localhost:5000'}${this.url}`;
});

// Ensure virtual fields are included in JSON
ImageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Image', ImageSchema);