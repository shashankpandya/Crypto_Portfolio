'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { validate, ethereumAddressSchema } = require('../middleware/validate');
const {
  get,
  addCoin,
  removeCoin,
} = require('../controllers/watchlistController');
const { requireAuth } = require('../middleware/auth');
const { readLimiter, writeLimiter } = require('../middleware/rateLimiters');

const router = Router();

const walletParamSchema = {
  params: z.object({
    walletAddress: ethereumAddressSchema,
  }),
};

const addCoinSchema = {
  params: z.object({
    walletAddress: ethereumAddressSchema,
  }),
  body: z.object({
    coinId: z.string().trim().min(1, 'coinId is required in the request body.').max(100),
  }),
};

const removeCoinSchema = {
  params: z.object({
    walletAddress: ethereumAddressSchema,
    coinId: z.string().trim().min(1, 'coinId is required.').max(100),
  }),
};

// GET /api/watchlist/:walletAddress
router.get('/:walletAddress', readLimiter, requireAuth, validate(walletParamSchema), get);

// POST /api/watchlist/:walletAddress/coins  — body: { coinId }
router.post('/:walletAddress/coins', writeLimiter, requireAuth, validate(addCoinSchema), addCoin);

// DELETE /api/watchlist/:walletAddress/coins/:coinId
router.delete('/:walletAddress/coins/:coinId', writeLimiter, requireAuth, validate(removeCoinSchema), removeCoin);

module.exports = router;
