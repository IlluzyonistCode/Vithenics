const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

const formatSkill = (skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    progressions: skill.progressions,
    createdAt: skill.created_at
});

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

    next();
};

const skillIdValidator = [
    param('id').isInt({ min: 1 }).withMessage('Invalid skill ID').toInt()
];

router.get('/categories/list', authToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT DISTINCT category FROM skills WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`
        );

        const categories = rows.map(row => row.category);

        res.json({ categories });
    } catch (error) {
        console.error('Get skill categories error:', error);

        res.status(500).json({ error: 'Failed to retrieve skill categories' });
    }
});

router.get('/user/progress', authToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT skill_id, current_level, personal_best FROM user_progress WHERE user_id = ? AND progress_type = 'skill'`,
            [req.user.id]
        );

        const progress = rows.reduce((acc, row) => {
            acc[row.skill_id] = {
                current_level: row.current_level,
                personal_best: row.personal_best
            };

            return acc;
        }, {});

        res.json({ progress });
    } catch (error) {
        console.error('Get user skill progress error:', error);

        res.status(500).json({ error: 'Failed to retrieve user skill progress' });
    }
});

router.get('/', authToken, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.').toInt(),
    query('search').optional().trim().escape(),
    validateRequest
], async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        const queryParams = [];

        if (search) {
            whereConditions.push('name LIKE ?');
            queryParams.push(`%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const skillsQuery = `
          SELECT id, name, description, progressions, created_at
          FROM skills ${whereClause} 
          ORDER BY name ASC 
          LIMIT ${limit} OFFSET ${offset}
        `;

        const countQuery = `SELECT COUNT(*) as total FROM skills ${whereClause}`;
        
        const skillsQueryParams = [...queryParams];
        const countQueryParams = [...queryParams];

        const [[skills], [[{ total }]]] = await Promise.all([
            pool.execute(skillsQuery, skillsQueryParams),
            pool.execute(countQuery, countQueryParams)
        ]);

        res.json({
            skills: skills.map(formatSkill),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error('Get skills error:', error);

        res.status(500).json({ error: 'Failed to retrieve skills' });
    }
});


router.get('/:id', authToken, skillIdValidator, validateRequest, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            'SELECT * FROM skills WHERE id = ?',
            [id]
        );

        if (rows.length === 0)
            return res.status(404).json({ error: 'Skill not found' });

        res.json({ skill: formatSkill(rows[0]) });
    } catch (error) {
        console.error('Get skill by ID error:', error);

        res.status(500).json({ error: 'Failed to retrieve the skill' });
    }
});

router.post('/user/progress', authToken, async (req, res) => {
    try {
        const { skill_id, current_level, sets, repetitions, seconds } = req.body;

        if (!skill_id || !current_level)
            return res.status(400).json({ error: 'Skill ID and current level are required.' });

        const [existingProgress] = await pool.execute(
            `SELECT * FROM user_progress WHERE user_id = ? AND skill_id = ? AND progress_type = 'skill'`,
            [req.user.id, skill_id]
        );

        const newPersonalBest = {
            sets: sets || 0,
            repetitions: repetitions || 0,
            seconds: seconds || 0
        };

        if (existingProgress.length > 0) {
            const dbValue = existingProgress[0].personal_best;
            const existingPersonalBest = typeof dbValue === 'string' ? JSON.parse(dbValue || '{}') : dbValue || {};

            const updatedPersonalBest = {
                sets: Math.max(existingPersonalBest.sets || 0, sets || 0),
                repetitions: Math.max(existingPersonalBest.repetitions || 0, repetitions || 0),
                seconds: Math.max(existingPersonalBest.seconds || 0, seconds || 0)
            };

            await pool.execute(
                `UPDATE user_progress SET current_level = ?, personal_best = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND skill_id = ? AND progress_type = 'skill'`,
                [current_level, JSON.stringify(updatedPersonalBest), req.user.id, skill_id]
            );
        } else await pool.execute(
                `INSERT INTO user_progress (user_id, skill_id, progress_type, current_level, personal_best) VALUES (?, ?, 'skill', ?, ?)`,
                [req.user.id, skill_id, current_level, JSON.stringify(newPersonalBest)]
            );

        res.status(200).json({ message: 'Skill progress updated successfully.' });
    } catch (error) {
        console.error('Update user skill progress error:', error);

        res.status(500).json({ error: 'Failed to update user skill progress.' });
    }
});

module.exports = router;
