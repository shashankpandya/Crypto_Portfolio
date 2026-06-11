'use strict';

// Load environment variables first — before any other import reads process.env.
require('dotenv').config();

const app                    = require('./src/app');
const { connectDB, dbState } = require('./src/config/db');
const blockchainService      = require('./src/services/blockchainService');

const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// start
// Orchestrates the full startup sequence. The Express server ALWAYS starts,
// even if MongoDB or the blockchain service are unavailable.
//
//   1. Attempt MongoDB connection (retries internally, never throws)
//   2. If DB connected: sync historical transactions + start event listener
//   3. Attach dbState to app.locals so the 503 middleware can read it
//   4. Start the HTTP server
// ---------------------------------------------------------------------------
async function start() {
  // 1. MongoDB — connectDB retries up to 5 times and returns a boolean.
  //    It never throws, so no try/catch is needed here.
  const dbConnected = await connectDB();

  if (dbConnected) {
    // 2a. Back-fill historical on-chain transactions.
    //     Non-fatal: a contract RPC failure must not block the HTTP server.
    try {
      await blockchainService.syncHistoricalTransactions();
    } catch (err) {
      console.error('[Server] Historical sync failed (non-fatal):', err.message);
    }

    // 2b. Subscribe to live TransactionAdded events.
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

  // 3. Share dbState with Express middleware via app.locals.
  //    This avoids a circular require between app.js and db.js.
  app.locals.dbState = dbState;

  // 4. Start Express — always runs regardless of DB status.
  const server = app.listen(PORT, () => {
    const dbTag = dbConnected ? '' : ' [DB UNAVAILABLE — routes returning 503]';
    console.log(
      `[Server] Running in ${process.env.NODE_ENV || 'development'} mode ` +
      `on port ${PORT}${dbTag}`,
    );
  });

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // Order: stop blockchain listener → drain HTTP connections → close Mongoose.
  // ---------------------------------------------------------------------------
  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully...`);

    blockchainService.stopEventListener();

    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        // readyState 0 = disconnected — skip close() if already disconnected.
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

    // Force-exit if graceful shutdown takes longer than 10 seconds.
    // .unref() prevents this timer from keeping the event loop alive.
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

// ---------------------------------------------------------------------------
// Top-level error handler — only truly fatal errors (e.g. port in use) reach
// here now that DB failures are handled gracefully inside start().
// ---------------------------------------------------------------------------
start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
