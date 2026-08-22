'use strict';

const request = require('supertest');
const app = require('../app');

describe('Zod validation for market and transactions routes (P3-03)', () => {
  describe('GET /api/market/coins validation', () => {
    it('rejects invalid limit (e.g. limit=abc)', async () => {
      const res = await request(app).get('/api/market/coins?limit=abc');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('details');
    });

    it('rejects limit exceeding maximum 250 (e.g. limit=500)', async () => {
      const res = await request(app).get('/api/market/coins?limit=500');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/transactions/:address validation', () => {
    it('rejects invalid Ethereum address format (e.g. 0xzzz)', async () => {
      const res = await request(app).get('/api/transactions/0xzzz');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('details');
    });

    it('accepts valid Ethereum address', async () => {
      const res = await request(app).get('/api/transactions/0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('rejects page < 1 or limit > 100', async () => {
      const res = await request(app).get('/api/transactions/0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc?page=0');
      expect(res.status).toBe(400);

      const res2 = await request(app).get('/api/transactions/0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc?limit=150');
      expect(res2.status).toBe(400);
    });
  });
});
