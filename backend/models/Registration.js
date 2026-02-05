const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participantName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'confirmed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'free'],
    default: 'pending'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentScreenshot: {
    type: String
  },
  transactionId: {
    type: String
  },
  isTeam: {
    type: Boolean,
    default: false
  },
  teamName: {
    type: String
  },
  teamLeader: {
    name: String,
    email: String,
    phone: String
  },
  teamMembers: [{
    name: String,
    email: String,
    phone: String
  }],
  customFieldResponses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkInTime: {
    type: Date
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
registrationSchema.index({ event: 1, user: 1 });
registrationSchema.index({ ticketId: 1 });
registrationSchema.index({ status: 1 });

// Generate unique ticket ID
registrationSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketId) {
    this.ticketId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Registration', registrationSchema);
