const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

const formatExercise = (exercise) => ({
  id: exercise.id,
  name: exercise.name,
  description: exercise.description,
  muscleGroups: exercise.muscle_groups,
  difficultyLevel: exercise.difficulty_level,
  equipmentNeeded: exercise.equipment_needed,
  instructions: exercise.instructions,
  createdAt: exercise.created_at
});

const formatProgress = (progress) => ({
  id: progress.id,
  currentLevel: progress.current_level,
  maxReps: progress.max_reps,
  maxHoldTime: progress.max_hold_time,
  personalBest: progress.personal_best,
  notes: progress.notes,
  createdAt: progress.created_at,
  updatedAt: progress.updated_at
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  next();
};

const exerciseIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid exercise ID').toInt()
];

router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('muscleGroup').optional().isString().notEmpty(),
  query('search').optional().isString().notEmpty(),
  validateRequest
], async (req, res) => {
  try {
    const {
      difficulty,
      muscleGroup,
      search,
      page=1,
      limit=20
    } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = [];
    const queryParams = [];

    if (difficulty) {
      whereConditions.push('difficulty_level = ?');
      queryParams.push(difficulty);
    }

    if (muscleGroup) {
      whereConditions.push('JSON_CONTAINS(muscle_groups, ?)');
      queryParams.push(JSON.stringify(muscleGroup));
    }

    if (search) {
    whereConditions.push('(name LIKE ? OR description LIKE ?)');
      const searchTerm = `%${search}%`;

      queryParams.push(searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const exercisesQuery = `
      SELECT id, name, description, muscle_groups, difficulty_level, 
             equipment_needed, instructions, created_at
      FROM exercises ${whereClause} 
      ORDER BY name ASC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countQuery = `SELECT COUNT(*) as total FROM exercises ${whereClause}`;

    const [[exercises], [[{ total }]]] = await Promise.all([
      pool.execute(exercisesQuery, queryParams),
      pool.execute(countQuery, queryParams)
    ]);

    res.json({
      exercises: exercises.map(formatExercise),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get exercises error:', error);

    res.status(500).json({ error: 'Failed to get exercises' });
  }
});

router.get('/:id', exerciseIdValidator, validateRequest, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM exercises WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });

    res.json({ exercise: formatExercise(rows[0]) });
  } catch (error) {
    console.error('Get exercise error:', error);

    res.status(500).json({ error: 'Failed to get exercise' });
  }
});

router.get('/categories/muscle-groups', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT value 
      FROM exercises, JSON_TABLE(muscle_groups, '$[*]' COLUMNS(value VARCHAR(255) PATH '$')) as jt 
      ORDER BY value ASC
    `;

    const [results] = await pool.execute(query);

    const muscleGroups = results.map(row => row.value);

    res.json({ muscleGroups });
  } catch (error) {
    console.error('Get muscle groups error:', error);

    res.status(500).json({ error: 'Failed to get muscle groups' });
  }
});

router.get('/:id/progress', authToken, exerciseIdValidator, validateRequest, async (req, res) => {
  try {
    const { id: exerciseId } = req.params;
    const { id: userId } = req.user;

    const [rows] = await pool.execute(
      `SELECT * FROM user_progress WHERE user_id = ? AND exercise_id = ? AND progress_type = 'exercise'`,
      [userId, exerciseId]
    );

    if (rows.length === 0) return res.json({ progress: null });

    res.json({ progress: formatProgress(rows[0]) });
  } catch (error) {
    console.error('Get exercise progress error:', error);
    
    res.status(500).json({ error: 'Failed to get exercise progress' });
  }
});

router.put('/:id/progress', authToken, exerciseIdValidator, [
  body('currentLevel').optional().isInt({ min: 1 }),
  body('maxReps').optional().isInt({ min: 0 }),
  body('maxHoldTime').optional().isInt({ min: 0 }),
  body('personalBest').optional().isObject(),
  body('notes').optional().isString(),
  validateRequest
], async (req, res) => {
  try {
    const { id: exerciseId } = req.params;
    const { id: userId } = req.user;
    const { currentLevel, maxReps, maxHoldTime, personalBest, notes } = req.body;

    const [exercises] = await pool.execute('SELECT id FROM exercises WHERE id = ?', [exerciseId]);
    
    if (exercises.length === 0) return res.status(404).json({ error: 'Exercise not found' });

    const progressData = {
      user_id: userId,
      exercise_id: exerciseId,
      progress_type: 'exercise',
      current_level: currentLevel,
      max_reps: maxReps,
      max_hold_time: maxHoldTime,
      personal_best: personalBest ? JSON.stringify(personalBest) : undefined,
      notes: notes
    };

    const fieldsToInsert = Object.keys(progressData).filter(key => progressData[key] !== undefined);
    const fieldsToUpdate = fieldsToInsert.filter(key => !['user_id', 'exercise_id', 'progress_type'].includes(key));

    const query = `
      INSERT INTO user_progress (${fieldsToInsert.join(', ')})
      VALUES (${fieldsToInsert.map(() => '?').join(', ')})
      ON DUPLICATE KEY UPDATE
      ${fieldsToUpdate.map(field => `${field} = VALUES(${field})`).join(', ')}
      updated_at = CURRENT_TIMESTAMP
    `;

    const values = fieldsToInsert.map(key => progressData[key]);

    await pool.execute(query, values);

    res.json({ message: 'Exercise progress updated successfully' });
  } catch (error) {
    console.error('Update exercise progress error:', error);

    res.status(500).json({ error: 'Failed to update exercise progress' });
  }
});

module.exports = router;
