const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  next();
};

router.get('/status', authToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT onboarding_completed FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ onboardingCompleted: rows[0].onboarding_completed === 1 });
  } catch (error) {
    console.error('Get onboarding status error:', error);

    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

router.post('/complete', authToken, [
  body('fitnessLevel').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid fitness level'),
  body('fitnessGoals').isArray().withMessage('Fitness goals must be an array'),
  body('preferredFocus').optional().isIn(['upper', 'lower', 'core', 'full', 'flexibility', 'strength']),
  body('availableEquipment').optional().isArray(),
  body('workoutFrequency').optional().isIn(['daily', '3-4', '2-3', '1-2', 'occasional']),
  validateRequest
], async (req, res) => {
  try {
    const { fitnessLevel, fitnessGoals, preferredFocus, availableEquipment, workoutFrequency } = req.body;

    await pool.execute(
      'UPDATE users SET onboarding_completed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id]
    );

    const [skills] = await pool.execute(
      'SELECT id, name, description, progressions FROM skills ORDER BY name ASC'
    );

    const skillScores = skills.map(skill => {
      let score = 0;
      const progressions = typeof skill.progressions === 'string' 
        ? JSON.parse(skill.progressions) 
        : skill.progressions || [];
      
      const firstProgression = progressions[0] || {};
      const skillName = skill.name.toLowerCase();
      const description = (skill.description || '').toLowerCase();

      if (fitnessLevel === 'beginner') {
        if (skillName.includes('basic') || skillName === 'basics') score += 10;
        if (firstProgression.goal && firstProgression.goal <= 10) score += 5;
      } else if (fitnessLevel === 'intermediate') {
        if (skillName.includes('pull') || skillName.includes('push') || skillName.includes('core')) score += 8;
        if (firstProgression.goal && firstProgression.goal > 10 && firstProgression.goal <= 30) score += 5;
      } else if (fitnessLevel === 'advanced') {
        if (skillName.includes('one arm') || skillName.includes('handstand') || skillName.includes('front lever')) score += 10;
        if (firstProgression.goal && firstProgression.goal > 30) score += 5;
      }

      if (preferredFocus) {
        if (preferredFocus === 'upper' && (skillName.includes('pull') || skillName.includes('push') || skillName.includes('handstand'))) score += 8;
        if (preferredFocus === 'lower' && (skillName.includes('leg') || skillName.includes('squat'))) score += 8;
        if (preferredFocus === 'core' && (skillName.includes('core') || skillName.includes('lever') || description.includes('core'))) score += 8;
        if (preferredFocus === 'full' && (skillName.includes('basic') || skillName === 'basics')) score += 8;
      }

      if (fitnessGoals && Array.isArray(fitnessGoals)) {
        if (fitnessGoals.includes('strength') && (description.includes('strength') || skillName.includes('pull') || skillName.includes('push'))) score += 5;
        if (fitnessGoals.includes('flexibility') && (description.includes('flexibility') || skillName.includes('handstand'))) score += 5;
        if (fitnessGoals.includes('endurance') && (description.includes('endurance') || skillName.includes('basic'))) score += 5;
      }

      return { skill, score };
    });

    skillScores.sort((a, b) => b.score - a.score);
    const recommendedSkill = skillScores[0]?.skill || skills[0];

    const [workouts] = await pool.execute(
      'SELECT id, name, description, workout_type, difficulty_level FROM workouts WHERE difficulty_level = ? OR difficulty_level = ? ORDER BY name ASC LIMIT 5',
      [fitnessLevel, 'beginner']
    );

    const recommendedWorkout = workouts[0] || null;

    res.json({
      message: 'Onboarding completed successfully',
      recommendations: {
        skill: {
          id: recommendedSkill.id,
          name: recommendedSkill.name,
          description: recommendedSkill.description
        },
        workout: recommendedWorkout ? {
          id: recommendedWorkout.id,
          name: recommendedWorkout.name,
          description: recommendedWorkout.description
        } : null
      }
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);

    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

module.exports = router;

