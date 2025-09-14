// models/contactForm.js
const mongoose = require('mongoose');

const contactFormSchema = new mongoose.Schema({
  // Contact Details
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  
  // Message Details
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  
  // Inquiry Type
  inquiryType: {
    type: String,
    enum: ['general', 'sales', 'support', 'partnership', 'career', 'other'],
    default: 'general'
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['open', 'in_progress', 'deal_signed', 'rejected', 'not_applicable', 'closed'],
    default: 'open'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Tracking Information
  source: {
    type: String,
    enum: ['website', 'mobile_app', 'social_media', 'referral', 'event', 'other'],
    default: 'website'
  },
  
  ipAddress: {
    type: String,
    trim: true
  },
  
  userAgent: {
    type: String,
    trim: true
  },
  
  // Assignment and Management
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  assignedDate: {
    type: Date
  },
  
  // Communication History
  responses: [{
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    response: {
      type: String,
      required: true,
      maxlength: [2000, 'Response cannot exceed 2000 characters']
    },
    responseDate: {
      type: Date,
      default: Date.now
    },
    responseType: {
      type: String,
      enum: ['email', 'phone', 'meeting', 'internal_note'],
      default: 'internal_note'
    }
  }],
  
  // Status History
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedDate: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  
  // Additional Information
  tags: [{
    type: String,
    trim: true
  }],
  
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Follow-up
  followUpDate: {
    type: Date
  },
  
  estimatedValue: {
    type: Number,
    min: 0
  },
  
  // Email Notifications
  emailSent: {
    type: Boolean,
    default: false
  },
  
  emailSentDate: {
    type: Date
  },
  
  // Metadata
  isRead: {
    type: Boolean,
    default: false
  },
  
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
contactFormSchema.index({ email: 1 });
contactFormSchema.index({ status: 1 });
contactFormSchema.index({ priority: 1 });
contactFormSchema.index({ assignedTo: 1 });
contactFormSchema.index({ createdAt: -1 });
contactFormSchema.index({ isRead: 1 });
contactFormSchema.index({ isArchived: 1 });

// Middleware to add status history
contactFormSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedDate: new Date()
    });
  }
  next();
});

// Virtual for response count
contactFormSchema.virtual('responseCount').get(function() {
  return this.responses ? this.responses.length : 0;
});

// Method to mark as read
contactFormSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId });
    this.isRead = true;
  }
};

module.exports = mongoose.model('ContactForm', contactFormSchema);
