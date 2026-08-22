'use strict';

// Load environment variables first — before any other import reads process.env.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app                    = require('./src/app');
const { connectDB, dbState } = require('./src/config/db');
const blockchainService      = require('./src/services/blockchainService');
const logger                 = require('./src/lib/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  const dbConnected = await connectDB();

  if (!dbConnected) {
    logger.warn(
      '[Server] Starting WITHOUT database. ' +
      'All /api routes will fallback to local file-based JSON storage.',
    );
  }

  app.locals.dbState = dbState;

  // Back-fill historical on-chain transactions (non-fatal, falls back to local JSON file).
  try {
    await blockchainService.syncHistoricalTransactions();
  } catch (err) {
    logger.error({ err }, `[Server] Historical sync failed (non-fatal): ${err.message}`);
  }

  // Subscribe to live events (non-fatal, falls back to local JSON file).
  try {
    await blockchainService.startEventListener();
  } catch (err) {
    logger.error({ err }, `[Server] Event listener failed to start (non-fatal): ${err.message}`);
  }

  const server = app.listen(PORT, () => {
    const dbTag = dbConnected ? '' : ' [DB UNAVAILABLE — using local fallback]';
    logger.info(
      `[Server] Running in ${process.env.NODE_ENV || 'development'} mode ` +
      `on port ${PORT}${dbTag}`,
    );
  });

  const shutdown = async (signal) => {
    logger.info(`[Server] ${signal} received — shutting down gracefully...`);
    blockchainService.stopEventListener();
    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close();
          logger.info('[Server] MongoDB connection closed.');
        }
      } catch (err) {
        logger.error({ err }, `[Server] Error closing MongoDB connection: ${err.message}`);
      }
      logger.info('[Server] Shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, '[Server] Fatal startup error');
  process.exit(1);
});
