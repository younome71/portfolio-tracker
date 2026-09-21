const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/apiResponse');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return sendError(res, 401, 'UNAUTHORIZED', 'No token, authorization denied');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.user?.id) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Token is not valid');
    }

    req.user = decoded.user;
    next();
  } catch (err) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token is not valid');
  }
};

const isParent = (req, res, next) => {
  if (req.user.role !== 'parent') {
    return sendError(res, 403, 'FORBIDDEN', 'Access denied. Parent role required');
  }
  next();
};

module.exports = { auth, isParent };
