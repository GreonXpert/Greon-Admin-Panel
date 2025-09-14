const mongoose = require('mongoose');

const PbsFrameworkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'PbsCategory',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PbsFramework', PbsFrameworkSchema);