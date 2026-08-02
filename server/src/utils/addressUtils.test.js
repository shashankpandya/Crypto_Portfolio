'use strict';

/**
 * addressUtils.test.js
 * Unit tests for address validation and normalization.
 */

const { normalizeAddress, isValidAddress } = require('./addressUtils');

describe('addressUtils', () => {
  const validLowercase = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';
  const validChecksum  = '0xcB9D0AA389456EB5a46C772F38B59c40b092eBcC';
  const validUppercase = '0XCB9D0AA389456EB5A46C772F38B59C40B092EBCC';

  describe('normalizeAddress', () => {
    it('normalizes lowercase valid address', () => {
      expect(normalizeAddress(validLowercase)).toBe(validLowercase);
    });

    it('normalizes checksum mixed-case address to lowercase', () => {
      expect(normalizeAddress(validChecksum)).toBe(validLowercase);
    });

    it('normalizes uppercase address to lowercase', () => {
      expect(normalizeAddress(validUppercase)).toBe(validLowercase);
    });

    it('trims leading/trailing whitespace', () => {
      expect(normalizeAddress(`  ${validChecksum}  `)).toBe(validLowercase);
    });

    it('returns null for invalid strings', () => {
      expect(normalizeAddress('invalid-address')).toBeNull();
      expect(normalizeAddress('0x123')).toBeNull();
      expect(normalizeAddress('')).toBeNull();
      expect(normalizeAddress(null)).toBeNull();
      expect(normalizeAddress(undefined)).toBeNull();
      expect(normalizeAddress(12345)).toBeNull();
    });
  });

  describe('isValidAddress', () => {
    it('returns true for valid addresses', () => {
      expect(isValidAddress(validLowercase)).toBe(true);
      expect(isValidAddress(validChecksum)).toBe(true);
    });

    it('returns false for invalid addresses', () => {
      expect(isValidAddress('not-an-address')).toBe(false);
      expect(isValidAddress('0x123')).toBe(false);
    });
  });
});
