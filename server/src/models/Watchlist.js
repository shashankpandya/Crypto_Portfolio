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
// Model
//
// No addCoin/removeCoin instance methods — watchlistRepo.js mutates coins
// via atomic findOneAndUpdate($push/$pull) instead of find-then-save, to
// avoid a lost-update race between concurrent writes to the same wallet's
// document.
// ---------------------------------------------------------------------------
module.exports = mongoose.model('Watchlist', watchlistSchema);
