const productService = require('./productService');
const scraperService = require('./scraperService');

// Concurrency lock to prevent overlapping batch jobs
let isBatchRunning = false;

/**
 * Scrape all active tracked products sequentially
 */
async function runBatchScrape() {
  if (isBatchRunning) {
    const error = new Error('A batch scraping job is already running. Please wait for it to complete.');
    error.statusCode = 409;
    throw error;
  }

  isBatchRunning = true;
  const startTime = Date.now();

  try {
    // 1. Fetch all tracked products
    const allProducts = await productService.getTrackedProducts();

    // 2. Filter only active products (do not scrape paused/inactive products)
    const activeProducts = allProducts.filter(p => p.is_active === true);

    console.log(`[BatchScrape] Starting batch scrape for ${activeProducts.length} active products (total tracked: ${allProducts.length})...`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // 3. Process products SEQUENTIALLY to keep memory usage low
    for (const product of activeProducts) {
      console.log(`[BatchScrape] Processing product ${product.id}: "${product.name}"...`);
      try {
        const scrapeResult = await scraperService.scrapeProduct(product.id);
        successCount++;
        results.push({
          productId: product.id,
          name: product.name,
          status: 'SUCCESS',
          price: scrapeResult.data.price,
          stockStatus: scrapeResult.data.stockStatus,
          duration_ms: scrapeResult.metrics.response_time_ms
        });
      } catch (err) {
        failureCount++;
        console.error(`[BatchScrape] Product ${product.id} failed: ${err.message}`);
        results.push({
          productId: product.id,
          name: product.name,
          status: 'FAILURE',
          error: err.message
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    console.log(`[BatchScrape] Batch completed in ${totalDurationMs}ms. Success: ${successCount}, Failed: ${failureCount}.`);

    return {
      total: activeProducts.length,
      successful: successCount,
      failed: failureCount,
      duration_ms: totalDurationMs,
      results
    };
  } finally {
    // Always release lock
    isBatchRunning = false;
  }
}

/**
 * Check if a batch scrape is currently running
 */
function isRunning() {
  return isBatchRunning;
}

module.exports = {
  runBatchScrape,
  isRunning
};
