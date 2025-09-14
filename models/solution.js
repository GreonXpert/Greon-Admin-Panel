// models/solution.js

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  }
});

const specSchema = new mongoose.Schema({
  k: String, // Key like "500+"
  v: String  // Value like "Projects"
});

const solutionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Please provide solution key'],
    unique: true,
    trim: true
  },
  kind: {
    type: String,
    enum: ['Service', 'Software', 'Hardware'],
    default: 'Software'
  },
  tag: {
    type: String,
    required: [true, 'Please provide tag'],
    trim: true
  },
  title: [{
    type: String,
    trim: true
  }],
  kicker: {
    type: String,
    trim: true
  },
  short: {
    type: String,
    required: [true, 'Please provide short description'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide detailed description'],
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  bgWord: {
    type: String,
    trim: true
  },
  primaryColor: {
    type: String,
    default: '#1AC99F'
  },
  secondaryColor: {
    type: String,
    default: '#E8F8F4'
  },
  images: [imageSchema],
  // For Hero slides
  bg: String, // Background image URL
  product: String, // Product image URL
  specs: [specSchema], // Specifications for hero slides
  // Metadata
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  order: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
solutionSchema.index({ key: 1 });
solutionSchema.index({ tag: 1 });
solutionSchema.index({ status: 1 });
solutionSchema.index({ order: 1 });
solutionSchema.index({ featured: 1 });

module.exports = mongoose.model('Solution', solutionSchema);
