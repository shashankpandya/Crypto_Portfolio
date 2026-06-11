'use strict';

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

// ---------------------------------------------------------------------------
// Route modules
// ---------------------------------------------------------------------------
const transactionRoutes = require('./routes/transactions');
const marketRoutes      = require('./routes/market');
const watchlistRoutes   = require('./routes/watchlist');

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------

// helmet sets a sensible suite of security-related HTTP headers.
app.use(helmet());

// cors — restrict origins via CORS_ORIGIN env var in production.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parse incoming JSON bodies (limit to 10 kb to mitigate payload attacks).
app.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// Rate limiting — 100 requests per 15 minutes per IP.
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs:          15 * 60 * 1000, // 15 minutes
  max:               100,
  standardHeaders:   true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders:     false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

app.use(limiter);

// ---------------------------------------------------------------------------
// DB health guard
// Sits in front of all /api routes. Reads dbState from app.locals (set by
// index.js after connectDB resolves) and short-circuits with 503 when the
// database is not connected. The /health route is intentionally excluded so
// load balancers and uptime monitors always receive a response.
// ---------------------------------------------------------------------------
app.use('/api', (req, res, next) => {
  const { dbState } = req.app.locals;
  if (!dbState || !dbState.connected) {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. The database is not connected.',
    });
  }
  return next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/transactions', transactionRoutes);
app.use('/api/market',       marketRoutes);
app.use('/api/watchlist',    watchlistRoutes);

// ---------------------------------------------------------------------------
// Health check
// GET /health
// Intentionally placed AFTER the DB guard so it always responds, even when
// the database is down. Reports DB status in the response body.
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
// 404 handler — catches any request that didn't match a route above.
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---------------------------------------------------------------------------
// Global error handler
// Express identifies this as an error handler because it has four parameters.
// All unhandled errors thrown inside route handlers land here.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[GlobalErrorHandler]', err);

  // Don't leak internal stack traces to the client in production.
  const isDev     = process.env.NODE_ENV === 'development';
  const status    = err.status ?? err.statusCode ?? 500;
  const message   = err.message || 'Internal server error.';

  res.status(status).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
});

module.exports = app;
