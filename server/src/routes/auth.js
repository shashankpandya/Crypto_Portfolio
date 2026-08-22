'use strict';

/**
 * routes/auth.js
 * Auth route module: nonce + SIWE verify endpoints.
 */

const express = require('express');
const { z } = require('zod');
const { validate, ethereumAddressSchema } = require('../middleware/validate');
const { getNonce, verify } = require('../controllers/authController');

const router = express.Router();

const nonceQuerySchema = {
  query: z.object({
    address: ethereumAddressSchema,
  }),
};

const verifyBodySchema = {
  body: z.object({
    message: z.string({ required_error: 'message is required.' }).min(1, 'message is required.'),
    signature: z.string({ required_error: 'signature is required.' }).min(1, 'signature is required.'),
  }),
};

// GET /api/auth/nonce?address=0x…
router.get('/nonce', validate(nonceQuerySchema), getNonce);

// POST /api/auth/verify  body: { message, signature }
router.post('/verify', validate(verifyBodySchema), verify);

module.exports = router;
