const express = require('express');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

async function checkAndAwardAchievements(userId) {
    try {
        const [allAchievements] = await pool.execute('SELECT * FROM achievements');
        const [earnedAchievements] = await pool.execute(
            'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
            [userId]
        );
        
        const earnedIds = earnedAchievements.map(a => a.achievement_id);

        const [[stats]] = await pool.execute(`
            SELECT
                (SELECT COUNT(*) FROM workout_history WHERE user_id = ?) as total_workouts,
                (SELECT COALESCE(SUM(duration_minutes), 0) FROM workout_history WHERE user_id = ?) as total_time_minutes,
                (SELECT COUNT(DISTINCT skill_id) FROM user_progress WHERE user_id = ? AND progress_type = 'skill') as skills_completed,
                (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) as achievements_earned
        `, [userId, userId, userId, userId]);

        const [workoutHistory] = await pool.execute(
            'SELECT DISTINCT DATE(completed_at) as workout_date FROM workout_history WHERE user_id = ? ORDER BY workout_date DESC',
            [userId]
        );

        let streakDays = 0;

        if (workoutHistory.length > 0) {
            const today = new Date();

            today.setHours(0, 0, 0, 0);
            
            let currentDate = new Date(workoutHistory[0].workout_date);

            currentDate.setHours(0, 0, 0, 0);
            
            const diffTime = today - currentDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) {
                streakDays = 1;

                for (let i = 0; i < workoutHistory.length - 1; i++) {
                    const current = new Date(workoutHistory[i].workout_date);
                    const previous = new Date(workoutHistory[i + 1].workout_date);
                    const timeDiff = current.getTime() - previous.getTime();
                    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

                    if (dayDiff === 1) streakDays++;
                    
                    else break;
                }
            }
        }

        const [[strengthWorkouts]] = await pool.execute(
            'SELECT COUNT(*) as count FROM workout_history wh JOIN workouts w ON wh.workout_id = w.id WHERE wh.user_id = ? AND w.workout_type = "strength"',
            [userId]
        );

        const [[enduranceWorkouts]] = await pool.execute(
            'SELECT COUNT(*) as count FROM workout_history wh JOIN workouts w ON wh.workout_id = w.id WHERE wh.user_id = ? AND w.workout_type = "endurance"',
            [userId]
        );

        stats.streak_days = streakDays;
        stats.strength_workouts = strengthWorkouts.count || 0;
        stats.endurance_workouts = enduranceWorkouts.count || 0;

        const connection = await pool.getConnection();

        await connection.beginTransaction();

        try {
            const newAchievements = [];
            
            for (const achievement of allAchievements) {
                if (earnedIds.includes(achievement.id)) continue;

                let criteriaMet = false;
                
                switch (achievement.criteria_type) {
                    case 'total_workouts':
                        criteriaMet = stats.total_workouts >= achievement.criteria_value;

                        break;

                    case 'progressions_completed':
                        criteriaMet = stats.skills_completed >= achievement.criteria_value;

                        break;

                    case 'streak':
                        criteriaMet = stats.streak_days >= achievement.criteria_value;

                        break;

                    case 'total_time':
                        criteriaMet = stats.total_time_minutes >= achievement.criteria_value;

                        break;

                    case 'strength_workouts':
                        criteriaMet = stats.strength_workouts >= achievement.criteria_value;

                        break;

                    case 'endurance_workouts':
                        criteriaMet = stats.endurance_workouts >= achievement.criteria_value;

                        break;

                    case 'achievements_earned':
                        criteriaMet = stats.achievements_earned >= achievement.criteria_value;

                        break;
                }

                if (criteriaMet) {
                    await connection.execute(
                        'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
                        [userId, achievement.id]
                    );

                    newAchievements.push(achievement);
                }
            }

            await connection.commit();

            return newAchievements;
        } catch (error) {
            await connection.rollback();

            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error checking achievements:', error);

        return [];
    }
}

router.get('/', authToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [userAchievements] = await pool.execute(`
            SELECT a.*, ua.earned_at
            FROM achievements a
            JOIN user_achievements ua ON a.id = ua.achievement_id
            WHERE ua.user_id = ?
            ORDER BY ua.earned_at DESC
        `, [userId]);
        const [allAchievements] = await pool.execute('SELECT * FROM achievements ORDER BY criteria_value ASC');

        res.json({
            earned: userAchievements,
            available: allAchievements
        });
    } catch (error) {
        console.error('Get achievements error:', error);

        res.status(500).json({ error: 'Failed to get achievements' });
    }
});

router.post('/check', authToken, async (req, res) => {
    try {
        const newAchievements = await checkAndAwardAchievements(req.user.id);

        res.json({ newAchievements });
    } catch (error) {
        console.error('Check achievements error:', error);

        res.status(500).json({ error: 'Failed to check achievements' });
    }
});

module.exports = { router, checkAndAwardAchievements };
