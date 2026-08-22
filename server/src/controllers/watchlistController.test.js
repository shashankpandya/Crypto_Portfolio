'use strict';

/**
 * watchlistController.test.js (P6-03)
 * Controller tests against the repository's Mongo branch — `dbState.connected`
 * is flipped true and the Mongoose `Watchlist` model's methods are mocked
 * (vi.spyOn), following the same pattern marketService.test.js already uses.
 * The JSON-fallback branch (dbState.connected = false, no live Mongo needed)
 * is covered separately by P6-04.
 */

const request = require('supertest');
const app = require('../app');
const Watchlist = require('../models/Watchlist');

const ADDRESS = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';

describe('watchlistController — Mongo path (P6-03)', () => {
  let originalLocalsDbState;

  beforeEach(() => {
    // NOTE: watchlistController reads `req.app.locals.dbState`, which is only
    // ever populated by index.js's start() (never by app.js on its own) — the
    // config/db.js singleton is irrelevant here. Tests that import app.js
    // directly (as this whole suite does) must set app.locals.dbState
    // themselves to exercise the Mongo branch.
    originalLocalsDbState = app.locals.dbState;
    app.locals.dbState = { connected: true };
  });

  afterEach(() => {
    app.locals.dbState = originalLocalsDbState;
    vi.restoreAllMocks();
  });

  describe('GET /api/watchlist/:walletAddress', () => {
    it('returns the Mongo document (lean) for an existing watchlist', async () => {
      vi.spyOn(Watchlist, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          walletAddress: ADDRESS,
          coins: [{ coinId: 'bitcoin', addedAt: new Date() }],
        }),
      });

      const res = await request(app).get(`/api/watchlist/${ADDRESS}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(ADDRESS);
      expect(res.body.data.coins).toHaveLength(1);
    });

    it('returns an empty coins array (not a 404) when no document exists yet', async () => {
      vi.spyOn(Watchlist, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const res = await request(app).get(`/api/watchlist/${ADDRESS}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ walletAddress: ADDRESS, coins: [] });
    });

    it('returns 400 for a malformed address before ever touching Mongo', async () => {
      const findSpy = vi.spyOn(Watchlist, 'findOne');

      const res = await request(app).get('/api/watchlist/not-an-address');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/watchlist/:walletAddress/coins', () => {
    it('creates a new Mongo document and adds the coin when none exists yet', async () => {
      vi.spyOn(Watchlist, 'findOne').mockResolvedValue(null);
      const saveSpy = vi
        .spyOn(Watchlist.prototype, 'save')
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({ coinId: 'ethereum' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coins.map((c) => c.coinId)).toContain('ethereum');
      expect(saveSpy).toHaveBeenCalled();
    });

    it('returns 400 when coinId is missing from the body', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('propagates a Mongo write failure as a redacted 500', async () => {
      vi.spyOn(Watchlist, 'findOne').mockRejectedValue(new Error('connection reset by peer'));

      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({ coinId: 'bitcoin' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      // Production redaction (P1-15/P3-02): no internal error text leaked.
      expect(JSON.stringify(res.body)).not.toContain('connection reset by peer');
      expect(res.body).toHaveProperty('correlationId');
    });
  });

  describe('DELETE /api/watchlist/:walletAddress/coins/:coinId', () => {
    it('removes the coin from an existing Mongo document', async () => {
      const doc = {
        walletAddress: ADDRESS,
        coins: [{ coinId: 'bitcoin' }],
        removeCoin: vi.fn().mockImplementation(function (coinId) {
          this.coins = this.coins.filter((c) => c.coinId !== coinId);
          return Promise.resolve(this);
        }),
      };
      vi.spyOn(Watchlist, 'findOne').mockResolvedValue(doc);

      const res = await request(app).delete(`/api/watchlist/${ADDRESS}/coins/bitcoin`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(doc.removeCoin).toHaveBeenCalledWith('bitcoin');
    });

    it('returns 404 when no watchlist document exists for the wallet', async () => {
      vi.spyOn(Watchlist, 'findOne').mockResolvedValue(null);

      const res = await request(app).delete(`/api/watchlist/${ADDRESS}/coins/bitcoin`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
