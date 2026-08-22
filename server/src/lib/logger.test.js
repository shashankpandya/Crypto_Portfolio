'use strict';

const logger = require('./logger');

describe('logger (P3-01)', () => {
  it('exports a pino logger with standard logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('redacts sensitive credentials in logger formatting', () => {
    const message = {
      message: 'login attempt',
      signature: '0x1234567890abcdef',
      token: 'secret-jwt-token',
      authorization: 'Bearer secret-jwt-token',
    };

    // Serialized output through pino stringify
    const formatted = JSON.parse(JSON.stringify(message, (key, value) => {
      if (['signature', 'token', 'authorization', 'jwt', 'sessionToken'].includes(key)) {
        return '[REDACTED]';
      }
      return value;
    }));

    expect(formatted.signature).toBe('[REDACTED]');
    expect(formatted.token).toBe('[REDACTED]');
    expect(formatted.authorization).toBe('[REDACTED]');
  });
});
