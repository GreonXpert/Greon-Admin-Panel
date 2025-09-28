// models/Application.js - Job Application Model

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[+]?[0-9]{10,15}$/, 'Please enter a valid phone number']
  },
  
  // Professional Information
  position: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    type: String,
    required: true,
    trim: true
  },
  currentCompany: {
    type: String,
    trim: true
  },
  expectedSalary: {
    amount: { type: Number },
    currency: { type: String, default: 'INR' }
  },
  noticePeriod: {
    type: String,
    required: true,
    trim: true
  },
  
  // Location
  location: {
    current: { type: String, required: true, trim: true },
    preferred: { type: String, trim: true },
    willingToRelocate: { type: Boolean, default: false }
  },
  
  // Skills and Education
  skills: [{
    type: String,
    maxLength: 100
  }],
  education: {
    degree: { type: String, required: true, trim: true },
    field: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1950, max: 2030 }
  },
  
  // Additional Information
  coverLetter: {
    type: String,
    maxLength: 2000
  },
  portfolioUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Portfolio URL must be a valid URL'
    }
  },
  linkedinUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.*linkedin\.com\/.*/.test(v);
      },
      message: 'LinkedIn URL must be a valid LinkedIn profile URL'
    }
  },
  githubUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.*github\.com\/.*/.test(v);
      },
      message: 'GitHub URL must be a valid GitHub profile URL'
    }
  },
  
  // Files
  resume: {
    filename: String,
    path: String,
    originalName: String,
    mimetype: String,
    size: Number
  },
  additionalDocuments: [{
    filename: String,
    path: String,
    originalName: String,
    mimetype: String,
    size: Number,
    description: String
  }],
  
  // Job Reference
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Career',
    required: true
  },
  jobRole: {
    type: String,
    required: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn'],
    default: 'pending',
    index: true
  },
  
  // Application Flow
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  interviewDate: Date,
  
  // Internal Notes (for HR/Admin)
  internalNotes: [{
    note: { type: String, maxLength: 1000 },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
    type: { 
      type: String, 
      enum: ['general', 'interview', 'review', 'decision'], 
      default: 'general' 
    }
  }],
  
  // Ratings and Feedback
  rating: {
    technical: { type: Number, min: 1, max: 10 },
    communication: { type: Number, min: 1, max: 10 },
    cultural_fit: { type: Number, min: 1, max: 10 },
    overall: { type: Number, min: 1, max: 10 }
  },
  
  // Source tracking
  source: {
    type: String,
    enum: ['website', 'linkedin', 'referral', 'job_board', 'social_media', 'other'],
    default: 'website'
  },
  referredBy: String,
  
  // Privacy and Consent
  consentToDataProcessing: {
    type: Boolean,
    required: true,
    default: true
  },
  consentToMarketing: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
applicationSchema.index({ email: 1, jobId: 1 }, { unique: true }); // Prevent duplicate applications
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });

// Virtuals
applicationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

applicationSchema.virtual('daysSinceApplication').get(function() {
  const now = new Date();
  const applied = new Date(this.appliedAt);
  const diffTime = now - applied;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

applicationSchema.virtual('hasResume').get(function() {
  return !!(this.resume && this.resume.path);
});

// Pre-save middleware
applicationSchema.pre('save', function(next) {
  // Set reviewedAt when status changes from pending
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  
  next();
});

// Static methods
applicationSchema.statics.getApplicationsByJob = function(jobId, status = null) {
  const filter = { jobId };
  if (status) filter.status = status;
  
  return this.find(filter)
    .populate('jobId', 'jobRole department')
    .sort({ createdAt: -1 });
};

applicationSchema.statics.getApplicationsByStatus = function(status) {
  return this.find({ status })
    .populate('jobId', 'jobRole department location')
    .sort({ createdAt: -1 });
};

applicationSchema.statics.getRecentApplications = function(limit = 10) {
  return this.find()
    .populate('jobId', 'jobRole department')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance methods
applicationSchema.methods.updateStatus = function(newStatus, note = null, addedBy = 'System') {
  this.status = newStatus;
  
  if (note) {
    this.internalNotes.push({
      note,
      addedBy,
      type: 'general'
    });
  }
  
  return this.save();
};

applicationSchema.methods.addInternalNote = function(note, addedBy, type = 'general') {
  this.internalNotes.push({
    note,
    addedBy,
    type
  });
  
  return this.save();
};

applicationSchema.methods.setRating = function(ratings) {
  this.rating = { ...this.rating, ...ratings };
  
  // Calculate overall rating if individual ratings are provided
  if (ratings.technical || ratings.communication || ratings.cultural_fit) {
    const scores = [
      this.rating.technical || 0,
      this.rating.communication || 0,
      this.rating.cultural_fit || 0
    ].filter(score => score > 0);
    
    if (scores.length > 0) {
      this.rating.overall = Math.round(scores.reduce((a, b) => a + b) / scores.length);
    }
  }
  
  return this.save();
};

module.exports = mongoose.model('Application', applicationSchema);
