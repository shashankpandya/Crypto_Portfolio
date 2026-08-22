'use strict';

const { z } = require('zod');
const { ethers } = require('ethers');
const AppError = require('../lib/AppError');

/**
 * Reusable Zod schema for Ethereum addresses.
 */
const ethereumAddressSchema = z.string().trim().refine((val) => {
  return typeof val === 'string' && (ethers.isAddress(val) || ethers.isAddress(val.toLowerCase()));
}, {
  message: 'Invalid or missing Ethereum address.',
});

/**
 * Creates an Express validation middleware for params, query, and/or body schemas.
 * @param {{ params?: z.ZodSchema, query?: z.ZodSchema, body?: z.ZodSchema }} schemas
 */
function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        const parsedParams = schemas.params.parse(req.params);
        Object.assign(req.params, parsedParams);
      }
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.assign(req.query, parsedQuery);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError || err.name === 'ZodError') {
        const issues = err.issues || err.errors || [];
        const details = issues.map((e) => ({
          field: e.path ? e.path.join('.') : '',
          message: e.message,
        }));
        const primaryMessage = issues[0]?.message || 'Validation failed.';
        return next(AppError.badRequest(primaryMessage, { errors: details }));
      }
      return next(err);
    }
  };
}

module.exports = { validate, ethereumAddressSchema };
