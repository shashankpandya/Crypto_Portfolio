'use strict';

/**
 * routes/auth.js
 * Auth route module: nonce + SIWE verify endpoints.
 */

const express = require('express');
const { getNonce, verify } = require('../controllers/authController');

const router = express.Router();

// GET /api/auth/nonce?address=0x…
router.get('/nonce', getNonce);

// POST /api/auth/verify  body: { message, signature }
router.post('/verify', verify);

module.exports = router;
