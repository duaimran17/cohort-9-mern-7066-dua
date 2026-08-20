const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');

  const isInputError = err.name === 'ValidationError' || err.name === 'CastError';
  const statusCode =
    err.code === 11000 ? 409 :
    isInputError ? 400 :
    err.statusCode || 500;

  const clientMessage =
    statusCode >= 500 ? 'Something went wrong. Please try again later.' :
    err.code === 11000 ? 'Email already registered' :
    isInputError ? 'Invalid request data' :
    err.message;

  res.status(statusCode).json({ message: clientMessage });
};

module.exports = errorHandler;