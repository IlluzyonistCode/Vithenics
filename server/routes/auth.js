const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { generateToken, authToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

const formatUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  profileImage: user.profile_image_url,
  onboardingCompleted: user.onboarding_completed === 1 || user.onboarding_completed === true,
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

    const [newUserRows] = await pool.execute(
      'SELECT id, email, first_name, last_name, profile_image_url, onboarding_completed, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatUser(newUserRows[0])
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
      'SELECT id, email, password_hash, first_name, last_name, profile_image_url, onboarding_completed, is_active FROM users WHERE email = ?',
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

    if (users.length > 0) {
      const userId = users[0].id;
      
      await pool.execute(
        'DELETE FROM password_reset_tokens WHERE user_id = ?',
        [userId]
      );

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await pool.execute(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, resetToken, expiresAt]
      );

      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    }
    res.json({
      message: 'If an account with this email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Password reset error:', error);

    res.status(500).json({ error: 'Password reset request failed' });
  }
});

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validateRequest
], async (req, res) => {
  try {
    const { token, password } = req.body;

    const [tokens] = await pool.execute(
      'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = tokens[0].user_id;

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );

    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    res.json({
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);

    res.status(500).json({ error: 'Password reset failed' });
  }
});

router.get('/verify', authToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, first_name, last_name, profile_image_url, onboarding_completed, created_at FROM users WHERE id = ?',
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
