const mongoose = require('mongoose');

const AdvisoryMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, 'Please provide an image URL'],
  },
  expertise: {
    type: [String],
    required: [true, 'Please provide expertise areas'],
  },
  bio: {
    type: String,
    required: [true, 'Please provide a biography'],
  },
  icon: {
    type: String,
  },
  color: {
    type: String,
  },
  yearsExperience: {
    type: String,
    required: [true, 'Please provide years of experience'],
  },
  linkedinUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty values
        // Validate LinkedIn URL format
        return /^https:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9\-]+\/?$/.test(v);
      },
      message: 'Please provide a valid LinkedIn URL (e.g., https://linkedin.com/in/username)'
    }
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('AdvisoryMember', AdvisoryMemberSchema);
