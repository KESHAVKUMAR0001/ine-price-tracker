const batchScrapeService = require('../services/batchScrapeService');

/**
 * Controller: Handle external cron trigger to scrape all active products
 * Supports both synchronous and asynchronous (background) execution to prevent cron timeouts.
 * POST /api/cron/scrape-all?async=true
 */
async function triggerBatchScrape(req, res, next) {
  try {
    const isAsync = req.query.async === 'true' || req.headers['x-cron-async'] === 'true';

    if (isAsync) {
      // Check concurrency before launching background task
      if (batchScrapeService.isRunning()) {
        return res.status(409).json({
          success: false,
          message: 'A batch scraping job is already in progress.'
        });
      }

      // Fire in background and immediately respond with 202 Accepted
      batchScrapeService.runBatchScrape().catch(err => {
        console.error('[Cron] Background batch scrape error:', err.message);
      });

      return res.status(202).json({
        success: true,
        message: 'Batch scrape started in background.',
        mode: 'asynchronous'
      });
    }

    // Default synchronous execution
    const summary = await batchScrapeService.runBatchScrape();

    res.json({
      success: true,
      message: 'Batch scraping completed.',
      summary
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

module.exports = {
  triggerBatchScrape
};
