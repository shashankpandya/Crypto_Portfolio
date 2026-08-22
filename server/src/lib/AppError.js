'use strict';

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {object} [details]
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isOperational = true;
    if (details) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request.', details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized.', details = null) {
    return new AppError(message, 401, details);
  }

  static forbidden(message = 'Forbidden.', details = null) {
    return new AppError(message, 403, details);
  }

  static notFound(message = 'Not found.', details = null) {
    return new AppError(message, 404, details);
  }

  static rateLimit(message = 'Too many requests.', details = null) {
    return new AppError(message, 429, details);
  }

  static serviceUnavailable(message = 'Service unavailable.', details = null) {
    return new AppError(message, 503, details);
  }

  static internal(message = 'Internal server error.', details = null) {
    return new AppError(message, 500, details);
  }
}

module.exports = AppError;
