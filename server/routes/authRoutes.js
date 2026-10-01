const express = require('express');
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('role').isIn(['student', 'teacher']).withMessage('Role must be student or teacher.'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  login
);

router.get('/me', auth, me);

module.exports = router;
