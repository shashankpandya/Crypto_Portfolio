'use strict';

const request = require('supertest');
const express = require('express');
const AppError = require('../lib/AppError');
const { errorHandler, asyncHandler } = require('./errorHandler');

describe('AppError and errorHandler (P3-02)', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());

    testApp.get(
      '/test-bad-request',
      asyncHandler(async () => {
        throw AppError.badRequest('Custom validation failure', { field: 'email' });
      }),
    );

    testApp.get(
      '/test-not-found',
      asyncHandler(async () => {
        throw AppError.notFound('Resource missing');
      }),
    );

    testApp.get(
      '/test-unauthorized',
      asyncHandler(async () => {
        throw AppError.unauthorized('No access');
      }),
    );

    testApp.get(
      '/test-rate-limit',
      asyncHandler(async () => {
        throw AppError.rateLimit('Rate exceeded');
      }),
    );

    testApp.get(
      '/test-unhandled',
      asyncHandler(async () => {
        throw new Error('Unexpected crash');
      }),
    );

    testApp.use(errorHandler);
  });

  it('maps 400 Bad Request with details', async () => {
    const res = await request(testApp).get('/test-bad-request');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Custom validation failure');
    expect(res.body.details).toEqual({ field: 'email' });
    expect(res.body.correlationId).toBeDefined();
  });

  it('maps 404 Not Found', async () => {
    const res = await request(testApp).get('/test-not-found');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Resource missing');
  });

  it('maps 401 Unauthorized', async () => {
    const res = await request(testApp).get('/test-unauthorized');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('maps 429 Rate Limit', async () => {
    const res = await request(testApp).get('/test-rate-limit');
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
  });

  it('handles unexpected errors as 500 with correlationId', async () => {
    const res = await request(testApp).get('/test-unhandled');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.correlationId).toBeDefined();
  });
});
