// models/PendingSubmission.js - COMPLETELY FIXED SCHEMA

const mongoose = require('mongoose');

const pendingSubmissionSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    required: true,
    maxLength: 500
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Blog', 'Video', 'Resources']
  },

  // Submitter Info
  submitterName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  submitterEmail: {
    type: String,
    required: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  submitterOrganization: {
    type: String,
    trim: true,
    maxLength: 200
  },

  // Category-specific fields
  suggestedAuthor: String,
  estimatedReadTime: String,
  videoUrl: String,
  duration: String,
  speakers: [String],
  resourceType: {
    type: String,
    enum: ['PDF', 'Excel', 'Word', 'PowerPoint']
  },
  estimatedPages: Number,
  resourceIncludes: [String],

  // Common fields
  suggestedTags: [String],
  targetAudience: String,
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },

  // ✅ CRITICAL FIX: Proper file references structure
  files: {
    type: mongoose.Schema.Types.Mixed, // Allow flexible object structure
    default: {}
  },

  // ✅ CRITICAL FIX: Proper attachments array schema
  attachments: {
    type: [mongoose.Schema.Types.Mixed], // Array of flexible objects
    default: []
  },

  // Submission metadata
  submissionLink: {
    type: mongoose.Schema.ObjectId,
    ref: 'SubmissionLink',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_revision'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  revisionRequested: String,

  // Approval workflow
  approvalSteps: [{
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'revision_requested']
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Final story reference
  finalStory: {
    type: mongoose.Schema.ObjectId,
    ref: 'Story'
  },

  // Additional metadata
  ipAddress: String,
  userAgent: String,
  submissionCount: {
    type: Number,
    default: 1
  },
  submissionDate: Date,
  source: {
    type: String,
    default: 'external_submission_form'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Virtual for image URLs
pendingSubmissionSchema.virtual('imageUrls').get(function() {
  return {
    main: this.files?.image?.filename ?
      `/uploads/ExternalSubmissions/${this.category}/${this.files.image.filename}` : null,
    author: this.files?.authorImage?.filename ?
      `/uploads/ExternalSubmissions/Authors/${this.files.authorImage.filename}` : null,
    file: this.files?.file?.filename ?
      `/uploads/ExternalSubmissions/Files/${this.files.file.filename}` : null
  };
});

// ✅ Virtual for tracking reference
pendingSubmissionSchema.virtual('trackingReference').get(function() {
  return this._id.toString().slice(-8).toUpperCase();
});

// Indexes for performance
pendingSubmissionSchema.index({ status: 1, createdAt: -1 });
pendingSubmissionSchema.index({ submissionLink: 1 });
pendingSubmissionSchema.index({ submitterEmail: 1 });
pendingSubmissionSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('PendingSubmission', pendingSubmissionSchema);
