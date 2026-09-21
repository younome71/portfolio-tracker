const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { sendError, sendSuccess } = require('../utils/apiResponse');

function signToken(user) {
  const payload = {
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      // Avoid user enumeration: same message style as login failure
      return sendError(res, 400, 'REGISTRATION_FAILED', 'Unable to register with these credentials');
    }

    const user = new User({
      name,
      email,
      password,
      role: role === 'child' ? 'child' : 'parent',
    });
    await user.save();

    const token = signToken(user);
    logger.info('User registered', { email, requestId: res.locals.requestId });
    return sendSuccess(res, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
  } catch (err) {
    logger.error(`Registration error: ${err.message}`, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 400, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 400, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const token = signToken(user);
    logger.info('User logged in', { email, requestId: res.locals.requestId });
    return sendSuccess(res, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error(`Login error: ${err.message}`, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};
