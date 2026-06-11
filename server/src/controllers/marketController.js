'use strict';

const axios         = require('axios');
const marketService = require('../services/marketService');

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
  try {
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
  } catch (err) {
    console.error('[marketController.getCoins]', err);

    if (err.message?.includes('429')) {
      return res.status(429).json({ success: false, message: 'CoinGecko rate limit reached. Please try again shortly.' });
    }

    return res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
  }
}

// ---------------------------------------------------------------------------
// getCoinDetails
// GET /api/market/coins/:coinId
// Fetches full coin details directly from CoinGecko - no cache.
// ---------------------------------------------------------------------------
async function getCoinDetails(req, res) {
  try {
    const coinId = req.params.coinId?.toLowerCase().trim();

    if (!coinId) {
      return res.status(400).json({ success: false, message: 'coinId parameter is required.' });
    }

    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      throw new Error('COINGECKO_API_KEY environment variable is not set.');
    }

    const response = await axios.get(`${COINGECKO_COIN_URL}/${coinId}`, {
      headers: {
        'x-cg-demo-api-key': apiKey,
        Accept: 'application/json',
      },
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

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error('[marketController.getCoinDetails]', err);

    const status  = err.response?.status;
    const message = err.response?.data?.error ?? err.message;

    if (status === 404) {
      return res.status(404).json({ success: false, message: `Coin not found: ${req.params.coinId}` });
    }
    if (status === 429) {
      return res.status(429).json({ success: false, message: 'CoinGecko rate limit reached. Please try again shortly.' });
    }

    return res.status(500).json({ success: false, message: message || 'Internal server error.' });
  }
}

module.exports = { getCoins, getCoinDetails };
