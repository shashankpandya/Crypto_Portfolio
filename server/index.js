'use strict';

// Load environment variables first — before any other import reads process.env.
//
// Two .env files exist: server/.env (MONGO_URI, ALCHEMY_URL, CONTRACT_ADDRESS,
// COINGECKO_API_KEY, PORT) and the root .env (AUTH_REQUIRED, JWT_SECRET,
// JWT_EXPIRES_IN, PORT). Previously only the root file was loaded, so the
// server always ran with no DB, no indexer, and no CoinGecko key — every
// subsystem silently fell back (JSON storage, mock coin data, unauthenticated
// rate-limited CoinGecko calls). Load server/.env first so its operational
// values win, then the root .env fills in whatever server/.env doesn't define
// (dotenv never overwrites a var that's already set).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app                    = require('./src/app');
const { connectDB, dbState } = require('./src/config/db');
const blockchainService      = require('./src/services/blockchainService');
const logger                 = require('./src/lib/logger');

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * checkBootEnvironment (P5-07) — the baseline captured on this repo had none
 * of VITE_CONTRACT_ADDRESS, MONGO_URI, or ALCHEMY_URL set, so chain and DB
 * features were silently off. Individual subsystems already degrade
 * gracefully and log their own failures (dbState fallback in config/db.js,
 * blockchainService._init()'s error log from P3-09) — this adds one loud,
 * consolidated summary at boot so "why is chain/DB stuff not working" is
 * answerable from the first few log lines instead of scattered warnings.
 * Never throws — missing optional vars degrade, they don't crash the server.
 */
function checkBootEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logAtSeverity = isProduction ? 'error' : 'warn';

  const disabled = [];
  if (!process.env.MONGO_URI) {
    disabled.push('MongoDB persistence (MONGO_URI not set — falling back to server/data/*.json)');
  }
  if (!process.env.ALCHEMY_URL) {
    disabled.push('Blockchain indexer (ALCHEMY_URL not set — no on-chain event listening or sync)');
  }
  if (!process.env.CONTRACT_ADDRESS && !process.env.VITE_CONTRACT_ADDRESS) {
    disabled.push('Contract reads (CONTRACT_ADDRESS/VITE_CONTRACT_ADDRESS not set — transaction indexing disabled)');
  }

  if (disabled.length > 0) {
    logger[logAtSeverity](
      { disabledFeatures: disabled },
      `[Server] Starting with ${disabled.length} feature(s) disabled due to missing environment variables:\n` +
        disabled.map((line) => `  - ${line}`).join('\n'),
    );
  } else {
    logger.info('[Server] All optional environment variables present — no features disabled at boot.');
  }
}

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
  checkBootEnvironment();

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
