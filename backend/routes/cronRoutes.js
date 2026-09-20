const express = require('express');
const router = express.Router();
const authCron = require('../middleware/authCron');
const { triggerBatchScrape } = require('../controllers/cronController');

// Protected batch scrape endpoint: POST /api/cron/scrape-all
router.post('/scrape-all', authCron, triggerBatchScrape);

module.exports = router;
