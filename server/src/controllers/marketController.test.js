'use strict';

/**
 * marketController.test.js (P6-03 / P6-04)
 * P6-03: controller tests against the Mongo-backed PriceCache path —
 * `dbState.connected` is flipped true and `PriceCache.find` is mocked with a
 * fresh cache hit, the same pattern marketService.test.js already
 * established. `getCoinDetails` never touches Mongo (it's an uncached
 * passthrough), so it's exercised via a mocked axios instead.
 * P6-04: the no-cache fallback branch (dbState.connected = false).
 */

const request = require('supertest');
const axios = require('axios');
const app = require('../app');
const PriceCache = require('../models/PriceCache');
const { dbState } = require('../config/db');

describe('marketController — Mongo cache path (P6-03)', () => {
  let originalConnected;

  beforeEach(() => {
    originalConnected = dbState.connected;
    dbState.connected = true;
  });

  afterEach(() => {
    dbState.connected = originalConnected;
    vi.restoreAllMocks();
  });

  describe('GET /api/market/coins', () => {
    it('serves a fresh cache hit from PriceCache with the id-mapped, DB-field-stripped shape', async () => {
      vi.spyOn(PriceCache, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: 'x',
            coinId: 'bitcoin',
            symbol: 'btc',
            market_cap_rank: 1,
            current_price: 60000,
            updatedAt: new Date(),
          },
        ]),
      });

      const res = await request(app).get('/api/market/coins?limit=1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].id).toBe('bitcoin');
      expect(res.body.data[0]).not.toHaveProperty('_id');
      expect(res.body.data[0]).not.toHaveProperty('coinId');
    });

    it('rejects a limit above 250 with 400 before ever touching Mongo', async () => {
      const findSpy = vi.spyOn(PriceCache, 'find');
      const res = await request(app).get('/api/market/coins?limit=999');
      expect(res.status).toBe(400);
      expect(findSpy).not.toHaveBeenCalled();
    });

    it('routes ?ids= through the uncached id-batch path, bypassing PriceCache entirely (P5-06)', async () => {
      const findSpy = vi.spyOn(PriceCache, 'find');
      vi.spyOn(axios, 'get').mockResolvedValue({
        data: [{ id: 'bitcoin' }, { id: 'ethereum' }],
      });

      const res = await request(app).get('/api/market/coins?ids=bitcoin,ethereum');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data.map((c) => c.id)).toEqual(['bitcoin', 'ethereum']);
      expect(findSpy).not.toHaveBeenCalled();
    });

    it('lower-cases and trims ids and de-duplicates whitespace-only entries', async () => {
      const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({ data: [] });

      await request(app).get('/api/market/coins?ids= Bitcoin ,, Ethereum ');

      expect(getSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: expect.objectContaining({ ids: 'bitcoin,ethereum' }) })
      );
    });
  });

  describe('GET /api/market/coins/:coinId', () => {
    it('returns coin detail data from the CoinGecko passthrough (never touches Mongo)', async () => {
      const findSpy = vi.spyOn(PriceCache, 'find');
      vi.spyOn(axios, 'get').mockResolvedValue({ data: { id: 'bitcoin', name: 'Bitcoin' } });

      const res = await request(app).get('/api/market/coins/bitcoin');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { id: 'bitcoin', name: 'Bitcoin' } });
      expect(findSpy).not.toHaveBeenCalled();
    });

    it('maps a CoinGecko 404 to a 404 AppError', async () => {
      vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 404 } });

      const res = await request(app).get('/api/market/coins/not-a-real-coin');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('maps a CoinGecko 429 to a 429 rate-limit AppError', async () => {
      vi.spyOn(axios, 'get').mockRejectedValue({ response: { status: 429 } });

      const res = await request(app).get('/api/market/coins/bitcoin');

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
    });

    it('falls back to a 500 for a network-level failure with no HTTP response at all', async () => {
      vi.spyOn(axios, 'get').mockRejectedValue(new Error('ECONNRESET'));

      const res = await request(app).get('/api/market/coins/bitcoin');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// P6-04 — no-cache fallback branch (dbState.connected = false). marketService
// reads the config/db.js `dbState` singleton directly (not via app.locals),
// and unlike jsonStore's destructured readJson/writeJson, dbState is a
// mutable object reference — mutating `dbState.connected` here IS visible to
// marketService, so no filesystem workaround is needed for this controller.
// ---------------------------------------------------------------------------
describe('marketController — no-cache fallback path (P6-04)', () => {
  let originalConnected;

  beforeEach(() => {
    originalConnected = dbState.connected;
    dbState.connected = false;
  });

  afterEach(() => {
    dbState.connected = originalConnected;
    vi.restoreAllMocks();
  });

  it('fetches directly from CoinGecko and skips the PriceCache read entirely', async () => {
    const findSpy = vi.spyOn(PriceCache, 'find');
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: [{ id: 'bitcoin', symbol: 'btc', market_cap_rank: 1, current_price: 60000 }],
    });

    const res = await request(app).get('/api/market/coins?limit=1');

    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe('bitcoin');
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('does not attempt a PriceCache write when the DB is disconnected', async () => {
    const bulkWriteSpy = vi.spyOn(PriceCache, 'bulkWrite');
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: [{ id: 'bitcoin', symbol: 'btc', market_cap_rank: 1, current_price: 60000 }],
    });

    const res = await request(app).get('/api/market/coins?limit=1');

    expect(res.status).toBe(200);
    expect(bulkWriteSpy).not.toHaveBeenCalled();
  });

  it('surfaces a CoinGecko outage as a 500, matching the cached-path error contract', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('ETIMEDOUT'));

    const res = await request(app).get('/api/market/coins?limit=1');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
