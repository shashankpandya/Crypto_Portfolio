'use strict';

const mongoose = require('mongoose');

const indexerStateSchema = new mongoose.Schema(
  {
    contractAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    lastIndexedBlock: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const IndexerState = mongoose.model('IndexerState', indexerStateSchema);

module.exports = IndexerState;
