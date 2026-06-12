'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type:      String,
      required:  true,
      index:     true,
      trim:      true,
      lowercase: true,
    },

    recipient: {
      type:      String,
      required:  true,
      index:     true,
      trim:      true,
      lowercase: true,
    },

    // Stored as a String to safely handle BigInt / wei values without precision loss.
    amount: {
      type:     String,
      required: true,
    },

    message: {
      type:    String,
      default: '',
      trim:    true,
    },

    // Unix epoch seconds as returned by the smart contract.
    timestamp: {
      type:     Number,
      required: true,
      index:    true,
    },

    keyword: {
      type:    String,
      default: '',
      trim:    true,
    },

    // Ethereum transaction hash.  Sparse so documents without a hash
    // (e.g. synced from getAllTransactions()) are not rejected.
    txHash: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },

    blockNumber: {
      type: Number,
    },
  },
  {
    // Mongoose manages createdAt / updatedAt automatically.
    timestamps: true,
    // Lean-friendly: strip __v from query results.
    versionKey: false,
  },
);

// ---------------------------------------------------------------------------
// Compound index: look up all transactions for a sender, newest first.
// ---------------------------------------------------------------------------
transactionSchema.index({ sender: 1, timestamp: -1 });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
module.exports = mongoose.model('Transaction', transactionSchema);
