'use strict';

const { Router } = require('express');
const {
  get,
  addCoin,
  removeCoin,
} = require('../controllers/watchlistController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/watchlist/:walletAddress
router.get('/:walletAddress', requireAuth, get);

// POST /api/watchlist/:walletAddress/coins  — body: { coinId }
router.post('/:walletAddress/coins', requireAuth, addCoin);

// DELETE /api/watchlist/:walletAddress/coins/:coinId
router.delete('/:walletAddress/coins/:coinId', requireAuth, removeCoin);

module.exports = router;
