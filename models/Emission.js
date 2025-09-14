const mongoose = require('mongoose');

const EmissionSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    unique: true
  },
  scope1: {
    type: Number,
    required: true
  },
  scope2: {
    type: Number,
    required: true
  },
  scope3: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Emission', EmissionSchema);