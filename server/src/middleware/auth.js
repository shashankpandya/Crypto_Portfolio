'use strict';

/**
 * auth.js — Authentication and authorization middleware
 *
 * Controlled by feature flag: process.env.AUTH_REQUIRED === 'true'
 */

const jwt = require('jsonwebtoken');
const { normalizeAddress } = require('../utils/addressUtils');

function requireAuth(req, res, next) {
  const isAuthRequired = process.env.AUTH_REQUIRED === 'true';
  if (!isAuthRequired) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Missing or malformed Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[requireAuth] JWT_SECRET is not configured.');
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const authAddress = normalizeAddress(decoded.address);

    if (!authAddress) {
      return res.status(401).json({ success: false, message: 'Invalid token payload.' });
    }

    req.user = { address: authAddress };

    // Ownership check if route contains walletAddress or address parameter
    const targetAddressParam = req.params.walletAddress || req.params.address;
    if (targetAddressParam) {
      const targetAddress = normalizeAddress(targetAddressParam);
      if (targetAddress && targetAddress !== authAddress) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this wallet resource.',
        });
      }
    }

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

module.exports = { requireAuth };
