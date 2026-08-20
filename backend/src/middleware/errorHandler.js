const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');

  const statusCode = err.statusCode || 500;

  
  const clientMessage =
    statusCode === 500 ? 'Something went wrong. Please try again later.' : err.message;

  res.status(statusCode).json({ message: clientMessage });
};

module.exports = errorHandler;