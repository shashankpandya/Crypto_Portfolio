'use strict';

const { Router } = require('express');
const blockchainService = require('../services/blockchainService');
const { version } = require('../../package.json');

const router = Router();

/**
 * GET /health
 * Primary health check endpoint reporting overall system & dependency status.
 * Backward-compatible with P1-14 / BASELINE shape.
 */
router.get('/', (req, res) => {
  const { dbState } = req.app.locals ?? {};
  const dbConnected = Boolean(dbState?.connected);
  const chainStatus = blockchainService.getStatus();

  const isHealthy = dbConnected;
  const overallStatus = isHealthy ? 'ok' : 'degraded';

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: overallStatus,
    db: dbConnected ? 'connected' : 'disconnected',
    blockchain: chainStatus.status,
    version: version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dependencies: {
      db: {
        status: dbConnected ? 'connected' : 'disconnected',
        storage: dbConnected ? 'mongodb' : 'json-fallback',
      },
      blockchain: chainStatus,
    },
  });
});

/**
 * GET /health/live
 * Liveness probe — indicates process is running.
 */
router.get('/live', (_req, res) => {
  return res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

/**
 * GET /health/ready
 * Readiness probe — indicates application is ready to accept traffic.
 */
router.get('/ready', (req, res) => {
  const { dbState } = req.app.locals ?? {};
  const dbConnected = Boolean(dbState?.connected);
  return res.status(dbConnected ? 200 : 503).json({
    ready: dbConnected,
    db: dbConnected ? 'connected' : 'disconnected',
  });
});

module.exports = router;
