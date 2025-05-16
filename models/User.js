const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  role: {
    type: String,
    enum: ['admin', 'editor'],
    default: 'editor',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash if password field is being modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);