const mongoose = require('mongoose');

const RecognitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Recognition', RecognitionSchema);