'use strict';

/**
 * transactionController.test.js (P6-03)
 * Controller tests against the repository's Mongo branch — `dbState.connected`
 * is flipped true and the Mongoose `Transaction` model's query methods are
 * mocked (vi.spyOn). The JSON-fallback branch is covered by P6-04.
 */

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
