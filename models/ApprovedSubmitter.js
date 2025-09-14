// models/ApprovedSubmitter.js - NEW MODEL FOR SAVING APPROVED SUBMITTER EMAILS
const mongoose = require('mongoose');

const approvedSubmitterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  approvedStories: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Story'
  }],
  totalApprovals: {
    type: Number,
    default: 0
  },
  firstApprovalDate: {
    type: Date,
    required: true
  },
  lastApprovalDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxLength: 500
  }
}, {
  timestamps: true
});

// Indexes for performance
approvedSubmitterSchema.index({ email: 1 });
approvedSubmitterSchema.index({ lastApprovalDate: -1 });

module.exports = mongoose.model('ApprovedSubmitter', approvedSubmitterSchema);
