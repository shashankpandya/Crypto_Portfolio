'use strict';

const crypto    = require('crypto');
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
const authRoutes        = require('./routes/auth');

// ---------------------------------------------------------------------------
// App & Proxy settings
// ---------------------------------------------------------------------------
const app = express();

// Trust reverse proxy (e.g. Nginx, Cloudflare, ALB) - 1 hop
app.set('trust proxy', 1);

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
// Rate limiting — 100 requests per 15 minutes per IP (applies to API routes).
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             100,
  standardHeaders: true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders:   false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

app.use(limiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/transactions', transactionRoutes);
app.use('/api/market',       marketRoutes);
app.use('/api/watchlist',    watchlistRoutes);
app.use('/api/auth',         authRoutes);

// ---------------------------------------------------------------------------
// 404 handler — catches any request that didn't match a route above.
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---------------------------------------------------------------------------
// Global error handler (P1-15)
// Error redaction in production with correlation IDs.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const status = err.status ?? err.statusCode ?? 500;
  const correlationId = `req-${crypto.randomUUID()}`;

  console.error(`[GlobalErrorHandler] [${correlationId}]`, err);

  if (status >= 500 && !isDev) {
    return res.status(status).json({
      success: false,
      message: 'Internal server error.',
      correlationId,
    });
  }

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(isDev && { stack: err.stack }),
  });
});

module.exports = app;
