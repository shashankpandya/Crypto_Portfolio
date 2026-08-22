'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const priceCacheSchema = new mongoose.Schema(
  {
    // CoinGecko coin identifier, e.g. "bitcoin", "ethereum".
    coinId: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      lowercase: true,
    },

    symbol: {
      type:      String,
      default:   '',
      trim:      true,
      lowercase: true,
    },

    name: {
      type:    String,
      default: '',
      trim:    true,
    },

    image: {
      type:    String,
      default: '',
    },

    current_price: {
      type:    Number,
      default: 0,
    },

    market_cap: {
      type:    Number,
      default: 0,
    },

    market_cap_rank: {
      type:    Number,
      default: 0,
    },

    fully_diluted_valuation: {
      type:    Number,
      default: null,
    },

    total_volume: {
      type:    Number,
      default: 0,
    },

    high_24h: {
      type:    Number,
      default: 0,
    },

    low_24h: {
      type:    Number,
      default: 0,
    },

    price_change_24h: {
      type:    Number,
      default: 0,
    },

    price_change_percentage_24h: {
      type:    Number,
      default: 0,
    },

    price_change_percentage_1h_in_currency: {
      type:    Number,
      default: null,
    },

    price_change_percentage_24h_in_currency: {
      type:    Number,
      default: null,
    },

    price_change_percentage_7d_in_currency: {
      type:    Number,
      default: null,
    },

    market_cap_change_24h: {
      type:    Number,
      default: 0,
    },

    market_cap_change_percentage_24h: {
      type:    Number,
      default: 0,
    },

    circulating_supply: {
      type:    Number,
      default: 0,
    },

    total_supply: {
      type:    Number,
      default: null,
    },

    max_supply: {
      type:    Number,
      default: null,
    },

    ath: {
      type:    Number,
      default: 0,
    },

    ath_change_percentage: {
      type:    Number,
      default: 0,
    },

    ath_date: {
      type:    String,
      default: '',
    },

    atl: {
      type:    Number,
      default: 0,
    },

    atl_change_percentage: {
      type:    Number,
      default: 0,
    },

    atl_date: {
      type:    String,
      default: '',
    },

    last_updated: {
      type:    String,
      default: '',
    },

    // 7-day sparkline prices, shape { price: number[] } — CoinGecko's own
    // shape, stored as-is so the frontend's real-data sparkline (P1-14)
    // keeps working when served from this cache instead of direct CoinGecko.
    sparkline_in_7d: {
      type:    mongoose.Schema.Types.Mixed,
      default: null,
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
priceCacheSchema.index({ market_cap_rank: 1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
module.exports = mongoose.model('PriceCache', priceCacheSchema);
