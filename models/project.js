// models/project.js

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: '' },
  },
  { _id: false }
);

const styleSchema = new mongoose.Schema(
  {
    // keep names aligned with your FE usage (style.color / style.accent)
    color: { type: String, default: '#1976D2' },     // primary
    accent: { type: String, default: '#1AC99F' },    // accent used for blobs/headers
    bg: { type: String, default: '#E3F2FD' },        // soft background token
    gradient: {
      from: { type: String, default: '#667eea' },
      to: { type: String, default: '#764ba2' },
      angle: { type: Number, default: 135 },
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    // Core identity
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Carbon Project', 'ESG Project', 'BRSR Project', 'Reduction Project', 'Other'],
      default: 'Other',
    },
    status: { type: String, enum: ['Planned', 'In Progress', 'Completed'], default: 'Planned' },

    // Meta shown in the right panel
    location: { type: String, trim: true },
    completedYear: { type: Number },
    area: { type: String, trim: true },
    client: { type: String, trim: true },
    architect: { type: String, trim: true },
    coordinates: {
      // [lng, lat] like your FE map
      type: [Number],
      validate: a => !a.length || a.length === 2,
      default: undefined,
    },

    // Narrative sections shown in the left scrollable panel
    about: { type: String, trim: true },
    description: { type: String, trim: true },

    // Media
    mainImage: { type: String, default: '' }, // single cover
    images: [imageSchema], // gallery

    // Styling pushed from backend
    style: styleSchema,

    // Admin / ordering
    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for common queries
projectSchema.index({ status: 1, order: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ title: 'text', description: 'text', about: 'text' });

module.exports = mongoose.model('Project', projectSchema);
