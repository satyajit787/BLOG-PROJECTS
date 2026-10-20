const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// middleware to verify jwt access token
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // check if authorization header exists and starts with Bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token is missing or invalid' });
    }

    const token = authHeader.split(' ')[1];

    // verify access token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // fetch user details (without password)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found or token invalid' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token has expired. Please refresh token or login again.' });
    }
    return res.status(401).json({ message: 'Invalid or malformed access token' });
  }
};

module.exports = authMiddleware;
