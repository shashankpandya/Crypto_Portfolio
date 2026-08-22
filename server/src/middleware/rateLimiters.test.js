'use strict';

const request = require('supertest');
const app = require('../app');

describe('Per-Route Rate Limiters (P3-05)', () => {
  it('returns standard RateLimit headers on /api/transactions/count', async () => {
    const res = await request(app).get('/api/transactions/count');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('keeps /health endpoint unmetered (no RateLimit headers)', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['ratelimit-limit']).toBeUndefined();
  });

  it('returns standard RateLimit headers on /api/auth/nonce', async () => {
    const res = await request(app).get('/api/auth/nonce?address=0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('10');
  });
});
