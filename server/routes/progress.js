const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

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

const formatAchievement = (achievement) => ({
  id: achievement.id,
  type: achievement.achievement_type,
  name: achievement.achievement_name,
  description: achievement.description,
  earnedAt: achievement.earned_at
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  next();
};

async function getAllAchievements() {
  const [achievements] = await pool.execute('SELECT * FROM achievements');

  return achievements;
}

async function getEarnedAchievementIds(userId) {
  const [earned] = await pool.execute('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);

  return earned.map(a => a.achievement_id);
}

async function checkAndAwardAchievements(userId) {
  try {
    const allAchievements = await getAllAchievements();
    const earnedAchievementIds = await getEarnedAchievementIds(userId);

    const [[stats]] = await pool.execute(
        `SELECT
            (SELECT COUNT(*) FROM workout_history WHERE user_id = ?) as total_workouts,
            (SELECT SUM(duration_minutes) FROM workout_history WHERE user_id = ?) as total_time,
            (SELECT COUNT(*) FROM user_progress WHERE user_id = ? AND progress_type = 'skill') as progressions_completed
        `,
        [userId, userId, userId]
    );
 
    const [history] = await pool.execute(
        'SELECT DISTINCT DATE(completed_at) as workout_date FROM workout_history WHERE user_id = ? ORDER BY workout_date DESC',
        [userId]
    );
      
    let streak = 0;

    if (history.length > 0) {
      streak = 1;

      let today = new Date();

      today.setHours(0, 0, 0, 0);
      
      let lastWorkoutDate = new Date(history[0].workout_date);

      lastWorkoutDate.setHours(0, 0, 0, 0);

      const diffTime = today - lastWorkoutDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        for (let i = 0; i < history.length - 1; i++) {
          const current = new Date(history[i].workout_date);
          const previous = new Date(history[i + 1].workout_date);
          const timeDiff = current.getTime() - previous.getTime();
          const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

          if (dayDiff === 1) streak++;

          else break;
        }
      }

      else streak = 0; 
    }

    stats.streak = streak;

    const connection = await pool.getConnection();

    await connection.beginTransaction();

    try {
      for (const achievement of allAchievements) {
        if (earnedAchievementIds.includes(achievement.id)) continue;

        let criteriaMet = false;

        switch (achievement.criteria_type) {
          case 'total_workouts':
            if (stats.total_workouts >= achievement.criteria_value) criteriaMet = true;

            break;

          case 'total_time':
            if (stats.total_time >= achievement.criteria_value) criteriaMet = true;

            break;

          case 'streak':
            if (stats.streak >= achievement.criteria_value) criteriaMet = true;

            break;

          case 'progressions_completed':
            if (stats.progressions_completed >= achievement.criteria_value) criteriaMet = true;

            break;
        }

        if (criteriaMet) {
          await connection.execute(
              'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
              [userId, achievement.id]
          );

          console.log(`User ${userId} earned achievement: ${achievement.name}`);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`Failed to check achievements for user ${userId}:`, error);
  }
}

router.get('/summary', authToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await checkAndAwardAchievements(userId);

    const skillsProgressQuery = pool.execute(
      `SELECT COUNT(*) as count
       FROM user_progress up JOIN skills s ON up.skill_id = s.id
       WHERE up.user_id = ? AND up.progress_type = 'skill' AND up.current_level > 0`,
      [userId]
    );

    const exercisesProgressQuery = pool.execute(
      `SELECT difficulty_level, COUNT(*) as count
       FROM user_progress up JOIN exercises e ON up.exercise_id = e.id
       WHERE up.user_id = ? AND up.progress_type = 'exercise'
       GROUP BY difficulty_level`,
      [userId]
    );

    const recentAchievementsQuery = pool.execute(
      `SELECT 
         a.id, 
         a.name AS achievement_name, 
         a.description, 
         a.criteria_type AS achievement_type, 
         ua.earned_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ? 
       ORDER BY ua.earned_at DESC 
       LIMIT 5`,
      [userId]
    );

    const workoutStatsQuery = pool.execute(
      `SELECT COUNT(*) as total_workouts,
              SUM(duration_minutes) as total_duration,
              AVG(duration_minutes) as avg_duration
       FROM workout_history WHERE user_id = ?`,
      [userId]
    );

    const recentWorkoutsQuery = pool.execute(
      `SELECT workout_name, duration_minutes, completed_at
       FROM workout_history
       WHERE user_id = ? ORDER BY completed_at DESC LIMIT 5`,
      [userId]
    );

    const [
      [skillsProgress],
      [exercisesProgress],
      [recentAchievements],
      [[workoutStats]],
      [recentWorkouts]
    ] = await Promise.all([
      skillsProgressQuery,
      exercisesProgressQuery,
      recentAchievementsQuery,
      workoutStatsQuery,
      recentWorkoutsQuery
    ]);

    const getCount = (arr, level) => arr.find(item => item.difficulty_level === level)?.count || 0;

    res.json({
      summary: {
        skills: skillsProgress[0].count,
        exercises: {
          beginner: getCount(exercisesProgress, 'beginner'),
          intermediate: getCount(exercisesProgress, 'intermediate'),
          advanced: getCount(exercisesProgress, 'advanced')
        },
        workouts: {
          total: workoutStats.total_workouts || 0,
          totalDuration: workoutStats.total_duration || 0,
          averageDuration: Math.round(workoutStats.avg_duration || 0)
        },
        recentAchievements: recentAchievements.map(formatAchievement),
        recentWorkouts: recentWorkouts.map(workout => ({
          name: workout.workout_name,
          duration: workout.duration_minutes,
          completedAt: workout.completed_at
        }))
      }
    });
  } catch (error) {
    console.error('Get progress summary error:', error);

    res.status(500).json({ error: 'Failed to get progress summary' });
  }
});

router.get('/item/:type/:id', authToken, [
  param('type').isIn(['skill', 'exercise']).withMessage('Type must be "skill" or "exercise"'),
  param('id').isInt({ min: 1 }).withMessage('Invalid item ID').toInt(),
  validateRequest
], async (req, res) => {
  try {
    const { type, id } = req.params;
    const idField = type === 'skill' ? 'skill_id' : 'exercise_id';

    const [rows] = await pool.execute(
      `SELECT * FROM user_progress WHERE user_id = ? AND ${idField} = ? AND progress_type = ?`,
      [req.user.id, id, type]
    );

    if (rows.length === 0) return res.json({ progress: null });

    res.json({ progress: formatProgress(rows[0]) });
  } catch (error) {
    console.error('Get item progress error:', error);

    res.status(500).json({ error: 'Failed to get item progress' });
  }
});

router.put(
  '/item/:type/:id',
  authToken,
  [
    body('progress').optional().isInt({ min: 0 }),
    body('completed').optional().isBoolean(),
    (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      next();
    },
  ],
  async (req, res) => {
    const { type, id } = req.params;
    const { progress, completed } = req.body;
    const userId = req.user.id;

    if (progress === undefined && completed === undefined)
      return res
        .status(400)
        .json({ error: 'At least one field to update must be provided' });

    try {
      const [existingProgress] = await pool.execute(
        'SELECT * FROM user_progress WHERE user_id = ? AND progress_type = ? AND item_id = ?',
        [userId, type, id]
      );

      if (existingProgress.length > 0) {
        const fieldsToUpdate = [];
        const values = [];

        if (progress !== undefined) {
          fieldsToUpdate.push('progress = ?');
          values.push(progress);
        }

        if (completed !== undefined) {
          fieldsToUpdate.push('completed = ?')
          values.push(completed);
        }

        values.push(userId, type, id);

        await pool.execute(
          `UPDATE user_progress SET ${fieldsToUpdate.join(
            ', '
          )} WHERE user_id = ? AND progress_type = ? AND item_id = ?`,
          values
        );
      } else {
        await pool.execute(
          'INSERT INTO user_progress (user_id, progress_type, item_id, progress, completed) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            type,
            id,
            progress !== undefined ? progress : 0,
            completed !== undefined ? completed : false
          ]
        );
      }
      
      if (req.params.type === 'skill')
        await checkAndAwardAchievements(req.user.id);

      res.json({ message: 'Progress updated successfully' });
    } catch (error) {
      console.error('Update progress error:', error);

      res.status(500).json({ error: 'Failed to update progress' });
    }
  }
);

router.get('/history', authToken, [
  query('type').optional().isIn(['skill', 'exercise', 'workout']),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('itemId').optional().isInt({ min: 1 }).toInt(),
  validateRequest
], async (req, res) => {
  try {
    const { type, period, itemId } = req.query;
    const periodDays = { week: 7, month: 30, quarter: 90, year: 365 };
    const days = periodDays[period] || 30;

    let query;
    let queryParams;
    let formatter;

    if (type === 'workout') {
      const where = ['user_id = ?', 'completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
      
      queryParams = [req.user.id, days];
      
      if (itemId) {
        where.push('workout_id = ?');
        queryParams.push(itemId);
      }

      query = `SELECT DATE(completed_at) as date,
                      COUNT(*) as workouts_count,
                      SUM(duration_minutes) as total_duration
               FROM workout_history WHERE ${where.join(' AND ')}
               GROUP BY DATE(completed_at) ORDER BY date ASC`;

      formatter = (e) => ({
        date: e.date,
        workoutsCount: e.workouts_count,
        totalDuration: e.total_duration || 0
      });
    } else if (type) {
      const where = ['user_id = ?', 'progress_type = ?', 'updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
      
      queryParams = [req.user.id, type, days];
      
      if (itemId) {
        where.push(`${type === 'skill' ? 'skill_id' : 'exercise_id'} = ?`);
        queryParams.push(itemId);
      }

      query = `SELECT DATE(updated_at) as date, AVG(current_level) as avg_level,
                      MAX(max_reps) as best_reps, MAX(max_hold_time) as best_hold_time
               FROM user_progress WHERE ${where.join(' AND ')}
               GROUP BY DATE(updated_at) ORDER BY date ASC`;

      formatter = (e) => ({
        date: e.date,
        averageLevel: Math.round(e.avg_level * 10) / 10,
        bestReps: e.best_reps || 0,
        bestHoldTime: e.best_hold_time || 0
      });
    } else {
      queryParams = [req.user.id, days];

      query = `SELECT DATE(updated_at) as date,
                      COUNT(CASE WHEN progress_type = 'skill' THEN 1 END) as skills_updated,
                      COUNT(CASE WHEN progress_type = 'exercise' THEN 1 END) as exercises_updated
               FROM user_progress WHERE user_id = ? AND updated_at >
               = DATE_SUB(NOW(), INTERVAL ? DAY)
               GROUP BY DATE(updated_at) ORDER BY date ASC`;

      formatter = (e) => ({
        date: e.date,
        skillsUpdated: e.skills_updated,
        exercisesUpdated: e.exercises_updated
      });
    }

    const [history] = await pool.execute(query, queryParams);

    res.json({ history: history.map(formatter) });
  } catch (error) {
    console.error('Get progress history error:', error);
    
    res.status(500).json({ error: 'Failed to get progress history' });
  }
});

router.post('/achievement', authToken, [
  body('type').trim().isLength({ min: 1, max: 50 }),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  validateRequest
], async (req, res) => {
  try {
    const { type, name, description } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_type = ? AND achievement_name = ?',
      [req.user.id, type, name]
    );

    if (existing.length > 0) return res.status(409).json({ error: 'Achievement already exists' });

    const [result] = await pool.execute(
      'INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description) VALUES (?, ?, ?, ?)',
      [req.user.id, type, name, description || null]
    );

    res.status(201).json({
      message: 'Achievement added successfully',
      achievement: {
        id: result.insertId,
        type,
        name,
        description
      }
    });
  } catch (error) {
    console.error('Add achievement error:', error);

    res.status(500).json({ error: 'Failed to add achievement' });
  }
});

router.get('/achievements', authToken, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isString().notEmpty(),
  validateRequest
], async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = ['user_id = ?'];
    const queryParams = [req.user.id];

    if (type) {
      whereConditions.push('achievement_type = ?');
      queryParams.push(type);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const achievementsQuery = `
      SELECT
        a.id,
        a.criteria_type AS achievement_type,
        a.name AS achievement_name,
        a.description,
        ua.earned_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      ${whereClause}
      ORDER BY ua.earned_at DESC
      LIMIT ${limit} OFFSET ${offset}`;
    const countQuery = `SELECT COUNT(*) as total FROM user_achievements ${whereClause}`;

    const [[achievements], [[{ total }]]] = await Promise.all([
      pool.execute(achievementsQuery, queryParams),
      pool.execute(countQuery, queryParams)
    ]);

    res.json({
      achievements: achievements.map(formatAchievement),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);

    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

module.exports = router;
