'use strict';

/**
 * addressUtils.js
 * Utility functions for validating and normalizing Ethereum wallet addresses.
 */

const ETH_ADDRESS_REGEX = /^0x[a-f0-9]{40}$/;

/**
 * Validates and normalizes an Ethereum address.
 * Trims whitespace and converts to lowercase.
 * Returns normalized address string, or null if invalid or missing.
 *
 * @param {string} address
 * @returns {string|null}
 */
function normalizeAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const lower = address.trim().toLowerCase();
  if (!ETH_ADDRESS_REGEX.test(lower)) return null;
  return lower;
}

/**
 * Checks whether the input string is a valid 40-hex-character Ethereum address (with 0x/0X prefix).
 *
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(address) {
  return normalizeAddress(address) !== null;
}

module.exports = {
  normalizeAddress,
  isValidAddress,
};
