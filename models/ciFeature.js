// models/ClimateIntelligence/ciFeature.js
const mongoose = require('mongoose');

const CiFeatureSchema = new mongoose.Schema({
  icon: {
    type: String, // e.g. "DashboardIcon", "SettingsIcon", "TrendingUpIcon"
    default: 'DashboardIcon',
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  colorHex: {
    type: String, // e.g. "#1AC99F"
    trim: true,
    default: '#1AC99F',
  },
  shape: {
    type: String, // e.g. "Automate", "Decarbonize", "Disclose"
    trim: true,
  },
  benefits: {
    type: [String], // list of bullet points
    default: [],
  },
  imageUrl: {
    type: String, // e.g. "/uploads/ClimateIntelligence/<filename>"
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CiFeature', CiFeatureSchema);
