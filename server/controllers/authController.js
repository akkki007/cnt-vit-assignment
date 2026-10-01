const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitize(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    regNo: user.regNo,
    department: user.department,
    avatarColor: user.avatarColor,
    initials: user.initials(),
    createdAt: user.createdAt,
  };
}

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password, role, regNo, department } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const user = await User.create({
    name,
    email,
    password,
    role,
    regNo,
    department,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
  });

  const token = signToken(user);
  res.status(201).json({ token, user: sanitize(user) });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitize(req.user) });
});

module.exports = { register, login, me, sanitize };
