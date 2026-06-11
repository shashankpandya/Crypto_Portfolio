'use strict';

const { Router } = require('express');
const {
  getByAddress,
  getCount,
} = require('../controllers/transactionController');

const router = Router();

// GET /api/transactions/count
// Declared BEFORE /:address so Express does not treat "count" as an address param.
router.get('/count', getCount);

// GET /api/transactions/:address?page=1&limit=20
router.get('/:address', getByAddress);

module.exports = router;
