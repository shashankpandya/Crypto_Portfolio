'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { validate, ethereumAddressSchema } = require('../middleware/validate');
const {
  getByAddress,
  getCount,
} = require('../controllers/transactionController');

const router = Router();

const getByAddressSchema = {
  params: z.object({
    address: ethereumAddressSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

// GET /api/transactions/count
// Declared BEFORE /:address so Express does not treat "count" as an address param.
router.get('/count', getCount);

// GET /api/transactions/:address?page=1&limit=20
router.get('/:address', validate(getByAddressSchema), getByAddress);

module.exports = router;
