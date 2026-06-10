'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Sub-document schema for individual watchlist entries.
// ---------------------------------------------------------------------------
const coinEntrySchema = new mongoose.Schema(
  {
    coinId: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
    },

    addedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    // Sub-documents don't need their own _id or __v.
    _id:        false,
    versionKey: false,
  },
);

// ---------------------------------------------------------------------------
// Parent schema
// ---------------------------------------------------------------------------
const watchlistSchema = new mongoose.Schema(
  {
    // One watchlist document per wallet address.
    walletAddress: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      index:     true,
    },

    coins: {
      type:    [coinEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ---------------------------------------------------------------------------
// Instance helpers
// ---------------------------------------------------------------------------

// Add a coin only if it isn't already in the list.
watchlistSchema.methods.addCoin = function (coinId) {
  const id = coinId.toLowerCase().trim();
  const exists = this.coins.some((c) => c.coinId === id);
  if (!exists) {
    this.coins.push({ coinId: id, addedAt: new Date() });
  }
  return this.save();
};

// Remove a coin by its coinId.
watchlistSchema.methods.removeCoin = function (coinId) {
  const id = coinId.toLowerCase().trim();
  this.coins = this.coins.filter((c) => c.coinId !== id);
  return this.save();
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
module.exports = mongoose.model('Watchlist', watchlistSchema);
