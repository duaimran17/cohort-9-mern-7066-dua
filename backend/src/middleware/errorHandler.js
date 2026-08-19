const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.statusCode || 500).json({
    message: err.message || 'Something went wrong',
  });
};

module.exports = errorHandler;