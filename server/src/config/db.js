'use strict';

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// connectDB
// Establishes a Mongoose connection to MongoDB using MONGO_URI from the
// environment.  Exits the process on failure so the server never starts
// in a broken state.
// ---------------------------------------------------------------------------
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI environment variable is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      // These options silence deprecation warnings in Mongoose 6+.
      // Mongoose 7+ ignores them gracefully, so they are safe to keep.
      serverSelectionTimeoutMS: 5_000, // fail fast if Atlas is unreachable
    });

    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);

    // Surface connection errors that occur after the initial connect.
    mongoose.connection.on('error', (err) => {
      console.error('[DB] Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected.');
    });
  } catch (err) {
    console.error('[DB] Initial connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
