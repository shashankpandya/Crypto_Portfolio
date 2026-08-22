'use strict';

const crypto = require('crypto');

/**
 * Assigns a unique request ID / correlation ID to each incoming request.
 * Sets the X-Request-Id and X-Correlation-Id response headers.
 */
function requestId(req, res, next) {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const id = incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : `req-${crypto.randomUUID()}`;

  req.id = id;
  req.correlationId = id;
  res.setHeader('X-Request-Id', id);
  res.setHeader('X-Correlation-Id', id);

  next();
}

module.exports = requestId;
