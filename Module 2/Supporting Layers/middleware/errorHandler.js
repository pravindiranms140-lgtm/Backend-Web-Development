const config = require('../config');
const AppError = require('../utils/AppError');

module.exports = function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const body = { error: err.message || 'Internal Server Error' };

  if (err.details) {
    body.details = err.details;
  }

  // Only leak stack traces outside production.
  if (config.nodeEnv !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};

module.exports.AppError = AppError;
