const mongoose = require('mongoose');

const ProductIconSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxLength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxLength: [500, 'Product description cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Product image is required']
  }
}, {
  timestamps: true
});

// Index for better performance
ProductIconSchema.index({ createdAt: -1 });

// Virtual for full image URL
ProductIconSchema.virtual('fullImageUrl').get(function() {
  return this.imageUrl.startsWith('http') ? this.imageUrl : `/uploads/productIcons/${this.imageUrl}`;
});

// Ensure virtual fields are serialized
ProductIconSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ProductIcon', ProductIconSchema);
