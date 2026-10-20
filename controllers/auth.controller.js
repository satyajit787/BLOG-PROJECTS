const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// POST /signup - register new user
const signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // check if user already exists with this email or username
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // hash the password before saving
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // assign role - default to 'user' unless explicitly provided as 'admin'
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole
    });

    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

// POST /login - authenticate user and return jwt access and refresh tokens
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // access token valid for 15 minutes
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // refresh token valid for 7 days
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// POST /refresh - issue new access token using valid refresh token
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found or token invalid' });
    }

    // generate fresh access token for 15 minutes
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      message: 'Access token refreshed successfully',
      accessToken: newAccessToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token has expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

module.exports = {
  signup,
  login,
  refresh
};
