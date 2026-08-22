'use strict';

/**
 * PriceCache.test.js
 * Verifies that PriceCache schema preserves all fields written by marketService.
 */

const PriceCache = require('./PriceCache');

describe('PriceCache Schema', () => {
  it('preserves all CoinGecko fields written by marketService', () => {
    const fullCoinData = {
      coinId: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      current_price: 60000,
      market_cap: 1200000000000,
      market_cap_rank: 1,
      fully_diluted_valuation: 1260000000000,
      total_volume: 30000000000,
      high_24h: 61000,
      low_24h: 59000,
      price_change_24h: 1000,
      price_change_percentage_24h: 1.69,
      price_change_percentage_1h_in_currency: 0.2,
      price_change_percentage_24h_in_currency: 1.69,
      price_change_percentage_7d_in_currency: 5.5,
      market_cap_change_24h: 20000000000,
      market_cap_change_percentage_24h: 1.7,
      circulating_supply: 19700000,
      total_supply: 19700000,
      max_supply: 21000000,
      ath: 73750,
      ath_change_percentage: -18.5,
      ath_date: '2024-03-14T07:10:36.635Z',
      atl: 67.81,
      atl_change_percentage: 88400,
      atl_date: '2013-07-06T00:00:00.000Z',
      last_updated: '2026-08-02T00:00:00.000Z',
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      sparkline_in_7d: { price: [59000, 59500, 60200, 60000] },
    };

    const doc = new PriceCache(fullCoinData).toObject();

    for (const [key, value] of Object.entries(fullCoinData)) {
      expect(doc[key], `Field ${key} should survive schema instantiation`).toEqual(value);
    }
  });

  it('declares the TTL index on updatedAt', () => {
    const indexes = PriceCache.schema.indexes();
    const ttlIndex = indexes.find(([fields]) => fields.updatedAt === 1);

    expect(ttlIndex).toBeDefined();
    expect(ttlIndex[1].expireAfterSeconds).toBe(300);
  });
});
