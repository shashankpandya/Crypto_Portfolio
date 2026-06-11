'use strict';

const { Router } = require('express');
const {
  getCoins,
  getCoinDetails,
} = require('../controllers/marketController');

const router = Router();

// GET /api/market/coins?limit=100
router.get('/coins', getCoins);

// GET /api/market/coins/:coinId
router.get('/coins/:coinId', getCoinDetails);

module.exports = router;
