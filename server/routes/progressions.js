const express = require('express');
const { pool } = require('../config/db');
const { authToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM progressions ORDER BY name ASC');

        res.json(rows); 
    } catch (error) {
        console.error('Failed to get progressions:', error);

        res.status(500).json({ error: 'Failed to get progressions' });
    }
});

module.exports = router;
