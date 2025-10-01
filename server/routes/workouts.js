const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

const formatWorkout = (workout) => ({
  id: workout.id,
  name: workout.name,
  description: workout.description,
  workoutType: workout.workout_type,
  estimatedDuration: workout.estimated_duration,
  difficultyLevel: workout.difficulty_level,
  progressions: workout.progressions,
  createdAt: workout.created_at,
  updatedAt: workout.updated_at
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  next();
};

const workoutIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid workout ID').toInt()
];

router.get('/', authToken, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['strength', 'endurance', 'flexibility', 'mixed']),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  validateRequest
], async (req, res) => {
  try {
    const {
      type,
      difficulty,
      page=1,
      limit=20
    } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = [];
    const queryParams = [];

    if (type) {
      whereConditions.push('workout_type = ?');
      queryParams.push(type);
    }

    if (difficulty) {
      whereConditions.push('difficulty_level = ?');
      queryParams.push(difficulty);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const workoutsQuery = `
      SELECT * FROM workouts ${whereClause} 
      ORDER BY updated_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countQuery = `SELECT COUNT(*) as total FROM workouts ${whereClause}`;

    const [[workouts], [[{ total }]]] = await Promise.all([
      pool.execute(workoutsQuery, queryParams),
      pool.execute(countQuery, queryParams)
    ]);

    res.json({
      workouts: workouts.map(formatWorkout),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get workouts error:', error);

    res.status(500).json({ error: 'Failed to get workouts' });
  }
});

router.get('/:id', authToken, workoutIdValidator, validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT * FROM workouts WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Workout not found' });

    res.json({ workout: formatWorkout(rows[0]) });
  } catch (error) {
    console.error('Get workout error:', error);
    
    res.status(500).json({ error: 'Failed to get workout' });
  }
});

const validateExerciseIds = async (exerciseIds) => {
  if (!exerciseIds || exerciseIds.length === 0) return true;

  const placeholders = exerciseIds.map(() => '?').join(',');

  const [existing] = await pool.execute(
    `SELECT id FROM exercises WHERE id IN (${placeholders})`,
    exerciseIds
  );

  return existing.length === exerciseIds.length;
};

module.exports = router;
