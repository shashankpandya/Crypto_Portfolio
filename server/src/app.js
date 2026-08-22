'use strict';

const crypto    = require('crypto');
const express   = require('express');
const compression = require('compression');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp  = require('pino-http');
const logger    = require('./lib/logger');
const requestId = require('./middleware/requestId');

// ---------------------------------------------------------------------------
// Route modules
// ---------------------------------------------------------------------------
const transactionRoutes = require('./routes/transactions');
const marketRoutes      = require('./routes/market');
const watchlistRoutes   = require('./routes/watchlist');
const authRoutes        = require('./routes/auth');

// ---------------------------------------------------------------------------
// App & Proxy settings
// ---------------------------------------------------------------------------
const app = express();

// Response compression (P3-06)
app.use(compression());

// Trust reverse proxy (e.g. Nginx, Cloudflare, ALB) - 1 hop
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Request ID & Logging middleware
// ---------------------------------------------------------------------------
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------

// helmet sets a sensible suite of security-related HTTP headers.
app.use(helmet());

// CORS allowlist configuration (P1-15)
const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? configuredOrigins
  : [...new Set([...defaultDevOrigins, ...configuredOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parse incoming JSON bodies (limit to 10 kb to mitigate payload attacks).
app.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// Health check (P1-15)
// GET /health
// Exempt from rate limiting and DB requirements. Responds even when DB is down.
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  const { dbState } = req.app.locals ?? {};
  const dbConnected = dbState?.connected ?? false;

  res.status(dbConnected ? 200 : 503).json({
    success:   dbConnected,
    status:    dbConnected ? 'ok' : 'degraded',
    db:        dbConnected ? 'connected' : 'disconnected',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Rate limiting policies (P3-05)
// ---------------------------------------------------------------------------
const { authLimiter, readLimiter } = require('./middleware/rateLimiters');

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/transactions', readLimiter, transactionRoutes);
app.use('/api/market',       readLimiter, marketRoutes);
app.use('/api/watchlist',    watchlistRoutes);
app.use('/api/auth',         authLimiter, authRoutes);

const { errorHandler } = require('./middleware/errorHandler');

// ---------------------------------------------------------------------------
// 404 handler — catches any request that didn't match a route above.
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---------------------------------------------------------------------------
// Global error handler (P1-15, P3-01, P3-02)
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
