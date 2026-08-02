'use strict';

/**
 * addressNormalization.test.js
 * Integration tests for P1-07: Standardize Ethereum address casing across controllers.
 */

const request = require('supertest');
const app = require('../app');

describe('Address Normalization in Controllers (P1-07)', () => {
  const validChecksumAddress = '0xcB9D0AA389456EB5a46C772F38B59c40b092ebcC';
  const validLowercaseAddress = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';
  const invalidAddress = 'not-an-eth-address';

  describe('Watchlist Controller', () => {
    it('GET /api/watchlist/:walletAddress normalizes checksum address to lowercase in response', async () => {
      const res = await request(app).get(`/api/watchlist/${validChecksumAddress}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(validLowercaseAddress);
    });

    it('GET /api/watchlist/:walletAddress returns 400 for invalid address format', async () => {
      const res = await request(app).get(`/api/watchlist/${invalidAddress}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or missing');
    });

    it('POST /api/watchlist/:walletAddress/coins normalizes checksum address to lowercase', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${validChecksumAddress}/coins`)
        .send({ coinId: 'bitcoin' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(validLowercaseAddress);
    });

    it('POST /api/watchlist/:walletAddress/coins returns 400 for invalid address', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${invalidAddress}/coins`)
        .send({ coinId: 'bitcoin' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Transaction Controller', () => {
    it('GET /api/transactions/:address accepts checksum address and queries normalized lowercase address', async () => {
      const res = await request(app).get(`/api/transactions/${validChecksumAddress}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/transactions/:address returns 400 for invalid address format', async () => {
      const res = await request(app).get(`/api/transactions/${invalidAddress}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or missing');
    });
  });
});
