'use strict';

// Load environment variables first — before any other import reads process.env.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app                    = require('./src/app');
const { connectDB, dbState } = require('./src/config/db');
const blockchainService      = require('./src/services/blockchainService');

const PORT = process.env.PORT || 5000;

async function start() {
  const dbConnected = await connectDB();

  if (dbConnected) {
    // Back-fill historical on-chain transactions (non-fatal).
    try {
      await blockchainService.syncHistoricalTransactions();
    } catch (err) {
      console.error('[Server] Historical sync failed (non-fatal):', err.message);
    }

    // Subscribe to live events (non-fatal).
    try {
      await blockchainService.startEventListener();
    } catch (err) {
      console.error('[Server] Event listener failed to start (non-fatal):', err.message);
    }
  } else {
    console.warn(
      '[Server] Starting WITHOUT database. ' +
      'All /api routes will return 503 until MongoDB becomes available.',
    );
  }

  app.locals.dbState = dbState;

  const server = app.listen(PORT, () => {
    const dbTag = dbConnected ? '' : ' [DB UNAVAILABLE — routes returning 503]';
    console.log(
      `[Server] Running in ${process.env.NODE_ENV || 'development'} mode ` +
      `on port ${PORT}${dbTag}`,
    );
  });

  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
    blockchainService.stopEventListener();
    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
          console.log('[Server] MongoDB connection closed.');
        }
      } catch (err) {
        console.error('[Server] Error closing MongoDB connection:', err.message);
      }
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
