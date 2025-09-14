// models/team.js

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide name'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Please provide role'],
    trim: true
  },
  bio: {
    type: String,
    required: [true, 'Please provide bio'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide description'],
    trim: true
  },
  specialised: [{
    type: String,
    trim: true
  }],
  // Support for multiple images (profile, action shots, etc.)
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
  // Primary image URL for backward compatibility
  imageUrl: {
    type: String,
    required: [true, 'Please provide image URL']
  },
  // Contact information
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  linkedin: {
    type: String,
    trim: true
  },
  twitter: {
    type: String,
    trim: true
  },
  github: {
    type: String,
    trim: true
  },
  // Professional details
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  location: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  // Additional details
  achievements: [{
    type: String,
    trim: true
  }],
  education: [{
    degree: String,
    institution: String,
    year: String
  }],
  certifications: [{
    type: String,
    trim: true
  }],
  languages: [{
    type: String,
    trim: true
  }],
  hobbies: [{
    type: String,
    trim: true
  }],
  // Status and metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'alumni'],
    default: 'active'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  joinDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ name: 1 });
teamSchema.index({ role: 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ displayOrder: 1 });
teamSchema.index({ featured: 1 });

// Middleware to set primary image URL from images array
teamSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    const primaryImage = this.images.find(img => img.isPrimary) || this.images[0];
    this.imageUrl = primaryImage.url;
  }
  next();
});

// Virtual for full name formatting
teamSchema.virtual('displayName').get(function() {
  return this.name;
});

// Method to get years of experience
teamSchema.methods.getYearsOfExperience = function() {
  return this.experience || 0;
};

module.exports = mongoose.model('Team', teamSchema);
