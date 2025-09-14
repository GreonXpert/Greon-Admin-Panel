// models/journey.js

const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  year: {
    type: String,
    required: [true, 'Please provide year'],
    // ✅ REMOVED: unique: true - Now allows multiple entries with same year
  },
  title: {
    type: String,
    required: [true, 'Please provide title'],
    trim: true
  },
  subtitle: {
    type: String,
    required: [true, 'Please provide subtitle'],
    trim: true
  },
  bio: {
    type: String,
    required: [true, 'Please provide bio'],
    trim: true
  },
  summary: {
    type: String,
    required: [true, 'Please provide summary'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide description'],
    trim: true
  },
  achievements: [{
    type: String,
    trim: true
  }],
  highlights: [{
    type: String,
    trim: true
  }],
  // Support for up to 4 main images
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  // ✅ NEW: Support for logo images (up to 10 logos)
  logoImages: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    },
    altText: {
      type: String,
      default: ''
    }
  }],
  // Primary image URL for backward compatibility
  imageUrl: {
    type: String,
    required: [true, 'Please provide image URL']
  },
  color: {
    type: String,
    required: [true, 'Please provide color'],
    match: [/^#([0-9A-F]{3}){1,2}$/i, 'Please provide valid hex color']
  },
  secondaryColor: {
    type: String,
    required: [true, 'Please provide secondary color'],
    match: [/^#([0-9A-F]{3}){1,2}$/i, 'Please provide valid hex color']
  },
  icon: {
    type: String,
    required: [true, 'Please provide icon name'],
    trim: true
  },
  side: {
    type: String,
    enum: ['left', 'right'],
    required: [true, 'Please provide side (left or right)']
  },
  // Optional additional data arrays
  badges: [{
    type: String,
    trim: true
  }],
  partners: [{
    type: String,
    trim: true
  }],
  platforms: [{
    type: String,
    trim: true
  }],
  products: [{
    type: String,
    trim: true
  }],
  sectors: [{
    type: String,
    trim: true
  }],
  logos: [{
    type: String,
    trim: true
  }],
  // Status and metadata
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
journeySchema.index({ year: 1 }); // ✅ CHANGED: Regular index instead of unique
journeySchema.index({ status: 1 });
journeySchema.index({ displayOrder: 1 });

// Middleware to set primary image URL from images array
journeySchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    const primaryImage = this.images.find(img => img.isPrimary) || this.images[0];
    this.imageUrl = primaryImage.url;
  }
  next();
});

module.exports = mongoose.model('Journey', journeySchema);
