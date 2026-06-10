'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const priceCacheSchema = new mongoose.Schema(
  {
    // CoinGecko coin identifier, e.g. "bitcoin", "ethereum".
    coinId: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase: true,
    },

    name: {
      type:    String,
      default: '',
      trim:    true,
    },

    symbol: {
      type:    String,
      default: '',
      trim:    true,
      lowercase: true,
    },

    price: {
      type:    Number,
      default: 0,
    },

    marketCap: {
      type:    Number,
      default: 0,
    },

    volume24h: {
      type:    Number,
      default: 0,
    },

    // Explicitly managed so the TTL index has a concrete field to target.
    updatedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    // Disable Mongoose auto-timestamps so we fully control updatedAt ourselves.
    timestamps: false,
    versionKey: false,
  },
);

// ---------------------------------------------------------------------------
// TTL index: MongoDB will automatically delete documents 300 seconds
// (5 minutes) after the value stored in `updatedAt`.
// ---------------------------------------------------------------------------
priceCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 300 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
module.exports = mongoose.model('PriceCache', priceCacheSchema);
