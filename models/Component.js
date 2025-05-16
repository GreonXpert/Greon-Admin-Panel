// models/Component.js - Website Component Model
const mongoose = require('mongoose');

const ComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['hero', 'features', 'testimonials', 'contact', 'about', 'services', 'gallery', 'custom'],
  },
  content: {
    type: Object,
    default: {},
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Component', ComponentSchema);
