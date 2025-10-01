const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, email, is_active FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (users.length === 0) return res.status(401).json({ error: 'Invalid token or user not found' });

    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });

    else if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    
    else {
      console.error('Auth middleware error:', error);

      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authToken,
  generateToken
};
