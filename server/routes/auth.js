const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { generateToken, authToken } = require('../middleware/auth');

const router = express.Router();

const formatUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  profileImage: user.profile_image_url,
  createdAt: user.created_at
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  next();
};

router.post('/register', [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  validateRequest
], async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) return res.status(409).json({ error: 'A user with this email already exists' });

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, firstName || null, lastName || null]
    );

    const userId = result.insertId;
    const token = generateToken(userId, email);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
], async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, first_name, last_name, profile_image_url, is_active FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];

    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  validateRequest
], async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length > 0)
      console.log(`Password reset requested for user: ${email}`);

    res.json({
      message: 'If an account with this email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Password reset error:', error);

    res.status(500).json({ error: 'Password reset request failed' });
  }
});

router.get('/verify', authToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, first_name, last_name, profile_image_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];

    res.json({ user: formatUser(user) });
  } catch (error) {
    console.error('Token verification error:', error);
    
    res.status(500).json({ error: 'Token verification failed' });
  }
});

module.exports = router;
