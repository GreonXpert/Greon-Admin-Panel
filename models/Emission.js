// models/Emission.js - Greenhouse Gas Emissions Data Model
const mongoose = require('mongoose');

const EmissionSchema = new mongoose.Schema({
  // Year of the emissions data (required and unique)
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be at least 1900'],
    max: [2100, 'Year must be at most 2100'],
    unique: true,
    index: true,
  },
  
  // Main scope totals (automatically calculated from subcategories)
  scope1: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope2: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope3: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Optional target value for reduction goals
  target: {
    type: Number,
    min: 0,
    default: null,
  },
  
  // Scope 1 subcategories (direct emissions)
  scope1_naturalGasHeating: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope1_dieselGenerator: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope1_dieselFleet: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Scope 2 subcategories (electricity)
  scope2_nyGridElectricity: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope2_mfGridElectricity: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Scope 3 subcategories (other indirect)
  scope3_businessTravel: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope3_employeeCommuting: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope3_logistics: {
    type: Number,
    default: 0,
    min: 0,
  },
  scope3_waste: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  comments: {
    type: String,
    maxlength: [500, 'Comments cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to calculate scope totals from subcategories
EmissionSchema.pre('save', function(next) {
  // Calculate Scope 1 total
  this.scope1 = (
    (parseFloat(this.scope1_naturalGasHeating) || 0) +
    (parseFloat(this.scope1_dieselGenerator) || 0) +
    (parseFloat(this.scope1_dieselFleet) || 0)
  );
  
  // Calculate Scope 2 total
  this.scope2 = (
    (parseFloat(this.scope2_nyGridElectricity) || 0) +
    (parseFloat(this.scope2_mfGridElectricity) || 0)
  );
  
  // Calculate Scope 3 total
  this.scope3 = (
    (parseFloat(this.scope3_businessTravel) || 0) +
    (parseFloat(this.scope3_employeeCommuting) || 0) +
    (parseFloat(this.scope3_logistics) || 0) +
    (parseFloat(this.scope3_waste) || 0)
  );
  
  next();
});

// Virtual for total emissions (all scopes combined)
EmissionSchema.virtual('totalEmissions').get(function() {
  return (parseFloat(this.scope1) || 0) + 
         (parseFloat(this.scope2) || 0) + 
         (parseFloat(this.scope3) || 0);
});

module.exports = mongoose.model('Emission', EmissionSchema);