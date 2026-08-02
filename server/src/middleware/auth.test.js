'use strict';

/**
 * auth.test.js
 * Tests for requireAuth middleware and AUTH_REQUIRED feature flag (P1-09).
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

describe('requireAuth Middleware & AUTH_REQUIRED Flag (P1-09)', () => {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_123';
  const addressA = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';
  const addressB = '0x1111111111111111111111111111111111111111';

  const originalAuthRequired = process.env.AUTH_REQUIRED;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  afterAll(() => {
    process.env.AUTH_REQUIRED = originalAuthRequired;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  describe('When AUTH_REQUIRED = false (Default Mode)', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'false';
    });

    it('allows GET /api/watchlist/:walletAddress without Authorization header', async () => {
      const res = await request(app).get(`/api/watchlist/${addressA}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows POST /api/watchlist/:walletAddress/coins without Authorization header', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${addressA}/coins`)
        .send({ coinId: 'ethereum' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('When AUTH_REQUIRED = true (Protected Mode)', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'true';
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get(`/api/watchlist/${addressA}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authorization header');
    });

    it('returns 401 when token is malformed', async () => {
      const res = await request(app)
        .get(`/api/watchlist/${addressA}`)
        .set('Authorization', 'Bearer invalid-token-string');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when token is expired', async () => {
      const expiredToken = jwt.sign({ address: addressA }, secret, { expiresIn: '-1s' });
      const res = await request(app)
        .get(`/api/watchlist/${addressA}`)
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('returns 403 when authenticated as addressA but attempting to access addressB', async () => {
      const tokenA = jwt.sign({ address: addressA }, secret, { expiresIn: '1h' });
      const res = await request(app)
        .get(`/api/watchlist/${addressB}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('allows access (200) when token matches target wallet address', async () => {
      const tokenA = jwt.sign({ address: addressA }, secret, { expiresIn: '1h' });
      const res = await request(app)
        .get(`/api/watchlist/${addressA}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
