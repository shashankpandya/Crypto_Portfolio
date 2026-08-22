'use strict';

/**
 * marketController.test.js (P6-03)
 * Controller tests against the Mongo-backed PriceCache path — `dbState.connected`
 * is flipped true and `PriceCache.find` is mocked with a fresh cache hit, the
 * same pattern marketService.test.js already established. `getCoinDetails`
 * never touches Mongo (it's an uncached passthrough), so it's exercised via
 * a mocked axios instead. The JSON/no-cache fallback path is covered by P6-04.
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
  });
});
