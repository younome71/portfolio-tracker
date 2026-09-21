const { sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    requestId: res.locals.requestId,
    path: req.path,
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  return sendError(res, statusCode, code, message);
};

module.exports = errorHandler;
