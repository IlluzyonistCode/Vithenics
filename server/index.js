const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');
const exerciseRoutes = require('./routes/exercises');
const workoutRoutes = require('./routes/workouts');
const progressionsRoutes = require('./routes/progressions');
const progressRoutes = require('./routes/progress');
const historyRoutes = require('./routes/history');
const { router: achievementsRoutes } = require('./routes/achievements');
const onboardingRoutes = require('./routes/onboarding');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://192.168.1.57:5173', 'http://localhost:5173', 'https://localhost'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/progressions', progressionsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Vithenics API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vithenics API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
