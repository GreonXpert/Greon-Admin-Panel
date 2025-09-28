// models/Career.js - Career Model for Job Postings

const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  jobRole: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  shortDescription: {
    type: String,
    required: true,
    maxLength: 300
  },
  jobDescription: {
    type: String,
    required: true,
    maxLength: 2000
  },
  responsibilities: [{
    type: String,
    required: true,
    maxLength: 500
  }],
  requirements: [{
    type: String,
    maxLength: 500
  }],
  experienceRequired: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  jobType: {
    type: String,
    required: true,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
    default: 'Full-time'
  },
  joiningTime: {
    type: String,
    required: true,
    trim: true
  },
  skills: [{
    type: String,
    required: true,
    maxLength: 100
  }],
  image: {
    type: String,
    required: true
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  },
  benefits: [{
    type: String,
    maxLength: 200
  }],
  department: {
    type: String,
    required: true,
    enum: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product', 'Design'],
    default: 'Engineering'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'closed', 'draft'],
    default: 'active',
    index: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
  },
  // SEO and Meta
  metaTitle: String,
  metaDescription: String,
  slug: { 
    type: String, 
    unique: true, 
    index: true 
  },
  // Analytics
  analytics: {
    type: {
      impressions: { type: Number, default: 0, min: 0 },
      clicks: { type: Number, default: 0, min: 0 },
      applications: { type: Number, default: 0, min: 0 },
      conversions: { type: Number, default: 0, min: 0 }
    },
    default: () => ({
      impressions: 0,
      clicks: 0,
      applications: 0,
      conversions: 0
    })
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
careerSchema.index({ status: 1, featured: 1 });
careerSchema.index({ department: 1, status: 1 });
careerSchema.index({ createdAt: -1 });
careerSchema.index({ expiresAt: 1 });
careerSchema.index({ 'analytics.impressions': -1 });

// Virtuals
careerSchema.virtual('formattedSalary').get(function() {
  if (this.salaryRange.min && this.salaryRange.max) {
    return `${this.salaryRange.currency} ${this.salaryRange.min.toLocaleString()} - ${this.salaryRange.max.toLocaleString()}`;
  }
  return 'Competitive';
});

careerSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

careerSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Pre-save middleware
careerSchema.pre('save', function(next) {
  if (this.isModified('jobRole')) {
    this.slug = this.jobRole
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }

  // Ensure analytics is always an object
  if (!this.analytics || typeof this.analytics !== 'object' || Array.isArray(this.analytics)) {
    this.analytics = {
      impressions: 0,
      clicks: 0,
      applications: 0,
      conversions: 0
    };
  }
  
  next();
});

// Static methods
careerSchema.statics.getActiveJobs = function() {
  return this.find({ 
    status: 'active', 
    expiresAt: { $gt: new Date() } 
  }).sort({ featured: -1, createdAt: -1 });
};

careerSchema.statics.getFeaturedJobs = function() {
  return this.find({ 
    status: 'active', 
    featured: true,
    expiresAt: { $gt: new Date() } 
  }).sort({ createdAt: -1 }).limit(6);
};

careerSchema.statics.getJobsByDepartment = function(department) {
  const filter = { 
    status: 'active', 
    expiresAt: { $gt: new Date() } 
  };
  
  if (department && department !== 'all') {
    filter.department = department;
  }
  
  return this.find(filter).sort({ featured: -1, createdAt: -1 });
};

// Instance methods
careerSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  this.analytics.impressions += 1;
  return this.save();
};

careerSchema.methods.incrementApplications = function() {
  this.applicationCount += 1;
  this.analytics.applications += 1;
  return this.save();
};

careerSchema.methods.incrementClicks = function() {
  this.analytics.clicks += 1;
  return this.save();
};

module.exports = mongoose.model('Career', careerSchema);
