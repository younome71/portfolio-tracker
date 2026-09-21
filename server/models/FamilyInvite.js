const mongoose = require('mongoose');

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const FamilyInviteSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + INVITE_TTL_MS),
  },
});

// One pending invite per (from, to) pair
FamilyInviteSchema.index(
  { from: 1, to: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

FamilyInviteSchema.methods.isExpired = function isExpired() {
  return this.expiresAt && this.expiresAt.getTime() <= Date.now();
};

module.exports = mongoose.model('FamilyInvite', FamilyInviteSchema);
