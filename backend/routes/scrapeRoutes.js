const express = require('express');
const router = express.Router();
const {
  triggerScrape,
  getHistory,
  getLogs
} = require('../controllers/scrapeController');

// Trigger scrape for a product: POST /api/scrape/:productId
router.post('/:productId', triggerScrape);

// Get price history: GET /api/scrape/:productId/history
router.get('/:productId/history', getHistory);

// Get scrape logs: GET /api/scrape/:productId/logs
router.get('/:productId/logs', getLogs);

module.exports = router;
