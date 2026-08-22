'use strict';

/**
 * authController.js
 * Implements the SIWE (Sign-In With Ethereum) nonce + verify flow.
 *
 * Flow:
 *   1. GET  /api/auth/nonce?address=0x…  → server stores nonce for the address, returns it
 *   2. Client signs an EIP-4361 message containing the nonce via MetaMask
 *   3. POST /api/auth/verify { message, signature } → server recovers signer,
 *      validates nonce match + expiry, issues a signed JWT
 */

const crypto = require('crypto');
const jwt           = require('jsonwebtoken');
const { SiweMessage } = require('siwe');
const User          = require('../models/User');
const { normalizeAddress } = require('../utils/addressUtils');
const AppError      = require('../lib/AppError');
const { asyncHandler } = require('../middleware/errorHandler');

// ---------------------------------------------------------------------------
// Nonce store — in-memory Map: address → { nonce, expiresAt }
// Intentionally not persisted to DB; nonces are ephemeral by design.
// Server restart invalidates all outstanding nonces (acceptable: TTL is 5 min).
// ---------------------------------------------------------------------------
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const nonceStore   = new Map();

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function setNonce(address, nonce) {
  nonceStore.set(address, {
    nonce,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });
}

function consumeNonce(address) {
  const entry = nonceStore.get(address);
  if (!entry) return null;
  nonceStore.delete(address); // Single-use: consume immediately
  if (Date.now() > entry.expiresAt) return null; // Expired
  return entry.nonce;
}

// Exposed for tests
function _getNonceStore() {
  return nonceStore;
}

// ---------------------------------------------------------------------------
// GET /api/auth/nonce?address=0x…
// ---------------------------------------------------------------------------
async function getNonce(req, res) {
  const address = normalizeAddress(req.query.address);
  if (!address) {
    throw AppError.badRequest('Invalid or missing address query parameter.');
  }

  const nonce = generateNonce();
  setNonce(address, nonce);

  return res.status(200).json({ success: true, nonce });
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify
// Body: { message: string (EIP-4361 text), signature: string (0x…) }
// ---------------------------------------------------------------------------
async function verify(req, res) {
  const { message, signature } = req.body;

  if (!message || typeof message !== 'string') {
    throw AppError.badRequest('message is required.');
  }
  if (!signature || typeof signature !== 'string') {
    throw AppError.badRequest('signature is required.');
  }

  // Parse and verify the SIWE message
  let siweMessage;
  try {
    siweMessage = new SiweMessage(message);
  } catch {
    throw AppError.badRequest('Malformed SIWE message.');
  }

  // Recover the signer address
  let recoveredAddress;
  try {
    const fields = await siweMessage.verify({ signature });
    recoveredAddress = normalizeAddress(fields.data.address);
  } catch {
    throw AppError.unauthorized('Signature verification failed.');
  }

  if (!recoveredAddress) {
    throw AppError.unauthorized('Could not recover signer address.');
  }

  // Validate nonce — single-use, must match address, must not be expired
  const expectedNonce = consumeNonce(recoveredAddress);
  if (!expectedNonce) {
    throw AppError.unauthorized('Nonce is invalid, expired, or already used. Request a new nonce.');
  }
  if (siweMessage.nonce !== expectedNonce) {
    throw AppError.unauthorized('Nonce mismatch.');
  }

  // Upsert the user record (create on first login, update lastActive on subsequent logins)
  const { dbState } = req.app.locals ?? {};
  if (dbState && dbState.connected) {
    await User.findOneAndUpdate(
      { walletAddress: recoveredAddress },
      { lastActive: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  // Issue a JWT. Stateless — no session store needed.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw AppError.internal('Server misconfiguration.');
  }

  const token = jwt.sign(
    { address: recoveredAddress },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
  );

  return res.status(200).json({
    success: true,
    address: recoveredAddress,
    token,
  });
}

module.exports = {
  getNonce: asyncHandler(getNonce),
  verify: asyncHandler(verify),
  _getNonceStore,
  setNonce,
  consumeNonce,
};
