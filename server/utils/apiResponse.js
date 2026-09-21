const { randomUUID } = require('crypto');

function sendError(res, statusCode, code, message, details = {}) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId: res.locals.requestId || null,
  });
}

function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    requestId: res.locals.requestId || null,
  });
}

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = {
  sendError,
  sendSuccess,
  requestIdMiddleware,
};
