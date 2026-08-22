'use strict';

const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'authorization',
      'cookie',
      'signature',
      'token',
      'sessionToken',
      'jwt',
      'body.signature',
      'body.token',
      'body.sessionToken',
      'body.jwt',
      '*.signature',
      '*.token',
      '*.sessionToken',
      '*.jwt',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
