'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for auth routes (brute-force protection: 10 req/min).
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

/**
 * Moderate limiter for mutating endpoints (e.g. watchlist modifications: 30 req/min).
 */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many write requests. Please try again later.',
  },
});

/**
 * Generous limiter for read endpoints (e.g. market, transactions: 120 req/min).
 */
const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded. Please try again later.',
  },
});

module.exports = {
  authLimiter,
  writeLimiter,
  readLimiter,
};
