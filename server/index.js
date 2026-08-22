'use strict';

// Load environment variables first — before any other import reads process.env.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app                    = require('./src/app');
const { connectDB, dbState } = require('./src/config/db');
const blockchainService      = require('./src/services/blockchainService');
const logger                 = require('./src/lib/logger');

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function createShutdownHandler(server, blockchain = blockchainService) {
  let isShuttingDown = false;

  return async function shutdown(signal = 'SIGTERM') {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`[Server] ${signal} received — initiating graceful shutdown...`);

    const forceTimer = setTimeout(() => {
      logger.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      blockchain.stopEventListener();
      logger.info('[Server] Indexer event listener stopped.');
    } catch (err) {
      logger.error({ err }, '[Server] Error stopping indexer event listener');
    }

    if (server && server.close) {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.error({ err }, '[Server] Error closing HTTP server');
          } else {
            logger.info('[Server] HTTP server closed — in-flight requests drained.');
          }
          resolve();
        });
      });
    }

    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        logger.info('[Server] MongoDB connection closed.');
      }
    } catch (err) {
      logger.error({ err }, `[Server] Error closing MongoDB connection: ${err.message}`);
    }

    clearTimeout(forceTimer);
    logger.info('[Server] Graceful shutdown complete.');
    return 0;
  };
}

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

  const shutdown = await createShutdownHandler(server, blockchainService);

  process.on('SIGTERM', async () => {
    const code = await shutdown('SIGTERM');
    process.exit(code);
  });

  process.on('SIGINT', async () => {
    const code = await shutdown('SIGINT');
    process.exit(code);
  });

  return { server, shutdown };
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ err }, '[Server] Fatal startup error');
    process.exit(1);
  });
}

module.exports = { start, createShutdownHandler };
