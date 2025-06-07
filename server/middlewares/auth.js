const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const isParent = (req, res, next) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ msg: 'Access denied. Parent role required' });
  }
  next();
};

module.exports = { auth, isParent };
