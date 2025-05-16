// models/Page.js - Website Page Model
const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  metaDescription: {
    type: String,
    default: '',
  },
  sections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Component',
  }],
  isPublished: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
    default: null,
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

module.exports = mongoose.model('Page', PageSchema);
