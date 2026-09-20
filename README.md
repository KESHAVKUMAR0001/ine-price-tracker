# INE Product Price Tracker

This is my submission for the INE Software Engineer Intern assignment. It is a full-stack price tracking application that lets you search products from the INE mock store, track them, scrape live price and stock info using Playwright, and store the history in Supabase (PostgreSQL). It also has an external cron endpoint to run batch updates automatically.

---

## Project Status

- **Tested Locally**: Search catalog, track/pause/delete products, Playwright price/stock scraping, price history & audit logs, manual & batch scrape endpoints, and React dashboard.
- **Deployment**: Configured for Render (backend) and Vercel (frontend).

---

## Tech Stack

- **Frontend**: React (Vite), Vanilla CSS
- **Backend**: Node.js, Express.js (organized into routes, controllers, and services)
- **Scraper**: Playwright (Chromium)
- **Database**: Supabase (PostgreSQL)

---

## Project Structure

```text
frontend/ (React + Vite)
   │  Makes API calls
   ▼
backend/ (Node + Express)
 ├── routes/        (API route definitions)
 ├── controllers/   (Request handling and validation)
 ├── services/
 │    ├── catalogService.js      (fetches INE mock store catalog)
 │    ├── productService.js      (database operations)
 │    ├── scraperService.js      (Playwright browser automation)
 │    └── batchScrapeService.js  (scrapes tracked products one by one)
 └── config/        (Supabase client and app config)
       │
       ▼
Supabase Database (PostgreSQL)
```

---

## Database Tables

Created in Supabase using `backend/db/schema.sql`:

1. **`products`**
   - `id`: UUID primary key
   - `store_product_id`: Unique product ID from INE store
   - `name`, `slug`, `url`, `brand`, `category`
   - `is_active`: Boolean to pause or resume tracking
   - `last_scraped_at`, `created_at`, `updated_at`

2. **`price_history`**
   - `id`: UUID primary key
   - `product_id`: Foreign key pointing to `products(id)`
   - `price`: Numeric price
   - `currency`: Default `'INR'`
   - `stock_status`: Text status (e.g. `"In stock · 12 left"`)
   - `stock_count`: Extracted number of items left
   - `scraped_at`: Timestamp

3. **`scrape_logs`**
   - `id`: UUID primary key
   - `product_id`: Foreign key pointing to `products(id)`
   - `status`: `'SUCCESS'` or `'FAILURE'`
   - `response_time_ms`: Duration in milliseconds
   - `attempt_count`: Number of retry attempts (up to 3)
   - `error_message`: Error details if failed
   - `mode`: `'headless'` or `'headed'`
   - `created_at`: Timestamp

---

## How the Scraper Works

The INE mock store has a delayed price display mechanism. The scraper handles it with these steps:

1. Opens the product page URL.
2. Closes the cookie banner if it shows up.
3. Hovers over the price container and waits at least 600ms (the page keeps the reveal button disabled until you dwell on it).
4. Clicks the "Reveal price" button once enabled.
5. Waits for the final price and stock badge to render in the DOM.
6. Reads the price and stock text.
7. If anything fails or times out, it retries up to 3 times before giving up.
8. Closes the browser context cleanly.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend and Supabase connection health check |
| `GET` | `/api/products` | Paginated catalog from the mock store |
| `GET` | `/api/products/search?q=` | Search products by title or brand |
| `POST` | `/api/tracked-products` | Add a product to the tracking list |
| `GET` | `/api/tracked-products` | Get all tracked products |
| `PATCH` | `/api/tracked-products/:id/toggle` | Pause or resume tracking for a product |
| `DELETE` | `/api/tracked-products/:id` | Remove a tracked product and its history |
| `POST` | `/api/scrape/:productId` | Run a scrape on demand for one product |
| `GET` | `/api/scrape/:productId/history` | Get price history for a product |
| `GET` | `/api/scrape/:productId/logs` | View audit logs (duration, retries, status) |
| `POST` | `/api/cron/scrape-all` | Batch scrape all active products (requires Bearer token) |

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Supabase Project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# Scraper mode: headless (default) or headed (to see browser during demo)
SCRAPER_MODE=headless

# Secret for cron route authorization
CRON_SECRET=your-custom-secret-key
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Running Locally

### 1. Database Setup
1. Create a project on [Supabase](https://supabase.com).
2. Go to SQL Editor and run `backend/db/schema.sql`.
3. Copy your project URL and secret/service role key into `backend/.env`.

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```
Runs at `http://localhost:5000`.

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`.

---

## Known Limitations

- **Render Free Tier Spin-Down**: On Render's free tier, the backend goes to sleep after 15 minutes of inactivity. The first request or cron trigger may take 30-50 seconds to respond while it wakes up.
- **Sequential Scraping**: To avoid running out of RAM with multiple headless browser instances, products are scraped one at a time. This keeps memory usage low and stable, but larger lists will take longer to complete.
- **In-Memory Lock for Batch Runs**: Overlap protection for cron runs is managed via an in-memory flag (`isBatchRunning`). If the server restarts during a batch run, the flag resets.


