'use strict';

const axios         = require('axios');
const marketService = require('../services/marketService');
const AppError      = require('../lib/AppError');
const { asyncHandler } = require('../middleware/errorHandler');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COINGECKO_COIN_URL = 'https://api.coingecko.com/api/v3/coins';
const DEFAULT_LIMIT      = 100;
const MAX_LIMIT          = 250;

// ---------------------------------------------------------------------------
// getCoins
// GET /api/market/coins
// Query params: limit (default 100, max 250)
// Delegates to marketService which handles caching transparently.
// ---------------------------------------------------------------------------
async function getCoins(req, res) {
  // P5-06: explicit id batch (e.g. watchlist entries outside the top-N)
  // takes a separate, uncached path — the PriceCache is keyed to the top-N
  // by rank, not to arbitrary id sets, so mixing them would either miss
  // cache entirely or return stale/wrong coins for ids outside that window.
  if (req.query.ids) {
    const ids = req.query.ids
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean);

    if (ids.length === 0) {
      throw AppError.badRequest('ids parameter must contain at least one coin id.');
    }

    const coins = await marketService.getCoinsByIds(ids);

    return res.status(200).json({
      success: true,
      count:   coins.length,
      data:    coins,
    });
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT),
  );

  const coins = await marketService.getCoins(limit);

  return res.status(200).json({
    success: true,
    count:   coins.length,
    data:    coins,
  });
}

// ---------------------------------------------------------------------------
// getCoinDetails
// GET /api/market/coins/:coinId
// Fetches full coin details directly from CoinGecko - no cache.
// ---------------------------------------------------------------------------
async function getCoinDetails(req, res) {
  const coinId = req.params.coinId?.toLowerCase().trim();

  if (!coinId) {
    throw AppError.badRequest('coinId parameter is required.');
  }

  const apiKey = process.env.COINGECKO_API_KEY || process.env.VITE_COINGECKO_API_KEY;
  const headers = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  let response;
  try {
    response = await axios.get(`${COINGECKO_COIN_URL}/${coinId}`, {
      headers,
      params: {
        localization:   false,
        tickers:        false,
        market_data:    true,
        community_data: false,
        developer_data: false,
        sparkline:      false,
      },
      timeout: 10_000,
    });
  } catch (err) {
    const status  = err.response?.status;
    const message = err.response?.data?.error ?? err.message;

    if (status === 404) {
      throw AppError.notFound(`Coin not found: ${req.params.coinId}`);
    }
    if (status === 429) {
      throw AppError.rateLimit('CoinGecko rate limit reached. Please try again shortly.');
    }
    throw new AppError(message || 'Internal server error.', status || 500);
  }

  return res.status(200).json({ success: true, data: response.data });
}

module.exports = {
  getCoins: asyncHandler(getCoins),
  getCoinDetails: asyncHandler(getCoinDetails),
};
