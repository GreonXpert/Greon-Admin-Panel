// models/Story.js - COMPLETE FIXED VERSION
const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
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
    enum: ['Blog', 'Video', 'Resources'],
    index: true
  },
  image: {
    type: String,
    required: true
  },
  // Blog specific fields
  author: {
    type: String,
    required: function() { return this.category === 'Blog'; }
  },
  authorImage: {
    type: String,
    required: function() { return this.category === 'Blog'; }
  },
  readTime: {
    type: String,
    required: function() { return this.category === 'Blog'; }
  },
  // Video specific fields
  duration: {
    type: String,
    required: function() { return this.category === 'Video'; }
  },
  views: {
    type: String,
    default: '0'
  },
  speakers: [{ type: String }],
  videoUrl: {
    type: String,
    required: function() { return this.category === 'Video'; }
  },
  // Resource specific fields
  downloadCount: {
    type: String,
    default: '0'
  },
  fileSize: {
    type: String,
    required: function() { return this.category === 'Resources'; }
  },
  fileType: {
    type: String,
    required: function() { return this.category === 'Resources'; },
    enum: ['PDF', 'Excel', 'Word', 'PowerPoint']
  },
  pages: {
    type: Number,
    required: function() { return this.category === 'Resources' && this.fileType === 'PDF'; }
  },
  includes: [{ type: String }],
  filePath: {
    type: String,
    required: function() { return this.category === 'Resources'; }
  },
  // Common fields
  date: {
    type: Date,
    default: Date.now
  },
  tags: [{ type: String, maxLength: 50 }],
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  link: {
    type: String,
    required: true,
    unique: true
  },
  // Engagement metrics
  likes: {
    type: Number,
    default: 0
  },
  comments: [{
    user: { type: String, required: true },
    message: { type: String, required: true, maxLength: 1000 },
    date: { type: Date, default: Date.now }
  }],
  // SEO and Meta
  metaTitle: String,
  metaDescription: String,
  slug: { type: String, unique: true, index: true },
  // Publishing
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  publishedAt: { type: Date, default: Date.now },
  // 🛠️ FIXED: Analytics with proper defaults and validation
  analytics: {
    type: {
      impressions: { type: Number, default: 0, min: 0 },
      clicks: { type: Number, default: 0, min: 0 },
      shares: { type: Number, default: 0, min: 0 },
      engagementRate: { type: Number, default: 0, min: 0 }
    },
    default: () => ({
      impressions: 0,
      clicks: 0,
      shares: 0,
      engagementRate: 0
    })
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
storySchema.index({ category: 1, featured: 1 });
storySchema.index({ tags: 1 });
storySchema.index({ createdAt: -1 });
storySchema.index({ 'analytics.impressions': -1 });

// Virtuals
storySchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

storySchema.virtual('downloadUrl').get(function() {
  return this.filePath || '';
});

storySchema.virtual('downloadFileName').get(function() {
  if (!this.filePath) return '';
  const extension = this.filePath.substring(this.filePath.lastIndexOf('.'));
  const sanitizedTitle = this.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  return `${sanitizedTitle}${extension}`;
});

// Pre-save middleware
storySchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }
  
  // 🛠️ FIXED: Ensure analytics is always an object
  if (!this.analytics || typeof this.analytics !== 'object' || Array.isArray(this.analytics)) {
    this.analytics = {
      impressions: 0,
      clicks: 0,
      shares: 0,
      engagementRate: 0
    };
  }
  
  next();
});

// 🛠️ FIXED: Helper function to ensure valid number
function ensureNumber(value, defaultValue = 0) {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return Math.max(0, value); // Ensure non-negative
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
  }
  return defaultValue;
}

// 🛠️ FIXED: Helper function to ensure analytics object
function ensureAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return {
      impressions: 0,
      clicks: 0,
      shares: 0,
      engagementRate: 0
    };
  }
  
  return {
    impressions: ensureNumber(analytics.impressions, 0),
    clicks: ensureNumber(analytics.clicks, 0),
    shares: ensureNumber(analytics.shares, 0),
    engagementRate: ensureNumber(analytics.engagementRate, 0)
  };
}

// Static methods
storySchema.statics.getFeatured = function() {
  return this.find({ featured: true, status: 'published' })
    .sort({ createdAt: -1 })
    .limit(6);
};

storySchema.statics.getByCategory = function(category) {
  const filter = { status: 'published' };
  if (category && category !== 'all') {
    filter.category = category;
  }
  return this.find(filter).sort({ createdAt: -1 });
};

storySchema.statics.getTrending = function() {
  return this.find({ status: 'published' })
    .sort({ 'analytics.engagementRate': -1, 'analytics.impressions': -1 })
    .limit(10);
};

// 🛠️ FIXED: Instance methods with proper analytics handling
storySchema.methods.incrementViews = function() {
  if (this.category === 'Video') {
    // Fix analytics object if needed
    this.analytics = ensureAnalytics(this.analytics);
    
    // Safely parse and increment views
    const currentViews = ensureNumber(this.views, 0);
    this.views = `${(currentViews + 1).toLocaleString()}`;
    
    // Increment impressions
    this.analytics.impressions += 1;
    
    return this.save();
  }
};

storySchema.methods.incrementDownloads = function() {
  if (this.category === 'Resources') {
    // Fix analytics object if needed
    this.analytics = ensureAnalytics(this.analytics);
    
    // Safely parse and increment downloads
    const currentDownloads = ensureNumber(this.downloadCount, 0);
    this.downloadCount = `${(currentDownloads + 1).toLocaleString()}`;
    
    // Increment clicks
    this.analytics.clicks += 1;
    
    return this.save();
  }
};

storySchema.methods.incrementLikes = function() {
  const currentLikes = ensureNumber(this.likes, 0);
  this.likes = currentLikes + 1;
  
  // Fix analytics object if needed
  this.analytics = ensureAnalytics(this.analytics);
  this.analytics.engagementRate += 0.1;
  
  return this.save();
};

storySchema.methods.incrementShares = function() {
  // Fix analytics object if needed
  this.analytics = ensureAnalytics(this.analytics);
  this.analytics.shares += 1;
  this.analytics.engagementRate += 0.2;
  
  return this.save();
};

module.exports = mongoose.model('Story', storySchema);
