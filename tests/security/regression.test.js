'use strict';

/**
 * tests/security/regression.test.js (P6-08)
 *
 * Locks in the Phase 1 security guarantees (SIWE auth, IDOR protection,
 * CORS allowlist, production error redaction, address validation) so they
 * cannot silently regress. Runs against the real server app via supertest —
 * no live Mongo/RPC needed (JSON fallback), real `ethers.Wallet` signatures
 * for the SIWE flow (no live node needed either — signing is pure crypto).
 */

const path = require('path');
const { ethers } = require('ethers');
const { SiweMessage } = require('siwe');
const request = require('supertest');

const SERVER_DIR = path.resolve(__dirname, '../../server');
// jsonwebtoken isn't a root devDependency — reuse the server's own copy
// (already a real server dependency) rather than adding a duplicate one.
const jwt = require(path.join(SERVER_DIR, 'node_modules/jsonwebtoken'));

const ADDRESS_A = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';
const ADDRESS_B = '0x1111111111111111111111111111111111111111';
const JWT_SECRET = 'test-only-security-regression-secret';

describe('Security regression suite (P6-08)', () => {
  let app;
  let originalAuthRequired;
  let originalJwtSecret;
  let originalNodeEnv;

  beforeAll(() => {
    originalAuthRequired = process.env.AUTH_REQUIRED;
    originalJwtSecret = process.env.JWT_SECRET;
    originalNodeEnv = process.env.NODE_ENV;
    process.env.JWT_SECRET = JWT_SECRET;
    app = require(path.join(SERVER_DIR, 'src/app'));
    app.locals.dbState = { connected: false };
  });

  afterAll(() => {
    process.env.AUTH_REQUIRED = originalAuthRequired;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('IDOR — authenticated as A, requesting B', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'true';
    });

    const tokenFor = (address) => jwt.sign({ address }, JWT_SECRET, { expiresIn: '1h' });

    it('GET /api/watchlist/:B as A -> 403', async () => {
      const res = await request(app)
        .get(`/api/watchlist/${ADDRESS_B}`)
        .set('Authorization', `Bearer ${tokenFor(ADDRESS_A)}`);
      expect(res.status).toBe(403);
    });

    it('POST /api/watchlist/:B/coins as A -> 403', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS_B}/coins`)
        .set('Authorization', `Bearer ${tokenFor(ADDRESS_A)}`)
        .send({ coinId: 'bitcoin' });
      expect(res.status).toBe(403);
    });

    it('DELETE /api/watchlist/:B/coins/:coinId as A -> 403', async () => {
      const res = await request(app)
        .delete(`/api/watchlist/${ADDRESS_B}/coins/bitcoin`)
        .set('Authorization', `Bearer ${tokenFor(ADDRESS_A)}`);
      expect(res.status).toBe(403);
    });

    it('every IDOR-blocked route allows the matching owner through (not blanket-denying)', async () => {
      const res = await request(app)
        .get(`/api/watchlist/${ADDRESS_A}`)
        .set('Authorization', `Bearer ${tokenFor(ADDRESS_A)}`);
      expect(res.status).toBe(200);
    });
  });

  describe('No session -> 401', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'true';
    });

    it('GET /api/watchlist/:address with no Authorization header -> 401', async () => {
      const res = await request(app).get(`/api/watchlist/${ADDRESS_A}`);
      expect(res.status).toBe(401);
    });

    it('POST /api/watchlist/:address/coins with no Authorization header -> 401', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS_A}/coins`)
        .send({ coinId: 'bitcoin' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/watchlist/:address/coins/:coinId with no Authorization header -> 401', async () => {
      const res = await request(app).delete(`/api/watchlist/${ADDRESS_A}/coins/bitcoin`);
      expect(res.status).toBe(401);
    });
  });

  describe('SIWE: nonce single-use, expiry, and replay', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'false';
    });

    async function buildSignedMessage(wallet, overrides = {}) {
      const nonceRes = await request(app).get(`/api/auth/nonce?address=${wallet.address.toLowerCase()}`);
      const siwe = new SiweMessage({
        domain: 'localhost',
        address: wallet.address,
        statement: 'Sign in with Ethereum to Crypto Portfolio.',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonceRes.body.nonce,
        ...overrides,
      });
      const message = siwe.prepareMessage();
      const signature = await wallet.signMessage(message);
      return { message, signature };
    }

    it('a full real-signature nonce -> sign -> verify flow succeeds and issues a JWT', async () => {
      const wallet = ethers.Wallet.createRandom();
      const { message, signature } = await buildSignedMessage(wallet);

      const res = await request(app).post('/api/auth/verify').send({ message, signature });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.address).toBe(wallet.address.toLowerCase());
      expect(typeof res.body.token).toBe('string');
    });

    it('replaying the exact same signed message a second time is rejected (nonce already consumed)', async () => {
      const wallet = ethers.Wallet.createRandom();
      const { message, signature } = await buildSignedMessage(wallet);

      const first = await request(app).post('/api/auth/verify').send({ message, signature });
      expect(first.status).toBe(200);

      const replay = await request(app).post('/api/auth/verify').send({ message, signature });
      expect(replay.status).toBe(401);
      expect(replay.body.message).toMatch(/nonce/i);
    });

    it('a message built with a stale/unissued nonce is rejected', async () => {
      const wallet = ethers.Wallet.createRandom();
      const siwe = new SiweMessage({
        domain: 'localhost',
        address: wallet.address,
        statement: 'Sign in with Ethereum to Crypto Portfolio.',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: 'neverissuedbyserver00000000000000',
      });
      const message = siwe.prepareMessage();
      const signature = await wallet.signMessage(message);

      const res = await request(app).post('/api/auth/verify').send({ message, signature });
      expect(res.status).toBe(401);
    });
  });

  describe('SIWE: signature bound to the correct address', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'false';
    });

    it('a message claiming address A but signed by wallet B is rejected', async () => {
      const walletA = ethers.Wallet.createRandom();
      const walletB = ethers.Wallet.createRandom();

      const nonceRes = await request(app).get(`/api/auth/nonce?address=${walletA.address.toLowerCase()}`);
      const siwe = new SiweMessage({
        domain: 'localhost',
        address: walletA.address, // claims to be A...
        statement: 'Sign in with Ethereum to Crypto Portfolio.',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonceRes.body.nonce,
      });
      const message = siwe.prepareMessage();
      const signature = await walletB.signMessage(message); // ...but B actually signs it

      const res = await request(app).post('/api/auth/verify').send({ message, signature });
      expect(res.status).toBe(401);
    });
  });

  describe('CORS allowlist', () => {
    it('a disallowed origin gets no Access-Control-Allow-Origin header', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('an allowed dev origin gets the matching header echoed back', async () => {
      const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('NODE_ENV=production: 500 leaks no internals', () => {
    it('a raw (non-operational) error is redacted to a generic message with a correlationId', async () => {
      process.env.NODE_ENV = 'production';
      const Watchlist = require(path.join(SERVER_DIR, 'src/models/Watchlist'));
      const findSpy = vi
        .spyOn(Watchlist, 'findOne')
        .mockRejectedValue(new Error('ECONNREFUSED mongodb://internal-host:27017/secrets'));
      app.locals.dbState = { connected: true };

      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS_A}/coins`)
        .send({ coinId: 'bitcoin' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal server error.');
      expect(JSON.stringify(res.body)).not.toContain('internal-host');
      expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
      expect(res.body.correlationId).toBeTruthy();
      expect(res.body.stack).toBeUndefined();

      findSpy.mockRestore();
      app.locals.dbState = { connected: false };
    });
  });

  describe('Malformed addresses -> 400 on every address-taking route', () => {
    beforeEach(() => {
      process.env.AUTH_REQUIRED = 'false';
    });
    const BAD = 'not-an-eth-address';

    it('GET /api/watchlist/:walletAddress', async () => {
      expect((await request(app).get(`/api/watchlist/${BAD}`)).status).toBe(400);
    });
    it('POST /api/watchlist/:walletAddress/coins', async () => {
      expect(
        (await request(app).post(`/api/watchlist/${BAD}/coins`).send({ coinId: 'bitcoin' })).status,
      ).toBe(400);
    });
    it('DELETE /api/watchlist/:walletAddress/coins/:coinId', async () => {
      expect((await request(app).delete(`/api/watchlist/${BAD}/coins/bitcoin`)).status).toBe(400);
    });
    it('GET /api/transactions/:address', async () => {
      expect((await request(app).get(`/api/transactions/${BAD}`)).status).toBe(400);
    });
    it('GET /api/auth/nonce?address=', async () => {
      expect((await request(app).get(`/api/auth/nonce?address=${BAD}`)).status).toBe(400);
    });
  });
});
