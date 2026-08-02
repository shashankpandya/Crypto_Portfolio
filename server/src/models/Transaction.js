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

    // Ethereum transaction hash.  Part of the compound dedupe key with logIndex.
    // Not declared unique here — the compound index below handles uniqueness.
    txHash: {
      type:  String,
      trim:  true,
    },

    // Position of this event within the transaction's event log.
    // Combined with txHash this uniquely identifies one event in a batch tx.
    // Null for records synced from getAllTransactions() which lack event metadata.
    logIndex: {
      type:    Number,
      default: null,
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
// Compound dedupe key: (txHash, logIndex) is unique per on-chain event.
// Sparse so documents where both are null (historical getAllTransactions syncs)
// are not rejected by the constraint.
// Replaces the old single-field unique txHash index which collapsed all events
// in a batch transaction (same txHash, different logIndex) into one document.
// ---------------------------------------------------------------------------
transactionSchema.index(
  { txHash: 1, logIndex: 1 },
  { unique: true, sparse: true, name: 'txHash_logIndex_unique' },
);

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
module.exports = mongoose.model('Transaction', transactionSchema);
