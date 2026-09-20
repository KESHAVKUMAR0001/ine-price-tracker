const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/healthController');

// Health check endpoint: GET /api/health
router.get('/', getHealth);

module.exports = router;
