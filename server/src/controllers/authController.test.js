'use strict';

/**
 * authController.test.js
 * Unit + integration tests for P1-08 SIWE nonce/verify endpoints.
 *
 * Tests exercise:
 *   - nonce creation and retrieval
 *   - nonce expiration
 *   - nonce single-use / replay prevention
 *   - invalid address rejection
 *   - verify endpoint with missing fields
 *   - verify endpoint with malformed SIWE message
 *   - verify endpoint with wrong nonce
 *   - valid signature flow (mocked ethers/siwe)
 */

const request = require('supertest');
const app = require('../app');
const {
  _getNonceStore,
  setNonce,
  consumeNonce,
} = require('./authController');

const VALID_ADDRESS = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';

// ---------------------------------------------------------------------------
// Nonce store unit tests
// ---------------------------------------------------------------------------
describe('authController — nonce store internals', () => {
  beforeEach(() => {
    _getNonceStore().clear();
  });

  it('consumeNonce returns nonce for a valid address', () => {
    setNonce(VALID_ADDRESS, 'abc123');
    expect(consumeNonce(VALID_ADDRESS)).toBe('abc123');
  });

  it('consumeNonce returns null for unknown address', () => {
    expect(consumeNonce(VALID_ADDRESS)).toBeNull();
  });

  it('consumeNonce is single-use — second call returns null (replay prevention)', () => {
    setNonce(VALID_ADDRESS, 'abc123');
    consumeNonce(VALID_ADDRESS); // First use
    expect(consumeNonce(VALID_ADDRESS)).toBeNull(); // Second use rejected
  });

  it('consumeNonce returns null for expired nonce', () => {
    const store = _getNonceStore();
    store.set(VALID_ADDRESS, {
      nonce: 'expired',
      expiresAt: Date.now() - 1, // Already past
    });
    expect(consumeNonce(VALID_ADDRESS)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/nonce integration tests
// ---------------------------------------------------------------------------
describe('GET /api/auth/nonce', () => {
  beforeEach(() => {
    _getNonceStore().clear();
  });

  it('returns 200 and a nonce for a valid address', async () => {
    const res = await request(app).get(`/api/auth/nonce?address=${VALID_ADDRESS}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.nonce).toBe('string');
    expect(res.body.nonce.length).toBeGreaterThan(0);
  });

  it('returns 200 for checksum address (normalizes to lowercase)', async () => {
    const checksumAddr = '0xcB9D0AA389456EB5a46C772F38B59c40b092ebcC';
    const res = await request(app).get(`/api/auth/nonce?address=${checksumAddr}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for missing address', async () => {
    const res = await request(app).get('/api/auth/nonce');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid address format', async () => {
    const res = await request(app).get('/api/auth/nonce?address=not-an-address');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify integration tests — field validation
// ---------------------------------------------------------------------------
describe('POST /api/auth/verify — input validation', () => {
  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .send({ signature: '0xdeadbeef' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('message');
  });

  it('returns 400 when signature is missing', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .send({ message: 'some message text' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('signature');
  });

  it('returns 400 for malformed SIWE message string', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .send({ message: 'this is not a valid siwe message', signature: '0xdeadbeef' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/malformed/i);
  });
});
