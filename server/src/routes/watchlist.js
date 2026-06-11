'use strict';

const { Router } = require('express');
const {
  get,
  addCoin,
  removeCoin,
} = require('../controllers/watchlistController');

const router = Router();

// GET /api/watchlist/:walletAddress
router.get('/:walletAddress', get);

// POST /api/watchlist/:walletAddress/coins  — body: { coinId }
router.post('/:walletAddress/coins', addCoin);

// DELETE /api/watchlist/:walletAddress/coins/:coinId
router.delete('/:walletAddress/coins/:coinId', removeCoin);

module.exports = router;
