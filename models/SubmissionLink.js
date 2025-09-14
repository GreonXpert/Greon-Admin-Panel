// models/SubmissionLink.js - FIXED VERSION
const mongoose = require('mongoose');
const crypto = require('crypto');

const submissionLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    maxLength: 500
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  allowedCategories: [{
    type: String,
    enum: ['Blog', 'Video', 'Resources'],
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  maxSubmissions: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  currentSubmissions: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  submissions: [{
    type: mongoose.Schema.ObjectId,
    ref: 'PendingSubmission'
  }],
  usageLog: [{
    ip: String,
    userAgent: String,
    accessedAt: { type: Date, default: Date.now },
    success: Boolean
  }]
}, {
  timestamps: true
});

// ✅ FIX: Generate unique token and password BEFORE validation
submissionLinkSchema.pre('validate', function(next) {
  // Generate token if not present
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  
  // Generate 4-digit password if not present
  if (!this.password) {
    this.password = Math.floor(1000 + Math.random() * 9000).toString();
  }
  
  next();
});

// Instance methods
submissionLinkSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

submissionLinkSchema.methods.hasReachedLimit = function() {
  return this.currentSubmissions >= this.maxSubmissions;
};

// Add index for performance
submissionLinkSchema.index({ token: 1 });
submissionLinkSchema.index({ createdBy: 1 });
submissionLinkSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('SubmissionLink', submissionLinkSchema);
