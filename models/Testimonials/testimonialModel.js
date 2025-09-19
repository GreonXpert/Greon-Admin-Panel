// models/testimonialModel.js
const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Testimonial requires a name'],
      trim: true,
    },
    position: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Please include testimonial content'],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    // Prefer this if present
    photoUrl: {
      type: String,
      default: '', // e.g. /uploads/testimonials/...
    },
    // Fallback (URL to avatar image or remote path)
    avatar: {
      type: String,
      default: '',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
  
    // Optional metadata
    source: { type: String, default: 'manual' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      shareOnGoogle: {
      type: Boolean,
      default: false,
    },
  },
  
  { timestamps: true }
);

// Virtual used by clients if they want a single image source
TestimonialSchema.virtual('displayImage').get(function () {
  return this.photoUrl && this.photoUrl.length > 0 ? this.photoUrl : this.avatar;
});

TestimonialSchema.index({ createdAt: -1 });
TestimonialSchema.index({
  name: 'text',
  company: 'text',
  position: 'text',
  content: 'text',
});

module.exports = mongoose.model('Testimonial', TestimonialSchema);
