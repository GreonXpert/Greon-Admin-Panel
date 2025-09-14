const mongoose = require('mongoose');

const PartnershipSchema = new mongoose.Schema({
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
}, {
  timestamps: true
});

module.exports = mongoose.model('Partnership', PartnershipSchema);