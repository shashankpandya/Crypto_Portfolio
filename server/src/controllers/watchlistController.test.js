'use strict';

/**
 * watchlistController.test.js (P6-03 / P6-04)
 * P6-03: controller tests against the repository's Mongo branch —
 * `dbState.connected` is flipped true and the Mongoose `Watchlist` model's
 * methods are mocked (vi.spyOn), following the same pattern
 * marketService.test.js already uses.
 * P6-04: the same controller routes exercised against the JSON-fallback
 * branch (see that describe block for why it spies on the built-in `fs`
 * module rather than mocking jsonStore's exports).
 */

const fs = require('fs');
const path = require('path');
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
      // addCoin (P6-XX rewrite) is now atomic: findOneAndUpdate(upsert shell)
      // -> updateOne($push if not present) -> findOne(final read). No more
      // find-then-save — see watchlistRepo.js for why (lost-update race).
      const findOneAndUpdateSpy = vi.spyOn(Watchlist, 'findOneAndUpdate').mockResolvedValue({});
      const updateOneSpy = vi.spyOn(Watchlist, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
      vi.spyOn(Watchlist, 'findOne').mockResolvedValue({
        walletAddress: ADDRESS,
        coins: [{ coinId: 'ethereum', addedAt: new Date() }],
      });

      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({ coinId: 'ethereum' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.coins.map((c) => c.coinId)).toContain('ethereum');
      expect(findOneAndUpdateSpy).toHaveBeenCalled();
      expect(updateOneSpy).toHaveBeenCalled();
    });

    it('returns 400 when coinId is missing from the body', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('propagates a Mongo write failure as a redacted 500', async () => {
      vi.spyOn(Watchlist, 'findOneAndUpdate').mockRejectedValue(new Error('connection reset by peer'));

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
      // removeCoin is now atomic too: findOne (existence check) ->
      // findOneAndUpdate($pull) — see watchlistRepo.js.
      vi.spyOn(Watchlist, 'findOne').mockResolvedValue({ walletAddress: ADDRESS, coins: [{ coinId: 'bitcoin' }] });
      const findOneAndUpdateSpy = vi.spyOn(Watchlist, 'findOneAndUpdate').mockResolvedValue({
        walletAddress: ADDRESS,
        coins: [],
      });

      const res = await request(app).delete(`/api/watchlist/${ADDRESS}/coins/bitcoin`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        { walletAddress: ADDRESS },
        { $pull: { coins: { coinId: 'bitcoin' } } },
        { new: true },
      );
    });

    it('returns 404 when no watchlist document exists for the wallet', async () => {
      vi.spyOn(Watchlist, 'findOne').mockResolvedValue(null);

      const res = await request(app).delete(`/api/watchlist/${ADDRESS}/coins/bitcoin`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// P6-04 — JSON-fallback branch (dbState.connected = false / undefined).
//
// watchlistRepo.js destructures `const { readJson, writeJson } =
// require('../lib/jsonStore')` at import time, so `vi.mock('../lib/jsonStore')`
// / `vi.spyOn(jsonStore, 'readJson')` cannot intercept the repo's already
// -bound local reference (confirmed by hand: the real filesystem functions
// ran regardless of the mock).
//
// jsonStore itself, however, accesses the built-in `fs` module via
// `fs.readFileSync(...)`/`fs.renameSync(...)` — NOT destructured — so
// spying on the shared `fs` module object DOES work. Earlier version of
// this block wrote directly to the real server/data/watchlist.json with a
// snapshot/restore around it; that raced with addressNormalization.test.js
// (P1-07), which also exercises this same JSON-fallback path against the
// real file with no such isolation, and both run in parallel worker
// threads — confirmed flaky (~1-in-4 runs) with real cross-file data
// bleed. Instead, `fs.readFileSync`/`fs.renameSync` (the two calls that
// touch a *real* path: jsonStore reads the target file directly, and
// commits a write by renaming its temp file onto the target path) are
// intercepted ONLY when the path resolves to WATCHLIST_FILE, backed by an
// in-memory store; every other path (including jsonStore's own temp files)
// falls through to the real fs unmodified. The real watchlist.json file is
// never touched by this block at all.
// ---------------------------------------------------------------------------
describe('watchlistController — JSON fallback path (P6-04)', () => {
  const WATCHLIST_FILE = path.resolve(__dirname, '../../data/watchlist.json');
  const realReadFileSync = fs.readFileSync.bind(fs);
  const realRenameSync = fs.renameSync.bind(fs);
  const realUnlinkSync = fs.unlinkSync.bind(fs);

  let store; // null = simulates the file not existing yet
  let originalLocalsDbState;

  beforeEach(() => {
    store = null;

    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, ...rest) => {
      if (typeof filePath === 'string' && path.resolve(filePath) === WATCHLIST_FILE) {
        if (store === null) {
          const err = new Error('ENOENT: no such file or directory');
          err.code = 'ENOENT';
          throw err;
        }
        return JSON.stringify(store);
      }
      return realReadFileSync(filePath, ...rest);
    });

    // jsonStore's writeJson commits by renaming a real temp file onto the
    // target path — intercept only that final rename, then clean up the
    // real temp file jsonStore actually created on disk.
    vi.spyOn(fs, 'renameSync').mockImplementation((src, dest) => {
      if (typeof dest === 'string' && path.resolve(dest) === WATCHLIST_FILE) {
        store = JSON.parse(realReadFileSync(src, 'utf8'));
        realUnlinkSync(src);
        return;
      }
      return realRenameSync(src, dest);
    });

    originalLocalsDbState = app.locals.dbState;
    app.locals.dbState = { connected: false };
  });

  afterEach(() => {
    app.locals.dbState = originalLocalsDbState;
    vi.restoreAllMocks();
  });

  const seed = (data) => {
    store = data;
  };
  const readStore = () => store;

  describe('GET /api/watchlist/:walletAddress', () => {
    it('returns an empty coins array when no local entry exists yet', async () => {
      const res = await request(app).get(`/api/watchlist/${ADDRESS}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ walletAddress: ADDRESS, coins: [] });
    });

    it('matches the Mongo-path response shape for an existing entry', async () => {
      seed({ [ADDRESS]: ['bitcoin', 'ethereum'] });
      const res = await request(app).get(`/api/watchlist/${ADDRESS}`);
      expect(res.status).toBe(200);
      expect(res.body.data.walletAddress).toBe(ADDRESS);
      expect(res.body.data.coins.map((c) => c.coinId)).toEqual(['bitcoin', 'ethereum']);
      expect(res.body.data.coins[0]).toHaveProperty('addedAt');
    });
  });

  describe('POST /api/watchlist/:walletAddress/coins', () => {
    it('creates the local entry and adds the coin', async () => {
      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({ coinId: 'bitcoin' });

      expect(res.status).toBe(200);
      expect(res.body.data.coins.map((c) => c.coinId)).toEqual(['bitcoin']);
      expect(readStore()[ADDRESS]).toEqual(['bitcoin']);
    });

    it('does not duplicate a coin already on the local list', async () => {
      seed({ [ADDRESS]: ['bitcoin'] });
      const res = await request(app)
        .post(`/api/watchlist/${ADDRESS}/coins`)
        .send({ coinId: 'bitcoin' });

      expect(res.status).toBe(200);
      expect(res.body.data.coins).toHaveLength(1);
    });

    it('returns 400 for a missing coinId, matching the Mongo path', async () => {
      const res = await request(app).post(`/api/watchlist/${ADDRESS}/coins`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/watchlist/:walletAddress/coins/:coinId', () => {
    it('removes the coin from the local list', async () => {
      seed({ [ADDRESS]: ['bitcoin', 'ethereum'] });
      const res = await request(app).delete(`/api/watchlist/${ADDRESS}/coins/bitcoin`);

      expect(res.status).toBe(200);
      expect(res.body.data.coins.map((c) => c.coinId)).toEqual(['ethereum']);
      expect(readStore()[ADDRESS]).toEqual(['ethereum']);
    });

    it('returns 404 when no local entry exists for the wallet, matching the Mongo path', async () => {
      const res = await request(app).delete(`/api/watchlist/${ADDRESS}/coins/bitcoin`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
