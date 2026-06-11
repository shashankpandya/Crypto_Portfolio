'use strict';

// Load environment variables first — before any other import reads process.env.
require('dotenv').config();

const app              = require('./src/app');
const connectDB        = require('./src/config/db');
const blockchainService = require('./src/services/blockchainService');

const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// start
// Orchestrates the full startup sequence:
//   1. Connect to MongoDB
//   2. Sync historical on-chain transactions into the DB
//   3. Attach the live blockchain event listener
//   4. Start the HTTP server
//
// Any failure in steps 1-3 will throw and be caught by the top-level handler,
// preventing the server from accepting traffic in a broken state.
// ---------------------------------------------------------------------------
async function start() {
  // 1. MongoDB
  await connectDB();

  // 2. Back-fill historical transactions from the smart contract.
  //    Wrapped in try/catch so a contract call failure doesn't block startup
  //    entirely — the live listener will still capture new events.
  try {
    await blockchainService.syncHistoricalTransactions();
  } catch (err) {
    console.error('[Server] Historical sync failed (non-fatal):', err.message);
  }

  // 3. Subscribe to live TransactionAdded events.
  await blockchainService.startEventListener();

  // 4. Start Express.
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // Stops accepting new connections, removes the blockchain listener, and
  // closes the MongoDB connection before the process exits.
  // ---------------------------------------------------------------------------
  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully…`);

    blockchainService.stopEventListener();

    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('[Server] MongoDB connection closed.');
      } catch (err) {
        console.error('[Server] Error closing MongoDB connection:', err.message);
      }
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });

    // Force-exit if graceful shutdown takes longer than 10 seconds.
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

// ---------------------------------------------------------------------------
// Top-level error handler — catches any unhandled rejection from start().
// ---------------------------------------------------------------------------
start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
