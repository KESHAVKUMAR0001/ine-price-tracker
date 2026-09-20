const scraperService = require('../services/scraperService');

/**
 * Controller: Manually trigger a scrape for a tracked product
 * POST /api/scrape/:productId
 */
async function triggerScrape(req, res, next) {
  try {
    const { productId } = req.params;
    const result = await scraperService.scrapeProduct(productId);

    res.json({
      success: true,
      message: 'Product scraped and updated successfully.',
      data: result.data,
      metrics: result.metrics
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        log: error.log
      });
    }
    next(error);
  }
}

/**
 * Controller: Get price history for a product
 * GET /api/scrape/:productId/history
 */
async function getHistory(req, res, next) {
  try {
    const { productId } = req.params;
    const history = await scraperService.getPriceHistory(productId);

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Get scrape logs for a product
 * GET /api/scrape/:productId/logs
 */
async function getLogs(req, res, next) {
  try {
    const { productId } = req.params;
    const logs = await scraperService.getScrapeLogs(productId);

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  triggerScrape,
  getHistory,
  getLogs
};
