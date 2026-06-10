'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const userSchema = new mongoose.Schema(
  {
    // Ethereum wallet address stored in lowercase for case-insensitive lookups.
    walletAddress: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      index:     true,
    },

    createdAt: {
      type:    Date,
      default: Date.now,
    },

    lastActive: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    // Disable Mongoose auto-timestamps; we manage createdAt / lastActive manually
    // so callers can update lastActive on every authenticated request.
    timestamps: false,
    versionKey: false,
  },
);

// ---------------------------------------------------------------------------
// Instance method: touch lastActive without a full document save.
// ---------------------------------------------------------------------------
userSchema.methods.touch = function () {
  this.lastActive = new Date();
  return this.save();
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
module.exports = mongoose.model('User', userSchema);
