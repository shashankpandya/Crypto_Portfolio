'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const {
  getCoins,
  getCoinDetails,
} = require('../controllers/marketController');

const router = Router();

const getCoinsSchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(250).optional(),
    // Comma-separated CoinGecko coin ids (P5-06) — batches an arbitrary set of
    // coins (e.g. watchlist entries outside the top-N) into one request.
    ids: z.string().trim().min(1).max(2000).optional(),
  }),
};

const getCoinDetailsSchema = {
  params: z.object({
    coinId: z.string().trim().min(1, 'coinId parameter is required.').max(100),
  }),
};

// GET /api/market/coins?limit=100
router.get('/coins', validate(getCoinsSchema), getCoins);

// GET /api/market/coins/:coinId
router.get('/coins/:coinId', validate(getCoinDetailsSchema), getCoinDetails);

module.exports = router;
