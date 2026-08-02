'use strict';

/**
 * marketService.test.js
 * Unit tests for marketService cache hit formatting and sorting.
 */

const PriceCache = require('../models/PriceCache');
const marketService = require('./marketService');

describe('MarketService', () => {
  it('formats cached documents with `id` property and removes DB internal fields on cache hit', async () => {
    // Instantiate raw cached documents as Mongoose objects / objects matching PriceCache shape
    const mockDbCoins = [
      {
        _id: '66ab12345678901234567890',
        coinId: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        current_price: 60000,
        market_cap: 1200000000000,
        market_cap_rank: 1,
        total_volume: 30000000000,
        high_24h: 61000,
        low_24h: 59000,
        price_change_24h: 1000,
        price_change_percentage_24h: 1.69,
        updatedAt: new Date(),
      },
      {
        _id: '66ab12345678901234567891',
        coinId: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
        current_price: 3300,
        market_cap: 400000000000,
        market_cap_rank: 2,
        total_volume: 15000000000,
        high_24h: 3400,
        low_24h: 3200,
        price_change_24h: 50,
        price_change_percentage_24h: 1.5,
        updatedAt: new Date(),
      },
    ];

    // Mock PriceCache.find().lean()
    const findSpy = vi.spyOn(PriceCache, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockDbCoins),
    });

    // Mock dbState singleton to indicate DB is connected
    const { dbState } = require('../config/db');
    const originalConnected = dbState.connected;
    dbState.connected = true;

    try {
      const result = await marketService.getCoins(2);

      expect(findSpy).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        expect.objectContaining({ sort: { market_cap_rank: 1 }, limit: 2 }),
      );

      expect(result).toHaveLength(2);

      // Verify item 1 formatting
      expect(result[0].id).toBe('bitcoin');
      expect(result[0]._id).toBeUndefined();
      expect(result[0].updatedAt).toBeUndefined();
      expect(result[0].market_cap_rank).toBe(1);

      // Verify item 2 formatting
      expect(result[1].id).toBe('ethereum');
      expect(result[1]._id).toBeUndefined();
      expect(result[1].updatedAt).toBeUndefined();
      expect(result[1].market_cap_rank).toBe(2);
    } finally {
      dbState.connected = originalConnected;
      findSpy.mockRestore();
    }
  });
});
