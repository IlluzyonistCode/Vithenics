const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');
const { checkAndAwardAchievements } = require('./achievements');

const router = express.Router();

const formatWorkoutHistoryEntry = (entry) => ({
  id: entry.id,
  workoutId: entry.workout_id,
  workoutName: entry.workout_name,
  exercisesCompleted: entry.exercises_completed,
  duration: entry.duration_minutes,
  notes: entry.notes,
  completedAt: entry.completed_at
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  next();
};

const historyIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid ID').toInt()
];

router.get(
  '/workouts',
  authToken,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const offset = (page - 1) * limit;

      const [history] = await pool.execute(
        `SELECT id, workout_name, completed_at, duration_minutes, notes
         FROM workout_history 
         WHERE user_id = ? 
         ORDER BY completed_at DESC 
         LIMIT ${limit} OFFSET ${offset}`,
        [userId]
      );

      const [[{ total }]] = await pool.execute(
        'SELECT COUNT(*) as total FROM workout_history WHERE user_id = ?',
        [userId]
      );

      const formattedHistory = history.map(entry => ({
        id: entry.id,
        workoutName: entry.workout_name,
        completedAt: entry.completed_at,
        duration: entry.duration_minutes,
        notes: entry.notes
      }));

      res.json({
        workoutHistory: formattedHistory,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get workout history error:', error);

      res.status(500).json({ error: 'Failed to get workout history' });
    }
  }
);

router.get('/workouts/:id', authToken, historyIdValidator, validateRequest, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM workout_history WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: 'Workout history entry not found' });

    res.json({
      workoutHistory: formatWorkoutHistoryEntry(rows[0])
    });
  } catch (error) {
    console.error('Failed to get workout history entry:', error);

    res.status(500).json({ error: 'Failed to get workout history entry' });
  }
});

router.post(
  '/workouts',
  authToken,
  [
    body('workoutId').optional().isInt({ min: 1 }),
    body('workoutName').trim().isLength({ min: 1, max: 100 }),
    body('exercisesCompleted').isArray(),
    body('duration').optional().isInt({ min: 1 }),
    body('duration_minutes').optional().isInt({ min: 1 }),
    body('notes').optional().trim().isLength({ max: 1000 }),
    validateRequest
  ],
  async (req, res) => {
    try {
      const {
        workoutId,
        workoutName,
        exercisesCompleted,
        duration,
        duration_minutes,
        notes,
      } = req.body;
      const userId = req.user.id;

      const durationValue = duration_minutes || duration;

      const [result] = await pool.execute(
        `INSERT INTO workout_history 
          (user_id, workout_id, workout_name, exercises_completed, duration_minutes, notes)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          workoutId || null,
          workoutName,
          JSON.stringify(exercisesCompleted),
          durationValue,
          notes || null
        ]
      );

      await checkAndAwardAchievements(userId);

      res.status(201).json({
        message: 'Workout successfully added to history',
        workoutHistory: {
          id: result.insertId,
          workoutId,
          workoutName,
          exercisesCompleted,
          duration: durationValue,
          notes
        }
      });
    } catch (error) {
      console.error('Failed to add workout to history:', error);

      res.status(500).json({ error: 'Failed to add workout to history' });
    }
  }
);

router.put('/workouts/:id', authToken, historyIdValidator, [
  body('workoutName').optional().trim().isLength({ min: 1, max: 100 }),
  body('exercisesCompleted').optional().isArray(),
  body('duration').optional().isInt({ min: 1 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { workoutName, exercisesCompleted, duration, notes } = req.body;

    const [existingEntries] = await pool.execute(
      'SELECT id FROM workout_history WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existingEntries.length === 0)
      return res.status(404).json({ error: 'Workout history entry not found' });

    const updates = {
      workout_name: workoutName,
      exercises_completed: exercisesCompleted ? JSON.stringify(exercisesCompleted) : undefined,
      duration_minutes: duration,
      notes
    };

    const updateFields = Object.keys(updates)
      .filter(key => updates[key] !== undefined)
      .map(key => `${key} = ?`);
    
    if (updateFields.length === 0)
      return res.status(400).json({ error: 'No fields to update' });    

    const updateValues = Object.values(updates).filter(value => value !== undefined);

    updateValues.push(id, req.user.id);

    await pool.execute(
      `UPDATE workout_history SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    res.json({ message: 'Workout history entry updated successfully' });
  } catch (error) {
    console.error('Failed to update workout history entry:', error);

    res.status(500).json({ error: 'Failed to update workout history entry' });
  }
});

router.delete('/workouts/:id', authToken, historyIdValidator, validateRequest, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM workout_history WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Workout history entry not found' });

    res.json({ message: 'Workout history entry deleted successfully' });
  } catch (error) {
    console.error('Failed to delete workout history entry:', error);

    res.status(500).json({ error: 'Failed to delete workout history entry' });
  }
});

router.get('/stats', authToken, [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year', 'all']),
  validateRequest
], async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const periodDays = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365
    };

    let whereCondition = 'WHERE user_id = ?';

    const queryParams = [req.user.id];

    if (period !== 'all') {
      whereCondition += ' AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      queryParams.push(periodDays[period]);
    }

    const overallStatsQuery = `
      SELECT COUNT(*) as total_workouts,
              SUM(duration_minutes) as total_duration,
             AVG(duration_minutes) as avg_duration,
             MIN(completed_at) as first_workout,
             MAX(completed_at) as last_workout
      FROM workout_history ${whereCondition}
    `;

    const weeklyFreqQuery = `
      SELECT DAYNAME(completed_at) as day_name, DAYOFWEEK(completed_at) as day_number, COUNT(*) as workout_count
      FROM workout_history ${whereCondition}
      GROUP BY DAYOFWEEK(completed_at), DAYNAME(completed_at)
      ORDER BY DAYOFWEEK(completed_at)
    `;

    const popularWorkoutsQuery = `
      SELECT workout_name, COUNT(*) as frequency, AVG(duration_minutes) as avg_duration
      FROM workout_history ${whereCondition}
      GROUP BY workout_name
      ORDER BY frequency DESC
      LIMIT 10
    `;

    const [
      [[stats]],
      [weeklyFrequency],
      [popularWorkouts]
    ] = await Promise.all([
      pool.execute(overallStatsQuery, queryParams),
      pool.execute(weeklyFreqQuery, queryParams),
      pool.execute(popularWorkoutsQuery, queryParams)
    ]);

    res.json({
      statistics: {
        period: period,
        totalWorkouts: stats.total_workouts || 0,
        totalDuration: stats.total_duration || 0,
        averageDuration: Math.round(stats.avg_duration || 0),
        firstWorkout: stats.first_workout,
        lastWorkout: stats.last_workout,
        weeklyFrequency: weeklyFrequency.map((day) => ({
          dayName: day.day_name,
          dayNumber: day.day_number,
          workoutCount: day.workout_count
        })),
        popularWorkouts: popularWorkouts.map((workout) => ({
          name: workout.workout_name,
          frequency: workout.frequency,
          averageDuration: Math.round(workout.avg_duration || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Failed to get statistics:', error);

    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
