const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');
const { sendEmailVerificationCode } = require('../utils/email');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

const formatProfile = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  dateOfBirth: user.date_of_birth,
  gender: user.gender,
  height: user.height,
  weight: user.weight,
  profileImage: user.profile_image_url,
  createdAt: user.created_at
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  next();
};

router.get('/profile', authToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, email, first_name, last_name, date_of_birth, gender, 
              height, weight, profile_image_url, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ user: formatProfile(rows[0]) });
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

router.put('/profile', authToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  body('dateOfBirth').optional().isISO8601().toDate(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('height').optional().isFloat({ min: 0, max: 300 }),
  body('weight').optional().isFloat({ min: 0, max: 500 }),
  body('fitnessLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
  validateRequest
], async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, height, weight, fitnessLevel } = req.body;

    const updates = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      gender: gender,
      height: height,
      weight: weight
    };

    const updateFields = Object.keys(updates)
      .filter(key => updates[key] !== undefined)
      .map(key => `${key} = ?`);

    if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const updateValues = Object.values(updates).filter(value => value !== undefined);

    updateValues.push(req.user.id);

    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    await pool.execute(query, updateValues);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);

    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/change-password', authToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validateRequest
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isValidPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);

    if (!isValidPassword) return res.status(400).json({ error: 'Current password is incorrect' });

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.post('/profile-image', authToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const profileImage = `/uploads/${req.file.filename}`;

    await pool.execute(
      'UPDATE users SET profile_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [profileImage, req.user.id]
    );

    res.json({
      message: 'Profile image updated successfully',
      profileImage
    });
  } catch (error) {
    console.error('Update profile image error:', error);

    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

router.delete('/profile-image', authToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE users SET profile_image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Profile image removed successfully' });
  } catch (error) {
    console.error('Remove profile image error:', error);

    res.status(500).json({ error: 'Failed to remove profile image' });
  }
});

router.delete('/account', authToken, [
  body('password').notEmpty().withMessage('Password is required for account deletion'),
  validateRequest
], async (req, res) => {
  try {
    const { password } = req.body;

    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isValidPassword = await bcrypt.compare(password, rows[0].password_hash);
    
    if (!isValidPassword) return res.status(400).json({ error: 'Password is incorrect' });

    await pool.execute(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);

    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.post('/request-email-change', authToken, [
  body('newEmail').isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
  validateRequest
], async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [newEmail, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already in use' });
    }

    const [users] = await pool.execute(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentEmail = users[0].email;

    if (newEmail === currentEmail) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    await pool.execute(
      'DELETE FROM email_verification_tokens WHERE user_id = ?',
      [userId]
    );

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await pool.execute(
      'INSERT INTO email_verification_tokens (user_id, new_email, token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, newEmail, verificationCode, expiresAt]
    );

    try {
      await sendEmailVerificationCode(newEmail, verificationCode);
    } catch (emailError) {
      console.error('Failed to send email verification code:', emailError);
      return res.status(500).json({ error: 'Failed to send verification code' });
    }

    res.json({
      message: 'Verification code has been sent to your new email address'
    });
  } catch (error) {
    console.error('Request email change error:', error);

    res.status(500).json({ error: 'Failed to request email change' });
  }
});

router.post('/verify-email-change', authToken, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
  validateRequest
], async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const [tokens] = await pool.execute(
      'SELECT new_email FROM email_verification_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW()',
      [userId, code]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const newEmail = tokens[0].new_email;

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [newEmail, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already in use' });
    }

    await pool.execute(
      'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newEmail, userId]
    );

    await pool.execute(
      'DELETE FROM email_verification_tokens WHERE user_id = ?',
      [userId]
    );

    res.json({
      message: 'Email address has been updated successfully',
      user: {
        email: newEmail
      }
    });
  } catch (error) {
    console.error('Verify email change error:', error);

    res.status(500).json({ error: 'Failed to verify email change' });
  }
});

router.get('/stats', authToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [[stats]] = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM workout_history WHERE user_id = ?) as totalWorkouts,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM workout_history WHERE user_id = ?) as totalWorkoutTime,
        (SELECT COUNT(DISTINCT skill_id) FROM user_progress WHERE user_id = ? AND progress_type = 'skill') as skillsInProgress,
        (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) as achievementsEarned
      `,
      [userId, userId, userId, userId]
    );

    const [history] = await pool.execute(
      'SELECT DISTINCT DATE(completed_at) as workout_date FROM workout_history WHERE user_id = ? ORDER BY workout_date DESC',
      [userId]
    );
    
    let currentStreak = 0;

    if (history.length > 0) {
      currentStreak = 1;

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const lastWorkoutDate = new Date(history[0].workout_date);

      lastWorkoutDate.setHours(0, 0, 0, 0);

      const diffTime = today - lastWorkoutDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1)
        for (let i = 0; i < history.length - 1; i++) {
          const current = new Date(history[i].workout_date);
          const previous = new Date(history[i + 1].workout_date);
          const timeDiff = current.getTime() - previous.getTime();
          const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

          if (dayDiff === 1) currentStreak++;
          
          else break;
        }
      } else currentStreak = 0;

    res.json({
      stats: {
        totalWorkouts: stats.totalWorkouts || 0,
        totalWorkoutTime: stats.totalWorkoutTime || 0,
        skillsInProgress: stats.skillsInProgress || 0,
        achievementsEarned: stats.achievementsEarned || 0,
        currentStreak
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);

    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

module.exports = router;
