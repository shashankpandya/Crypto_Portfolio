'use strict';

/**
 * transactionController.test.js (P6-03 / P6-04)
 * P6-03: controller tests against the repository's Mongo branch —
 * `dbState.connected` is flipped true and the Mongoose `Transaction` model's
 * query methods are mocked (vi.spyOn).
 * P6-04: the same routes against the JSON-fallback branch, exercised via the
 * real server/data/transactions.json file (see watchlistController.test.js's
 * P6-04 block for why: transactionRepo.js destructures `readJson` out of
 * jsonStore at require time, which defeats mocking that binding later).
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../app');
const Transaction = require('../models/Transaction');

const ADDRESS = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';

describe('transactionController — Mongo path (P6-03)', () => {
  let originalLocalsDbState;

  beforeEach(() => {
    // NOTE: transactionController reads `req.app.locals.dbState`, which is
    // only ever populated by index.js's start() (never by app.js on its
    // own) — see the matching note in watchlistController.test.js.
    originalLocalsDbState = app.locals.dbState;
    app.locals.dbState = { connected: true };
  });

  afterEach(() => {
    app.locals.dbState = originalLocalsDbState;
    vi.restoreAllMocks();
  });

  describe('GET /api/transactions/:address', () => {
    it('returns paginated Mongo results with a correct pagination envelope', async () => {
      const docs = [
        { sender: ADDRESS, recipient: '0xabc', amount: '1000000000000000000', timestamp: 1700000000 },
      ];
      vi.spyOn(Transaction, 'countDocuments').mockResolvedValue(1);
      vi.spyOn(Transaction, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(docs),
      });

      const res = await request(app).get(`/api/transactions/${ADDRESS}?page=1&limit=20`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(docs);
      expect(res.body.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
      });
    });

    it('queries with an $or filter on sender/recipient for the normalized address', async () => {
      const findSpy = vi.spyOn(Transaction, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });
      vi.spyOn(Transaction, 'countDocuments').mockResolvedValue(0);

      await request(app).get(`/api/transactions/${ADDRESS}`);

      expect(findSpy).toHaveBeenCalledWith({
        $or: [{ sender: ADDRESS }, { recipient: ADDRESS }],
      });
    });

    it('clamps an out-of-range limit query param to the max page size (100)', async () => {
      vi.spyOn(Transaction, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(Transaction, 'find').mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      const res = await request(app).get(`/api/transactions/${ADDRESS}?limit=99999`);

      // Zod schema (P3-03) caps limit at 100 and rejects out-of-range values with 400.
      expect(res.status).toBe(400);
    });

    it('returns 400 for a malformed address', async () => {
      const res = await request(app).get('/api/transactions/not-an-address');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/transactions/count', () => {
    it('returns the Mongo document count', async () => {
      vi.spyOn(Transaction, 'countDocuments').mockResolvedValue(42);

      const res = await request(app).get('/api/transactions/count');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, count: 42 });
    });

    it('is routed before /:address so "count" is never treated as an address', async () => {
      vi.spyOn(Transaction, 'countDocuments').mockResolvedValue(0);
      const res = await request(app).get('/api/transactions/count');
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('pagination');
    });
  });
});

// ---------------------------------------------------------------------------
// P6-04 — JSON-fallback branch (dbState.connected = false / undefined).
//
// transactionRepo.js is read-only against the JSON fallback (no writeJson
// call — transactions come from the on-chain indexer, never a user-facing
// write here), and destructures `readJson` out of jsonStore at require
// time, defeating a mock/spy on jsonStore's own exports (see
// watchlistController.test.js's matching P6-04 note for the full
// explanation and the flaky-test history that ruled out writing to the
// real server/data/transactions.json directly). `fs.readFileSync` itself
// is NOT destructured by jsonStore, so it's spied on directly instead —
// intercepted only for this file's exact path, real fs untouched for
// every other path.
// ---------------------------------------------------------------------------
describe('transactionController — JSON fallback path (P6-04)', () => {
  const TRANSACTIONS_FILE = path.resolve(__dirname, '../../data/transactions.json');
  const realReadFileSync = fs.readFileSync.bind(fs);

  let store; // null = simulates the file not existing yet
  let originalLocalsDbState;

  beforeEach(() => {
    store = null;

    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, ...rest) => {
      if (typeof filePath === 'string' && path.resolve(filePath) === TRANSACTIONS_FILE) {
        if (store === null) {
          const err = new Error('ENOENT: no such file or directory');
          err.code = 'ENOENT';
          throw err;
        }
        return JSON.stringify(store);
      }
      return realReadFileSync(filePath, ...rest);
    });

    originalLocalsDbState = app.locals.dbState;
    app.locals.dbState = { connected: false };
  });

  afterEach(() => {
    app.locals.dbState = originalLocalsDbState;
    vi.restoreAllMocks();
  });

  const seed = (docs) => {
    store = docs;
  };

  describe('GET /api/transactions/:address', () => {
    it('returns only local transactions matching sender or recipient, sorted newest first', async () => {
      seed([
        { sender: ADDRESS, recipient: '0xabc', amount: '1', timestamp: 100 },
        { sender: '0xother', recipient: '0xelse', amount: '1', timestamp: 200 },
        { sender: '0xabc', recipient: ADDRESS, amount: '1', timestamp: 300 },
      ]);

      const res = await request(app).get(`/api/transactions/${ADDRESS}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].timestamp).toBe(300); // newest first
      expect(res.body.data[1].timestamp).toBe(100);
      expect(res.body.pagination.total).toBe(2);
    });

    it('paginates the local list with the same envelope shape as the Mongo path', async () => {
      seed(
        Array.from({ length: 5 }, (_, i) => ({
          sender: ADDRESS,
          recipient: '0xabc',
          amount: '1',
          timestamp: i,
        }))
      );

      const res = await request(app).get(`/api/transactions/${ADDRESS}?page=1&limit=2`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({
        total: 5,
        page: 1,
        limit: 2,
        totalPages: 3,
        hasNextPage: true,
      });
    });

    it('returns an empty array (not an error) when nothing matches', async () => {
      const res = await request(app).get(`/api/transactions/${ADDRESS}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/transactions/count', () => {
    it('returns the local file length, matching the Mongo path shape', async () => {
      seed([
        { sender: 'a', recipient: 'b', amount: '1', timestamp: 1 },
        { sender: 'c', recipient: 'd', amount: '1', timestamp: 2 },
      ]);

      const res = await request(app).get('/api/transactions/count');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, count: 2 });
    });
  });
});
