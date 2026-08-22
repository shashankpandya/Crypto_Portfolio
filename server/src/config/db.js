'use strict';

const dns      = require('dns');
const mongoose = require('mongoose');
const logger   = require('../lib/logger');

// ---------------------------------------------------------------------------
// DNS resolver override
// Node.js inherits its DNS servers from Windows, which on some networks
// (campus Wi-Fi, phone hotspots with strict NAT) refuses port 53 connections
// from userspace processes.  Forcing Google's public resolvers (8.8.8.8 /
// 8.8.4.4) bypasses the system resolver entirely and fixes the
// "querySrv ECONNREFUSED" error that occurs before any TCP connection to
// MongoDB is even attempted.
// ---------------------------------------------------------------------------
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
logger.info({ dnsServers: dns.getServers() }, '[DB] DNS resolvers set');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const MAX_RETRIES    = 5;
const RETRY_DELAY_MS = 5_000;

// ---------------------------------------------------------------------------
// dbState
// Exported so index.js can pass it to app.locals, and the 503 middleware
// in app.js can read it on every request without a circular require.
// ---------------------------------------------------------------------------
const dbState = {
  connected: false,
};

// ---------------------------------------------------------------------------
// sleep - simple promise-based delay.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// connectDB
// Attempts to connect to MongoDB up to MAX_RETRIES times, waiting
// RETRY_DELAY_MS between each attempt.
//
// Key design decisions:
//   - Never calls process.exit() - the caller decides what to do on failure.
//   - Returns true on success, false when all retries are exhausted.
//   - Registers runtime event listeners only once, after the first success.
//
// @returns {Promise<boolean>}
// ---------------------------------------------------------------------------
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error('[DB] MONGO_URI environment variable is not set.');
    return false;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info({ attempt, maxRetries: MAX_RETRIES }, `[DB] Connection attempt ${attempt}/${MAX_RETRIES}...`);

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5_000, // per-attempt timeout
        family: 4,                       // force IPv4
      });

      dbState.connected = true;
      logger.info({ host: mongoose.connection.host }, `[DB] MongoDB connected: ${mongoose.connection.host}`);

      // Register runtime listeners once - after the first successful connect.
      mongoose.connection.on('error', (err) => {
        logger.error({ err }, `[DB] Mongoose connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        dbState.connected = false;
        logger.warn('[DB] MongoDB disconnected. API routes will return 503.');
      });

      mongoose.connection.on('reconnected', () => {
        dbState.connected = true;
        logger.info('[DB] MongoDB reconnected. API routes restored.');
      });

      return true;
    } catch (err) {
      logger.error({ err, attempt, maxRetries: MAX_RETRIES }, `[DB] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        logger.info({ retryInSeconds: RETRY_DELAY_MS / 1000 }, `[DB] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  logger.error(`[DB] All ${MAX_RETRIES} connection attempts failed. Server will start without DB.`);
  return false;
}

module.exports = { connectDB, dbState };
