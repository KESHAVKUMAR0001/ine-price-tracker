const fs = require('fs');
const { chromium } = require('playwright');
const supabase = require('../config/supabase');
const productService = require('./productService');

// In-memory logs & history store for local testing when Supabase credentials are not yet entered
const memoryPriceHistory = [];
const memoryScrapeLogs = [];

/**
 * Helper: Find browser executable (supports local Edge on Windows or default Chromium)
 */
function getBrowserLaunchOptions() {
  const isHeaded = process.env.SCRAPER_MODE === 'headed';
  const options = {
    headless: !isHeaded,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };

  // On Windows, if Edge is installed, use it directly to guarantee local execution
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (process.platform === 'win32' && fs.existsSync(edgePath)) {
    options.executablePath = edgePath;
  }

  return options;
}

/**
 * Helper: Parse raw price string (e.g. "₹ 2,499.00" or "₹2499") into a clean number
 */
function parsePrice(rawPrice) {
  if (!rawPrice) return 0;
  // Remove currency symbols, commas, and zero-width spaces
  const cleaned = rawPrice.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper: Parse stock badge text into numeric count if available
 * e.g. "In stock · 12 left" -> 12, "Out of stock" -> 0
 */
function parseStockCount(stockText) {
  if (!stockText) return null;
  if (stockText.toLowerCase().includes('out of stock')) return 0;
  const match = stockText.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Scrape price and stock for a single tracked product
 * Implements mouse movement dwell, cookie dismissal, retry loop, and logging
 */
async function scrapeProduct(productId) {
  const startTime = Date.now();
  const mode = process.env.SCRAPER_MODE === 'headed' ? 'headed' : 'headless';
  let attemptCount = 0;
  const MAX_ATTEMPTS = 3;

  // 1. Fetch product from database to ensure it's a tracked product
  if (!supabase && process.env.NODE_ENV === 'production') {
    const err = new Error('Database Error: Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in your environment.');
    err.statusCode = 500;
    throw err;
  }

  const products = await productService.getTrackedProducts();
  const product = products.find(p => p.id === parseInt(productId, 10));

  if (!product) {
    const err = new Error(`Product with ID ${productId} is not in tracked products list.`);
    err.statusCode = 404;
    throw err;
  }

  let browser = null;
  let scrapeError = null;
  let extractedData = null;

  try {
    const launchOptions = getBrowserLaunchOptions();
    browser = await chromium.launch(launchOptions);

    // Run up to MAX_ATTEMPTS to handle simulated slow responses or dropped clicks
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attemptCount = attempt;
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
      const page = await context.newPage();

      try {
        console.log(`[Scraper] Navigating to ${product.url} (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
        await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Step 1: Dismiss Cookie Consent Overlay if present
        try {
          const cookieBtn = page.locator('button:has-text("Accept")');
          if (await cookieBtn.isVisible({ timeout: 2500 })) {
            console.log('[Scraper] Dismissing cookie overlay...');
            await cookieBtn.click();
            await page.waitForTimeout(400);
          }
        } catch (_) {
          // No cookie banner, proceed
        }

        // Step 2: Locate the price block
        const priceBlock = page.locator('.price-block');
        await priceBlock.waitFor({ state: 'visible', timeout: 8000 });

        // Step 3: Hover and simulate mouse movement across >= 8 coordinates
        const box = await priceBlock.boundingBox();
        if (box) {
          console.log('[Scraper] Simulating mouse movements over price container...');
          for (let i = 0; i < 14; i++) {
            await page.mouse.move(box.x + 30 + (i * 10), box.y + 20 + ((i % 4) * 6));
            await page.waitForTimeout(50);
          }
        }

        // Step 4: Dwell wait (store requires minimum 600ms hover dwell)
        await page.waitForTimeout(750);

        // Step 5: Click the "Reveal price" button
        const revealBtn = page.locator('button:has-text("Reveal price")');
        await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

        // Wait until button becomes enabled after dwell
        let dwellWaited = 0;
        while (await revealBtn.isDisabled() && dwellWaited < 2000) {
          await page.waitForTimeout(200);
          dwellWaited += 200;
        }

        console.log('[Scraper] Clicking "Reveal price"...');
        await revealBtn.click();

        // Step 6: Wait for .price-success state
        console.log('[Scraper] Waiting for price data to decrypt and render...');
        await page.waitForSelector('.price-success', { timeout: 15000 });

        // Step 7: Extract price and stock details
        const rawPrice = await page.locator('.price-success .price-main span').first().textContent();
        const rawStock = await page.locator('.stock-badge').textContent();

        const numericPrice = parsePrice(rawPrice);
        const stockStatus = (rawStock || '').trim();
        const stockCount = parseStockCount(stockStatus);

        extractedData = {
          productId: product.id,
          productName: product.name,
          price: numericPrice,
          currency: 'INR',
          stockStatus,
          stockCount,
          rawPrice: rawPrice?.trim()
        };

        console.log('[Scraper] Success:', extractedData);
        await context.close();
        break; // Successfully scraped, exit retry loop

      } catch (err) {
        console.warn(`[Scraper] Attempt ${attempt} failed: ${err.message}`);
        scrapeError = err;
        await context.close();

        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  const durationMs = Date.now() - startTime;
  const status = extractedData ? 'SUCCESS' : 'FAILURE';
  const errorMessage = extractedData ? null : (scrapeError?.message || 'Scrape failed after max retries');

  // Step 8: Persist to Supabase Database (or local memory fallback)
  if (supabase) {
    // 1. Log the scrape attempt
    await supabase.from('scrape_logs').insert([{
      product_id: product.id,
      status,
      response_time_ms: durationMs,
      attempt_count: attemptCount,
      error_message: errorMessage,
      mode
    }]);

    // 2. If successful, record price history and update product last_scraped_at
    if (extractedData) {
      await supabase.from('price_history').insert([{
        product_id: product.id,
        price: extractedData.price,
        currency: extractedData.currency,
        stock_status: extractedData.stockStatus,
        stock_count: extractedData.stockCount,
        scraped_at: new Date().toISOString()
      }]);

      await supabase.from('products').update({
        last_scraped_at: new Date().toISOString()
      }).eq('id', product.id);
    }
  } else {
    // In-memory fallback persistence
    memoryScrapeLogs.unshift({
      id: memoryScrapeLogs.length + 1,
      product_id: product.id,
      status,
      response_time_ms: durationMs,
      attempt_count: attemptCount,
      error_message: errorMessage,
      mode,
      created_at: new Date().toISOString()
    });

    if (extractedData) {
      memoryPriceHistory.unshift({
        id: memoryPriceHistory.length + 1,
        product_id: product.id,
        price: extractedData.price,
        currency: extractedData.currency,
        stock_status: extractedData.stockStatus,
        stock_count: extractedData.stockCount,
        scraped_at: new Date().toISOString()
      });
      product.last_scraped_at = new Date().toISOString();
    }
  }

  if (!extractedData) {
    const error = new Error(`Scraping failed: ${errorMessage}`);
    error.statusCode = 502;
    error.log = { status, durationMs, attemptCount, errorMessage };
    throw error;
  }

  return {
    success: true,
    data: extractedData,
    metrics: {
      status,
      response_time_ms: durationMs,
      attempt_count: attemptCount,
      mode
    }
  };
}

/**
 * Get price history for a product
 */
async function getPriceHistory(productId) {
  const numId = parseInt(productId, 10);
  if (supabase) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', numId)
      .order('scraped_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
  return memoryPriceHistory.filter(h => h.product_id === numId);
}

/**
 * Get scrape logs for a product
 */
async function getScrapeLogs(productId) {
  const numId = parseInt(productId, 10);
  if (supabase) {
    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('product_id', numId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
  return memoryScrapeLogs.filter(l => l.product_id === numId);
}

module.exports = {
  scrapeProduct,
  getPriceHistory,
  getScrapeLogs
};
