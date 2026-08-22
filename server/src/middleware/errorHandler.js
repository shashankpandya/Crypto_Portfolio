'use strict';

const crypto = require('crypto');
const logger = require('../lib/logger');

/**
 * Wraps an async route handler or middleware to forward rejections to Express error handling.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Centralized global error handling middleware.
 */
function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV === 'development';
  let status = err.status ?? err.statusCode ?? 500;
  const correlationId = req?.id || req?.correlationId || `req-${crypto.randomUUID()}`;

  // If CoinGecko or upstream rate limit error occurred
  if (err.message && typeof err.message === 'string' && err.message.includes('429')) {
    status = 429;
  }

  const reqLogger = req?.log || logger;
  reqLogger.error(
    { err, correlationId, status },
    `[GlobalErrorHandler] [${correlationId}] ${err.message || 'Internal server error.'}`,
  );

  if (status >= 500 && !isDev) {
    return res.status(status).json({
      success: false,
      message: err.isOperational ? err.message : 'Internal server error.',
      correlationId,
      ...(err.details && { details: err.details }),
    });
  }

  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
    correlationId,
    ...(err.details && { details: err.details }),
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler, asyncHandler };
