/**
 * marketService.js
 * Fetches coin market data from CoinGecko and caches the results in MongoDB.
 * Cached data is considered fresh for CACHE_TTL_MS (5 minutes by default).
 */

'use strict';

const axios   = require('axios');
const PriceCache = require('../models/PriceCache');
const { dbState } = require('../config/db');
const logger    = require('../lib/logger');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COINGECKO_MARKETS_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const CACHE_TTL_MS          = 5 * 60 * 1000; // 5 minutes
const DEFAULT_VS_CURRENCY   = 'usd';
const DEFAULT_ORDER         = 'market_cap_desc';

// ---------------------------------------------------------------------------
// MarketService
// ---------------------------------------------------------------------------
class MarketService {
  // -------------------------------------------------------------------------
  // getCoins
  // Returns up to `limit` coins.  Serves from the MongoDB cache when the
  // data is still fresh; otherwise fetches from CoinGecko, updates the
  // cache, and returns the fresh data.
  //
  // @param {number} limit  – Maximum number of coins to return (default 100).
  // @returns {Promise<Array>} Array of coin market objects.
  // -------------------------------------------------------------------------
  async getCoins(limit = 100) {
    // -----------------------------------------------------------------------
    // 1. Check the cache (only if MongoDB is connected).
    // -----------------------------------------------------------------------
    if (dbState && dbState.connected) {
      try {
        const cacheThreshold = new Date(Date.now() - CACHE_TTL_MS);

        const cachedCoins = await PriceCache.find(
          { updatedAt: { $gte: cacheThreshold } },
          null,
          { sort: { market_cap_rank: 1 }, limit },
        ).lean();

        if (cachedCoins.length >= limit) {
          logger.info({ count: cachedCoins.length }, `[MarketService] Serving ${cachedCoins.length} coins from cache.`);
          return cachedCoins.map(({ _id, updatedAt, coinId, ...rest }) => ({
            id: coinId,
            ...rest,
          }));
        }
      } catch (err) {
        logger.error({ err }, `[MarketService] Failed to read from PriceCache (non-fatal): ${err.message}`);
      }
    }

    // -----------------------------------------------------------------------
    // 2. Cache miss (or stale, or DB offline) – fetch from CoinGecko.
    // -----------------------------------------------------------------------
    logger.info('[MarketService] Cache miss – fetching from CoinGecko…');

    const apiKey = process.env.COINGECKO_API_KEY || process.env.VITE_COINGECKO_API_KEY;
    const headers = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    let coins;
    try {
      const response = await axios.get(COINGECKO_MARKETS_URL, {
        headers,
        params: {
          vs_currency:            DEFAULT_VS_CURRENCY,
          order:                  DEFAULT_ORDER,
          per_page:               limit,
          page:                   1,
          sparkline:              true,
          price_change_percentage: '1h,24h,7d',
        },
        timeout: 10_000, // 10 s
      });

      coins = response.data;
    } catch (err) {
      const status  = err.response?.status;
      const message = err.response?.data?.error ?? err.message;
      logger.error({ err, status }, `[MarketService] CoinGecko request failed (HTTP ${status}): ${message}`);
      throw new Error(`CoinGecko API error: ${message}`);
    }

    if (!Array.isArray(coins) || coins.length === 0) {
      throw new Error('CoinGecko returned an empty or invalid response.');
    }

    // -----------------------------------------------------------------------
    // 3. Upsert fresh data into the PriceCache collection (only if DB connected).
    // -----------------------------------------------------------------------
    if (dbState && dbState.connected) {
      const now = new Date();

      const ops = coins.map((coin) => ({
        updateOne: {
          filter: { coinId: coin.id },
          update: {
            $set: {
              coinId:                              coin.id,
              symbol:                              coin.symbol,
              name:                                coin.name,
              image:                               coin.image,
              current_price:                       coin.current_price,
              market_cap:                          coin.market_cap,
              market_cap_rank:                     coin.market_cap_rank,
              fully_diluted_valuation:             coin.fully_diluted_valuation,
              total_volume:                        coin.total_volume,
              high_24h:                            coin.high_24h,
              low_24h:                             coin.low_24h,
              price_change_24h:                    coin.price_change_24h,
              price_change_percentage_24h:         coin.price_change_percentage_24h,
              price_change_percentage_1h_in_currency:  coin.price_change_percentage_1h_in_currency,
              price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency,
              price_change_percentage_7d_in_currency:  coin.price_change_percentage_7d_in_currency,
              market_cap_change_24h:               coin.market_cap_change_24h,
              market_cap_change_percentage_24h:    coin.market_cap_change_percentage_24h,
              circulating_supply:                  coin.circulating_supply,
              total_supply:                        coin.total_supply,
              max_supply:                          coin.max_supply,
              ath:                                 coin.ath,
              ath_change_percentage:               coin.ath_change_percentage,
              ath_date:                            coin.ath_date,
              atl:                                 coin.atl,
              atl_change_percentage:               coin.atl_change_percentage,
              atl_date:                            coin.atl_date,
              last_updated:                        coin.last_updated,
              sparkline_in_7d:                     coin.sparkline_in_7d,
              updatedAt:                           now,
            },
          },
          upsert: true,
        },
      }));

      try {
        const result = await PriceCache.bulkWrite(ops, { ordered: false });
        logger.info(
          { upsertedCount: result.upsertedCount, modifiedCount: result.modifiedCount },
          `[MarketService] Cache updated – upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`,
        );
      } catch (err) {
        // Non-fatal: we still have fresh data to return even if the cache write fails.
        logger.error({ err }, '[MarketService] Failed to update PriceCache');
      }
    }

    return coins;
  }

  // -------------------------------------------------------------------------
  // getCoinsByIds
  // Batches an arbitrary set of coin ids into a single CoinGecko request
  // (P5-06) — used for watchlist entries outside the top-N `getCoins()`
  // window. Not cached: id sets are per-user/per-watchlist and would not
  // benefit from the same top-N PriceCache the dashboard listing uses.
  //
  // @param {string[]} ids  – CoinGecko coin ids.
  // @returns {Promise<Array>} Array of coin market objects (may be shorter
  //   than `ids` if some ids don't exist — CoinGecko silently omits them).
  // -------------------------------------------------------------------------
  async getCoinsByIds(ids) {
    const apiKey = process.env.COINGECKO_API_KEY || process.env.VITE_COINGECKO_API_KEY;
    const headers = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    try {
      const response = await axios.get(COINGECKO_MARKETS_URL, {
        headers,
        params: {
          vs_currency: DEFAULT_VS_CURRENCY,
          ids:         ids.join(','),
          sparkline:   false,
        },
        timeout: 10_000,
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      const status  = err.response?.status;
      const message = err.response?.data?.error ?? err.message;
      logger.error({ err, status }, `[MarketService] CoinGecko getCoinsByIds failed (HTTP ${status}): ${message}`);
      throw new Error(`CoinGecko API error: ${message}`);
    }
  }
}

// Export a singleton.
module.exports = new MarketService();
