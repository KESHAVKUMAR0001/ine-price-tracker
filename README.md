# INE Product Price Tracker

A web scraping and price tracking application built for the INE Software Engineer Intern assignment.

The application allows users to search products from the INE mock store, select products to track, scrape current price and stock data, save history in Supabase PostgreSQL, and trigger batch scrapes via an external cron endpoint.

---

## Project Status

- **Implemented and Tested Locally**:
  - Catalog search and pagination
  - Product tracking (add, list, pause/resume, delete)
  - Playwright scraper (handles cookie banner, hover, dwell time, reveal click, and retry logic)
  - Price and stock history storage
  - Scrape execution logs (latency, status, attempt counts, errors)
  - Secured batch scraping endpoint (`POST /api/cron/scrape-all`)
  - React dashboard with search, product list, and history/logs modal
- **Prepared for Deployment**:
  - Render configuration and Playwright build script
  - Vercel configuration for the React frontend
  - Environment variable templates
- **Not Yet Verified Live**:
  - Live deployment on Render and Vercel (tested only on local development environment so far)
  - External cron job running on cron-job.org (endpoint is tested locally, but not yet scheduled on a live URL)

---

## Tech Stack

- **Frontend**: React (Vite), plain CSS
- **Backend**: Node.js, Express.js
- **Scraper**: Playwright (Chromium)
- **Database**: Supabase (PostgreSQL)

---

## Architecture

The project follows a standard MVC structure:

```text
React Frontend (Vite)
       │  HTTP JSON requests
       ▼
Express Backend (Node.js)
 ├── Routes & Controllers  (handles HTTP requests)
 ├── Services
 │    ├── catalogService.js      (fetches mock store catalog)
 │    ├── productService.js      (database queries for products)
 │    ├── scraperService.js      (Playwright browser automation)
 │    └── batchScrapeService.js  (sequential batch scraping)
 └── Config                      (Supabase client and error handling)
       │  PostgreSQL queries
       ▼
Supabase Database
```

---

## Database Tables

Defined in `backend/db/schema.sql`:

1. **`products`**:
   - `id`: Primary key.
   - `store_product_id`: Numeric ID from the mock store (marked `UNIQUE` to prevent duplicates).
   - `name`, `slug`, `url`, `brand`, `category`.
   - `is_active`: Boolean flag to pause or resume tracking.
   - `last_scraped_at`, `created_at`, `updated_at`.

2. **`price_history`**:
   - `id`: Primary key.
   - `product_id`: Foreign key referencing `products(id)` with `ON DELETE CASCADE`.
   - `price`: Numeric price value.
   - `currency`: Currency code (default `'INR'`).
   - `stock_status`: Text badge from the store (e.g., `"In stock · 12 left"`).
   - `stock_count`: Parsed integer remaining count, or `null`.
   - `scraped_at`: Timestamp.

3. **`scrape_logs`**:
   - `id`: Primary key.
   - `product_id`: Foreign key referencing `products(id)` with `ON DELETE CASCADE`.
   - `status`: `'SUCCESS'` or `'FAILURE'`.
   - `response_time_ms`: Duration of the scrape in milliseconds.
   - `attempt_count`: Number of attempts made (up to 3).
   - `error_message`: Error message if failed.
   - `mode`: `'headless'` or `'headed'`.
   - `created_at`: Timestamp.

---

## Scraper Interaction Steps

The INE mock store delays showing price and stock on product pages. Playwright interacts with the page in these steps:

1. **Navigate**: Opens the product page (`https://demo.inelabteamdev.com/product/:id`).
2. **Cookie Banner**: Clicks "Accept" on the cookie banner if it appears.
3. **Hover Simulation**: Moves the mouse across the price box and waits for at least 600ms (the site disables the reveal button until this dwell time passes).
4. **Reveal Price**: Clicks the enabled "Reveal price" button.
5. **Wait for Price**: Waits for the price container to finish loading and update.
6. **Extract**: Reads the price text and stock badge text.
7. **Retries**: If an attempt times out or fails, waits and tries again (up to 3 attempts).
8. **Close**: Closes the browser in a `finally` block.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and database connection status |
| `GET` | `/api/products` | Paginated catalog listing |
| `GET` | `/api/products/search?q=` | Search catalog products by keyword |
| `POST` | `/api/tracked-products` | Add a product to tracking |
| `GET` | `/api/tracked-products` | List all tracked products |
| `PATCH` | `/api/tracked-products/:id/toggle` | Pause or resume tracking |
| `DELETE` | `/api/tracked-products/:id` | Delete tracked product and its history |
| `POST` | `/api/scrape/:productId` | Trigger a manual scrape for one product |
| `GET` | `/api/scrape/:productId/history` | Get price history for a product |
| `GET` | `/api/scrape/:productId/logs` | Get scrape execution logs for a product |
| `POST` | `/api/cron/scrape-all` | Batch scrape active products (requires Bearer token) |

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Supabase Credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-key

# Scraper mode: headless (default) or headed (for visual testing)
SCRAPER_MODE=headless

# Secret token required by POST /api/cron/scrape-all
CRON_SECRET=your-secret-token
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Local Setup

### 1. Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### 3. Database
1. Create a Supabase project.
2. In the Supabase SQL Editor, run `backend/db/schema.sql`.
3. Add your `SUPABASE_URL` and `SUPABASE_KEY` to `backend/.env`.

---

## Deployment Steps (To Be Executed)

### Render (Backend)
1. Push repository to GitHub.
2. Create a Web Service on Render with root directory `backend`.
3. Build command: `npm install && npm run build`  
   *(Runs `npx playwright install --with-deps chromium` so Linux has the browser binary).*
4. Start command: `node server.js`
5. Set environment variables: `SUPABASE_URL`, `SUPABASE_KEY`, `CORS_ORIGIN`, `CRON_SECRET`, `SCRAPER_MODE=headless`.

### Vercel (Frontend)
1. Create a project on Vercel with root directory `frontend`.
2. Framework preset: `Vite`.
3. Set environment variable: `VITE_API_BASE_URL` pointing to your deployed Render URL.

### External Cron (cron-job.org)
1. Create an account on cron-job.org.
2. Schedule a job for `https://your-backend.onrender.com/api/cron/scrape-all?async=true`.
3. Schedule: Every 2 hours (`0 */2 * * *`).
4. Method: `POST`.
5. Header: `Authorization: Bearer <CRON_SECRET>`.

---

## AI Collaboration & Corrections

During development, an AI assistant was used for pair-programming. Several initial AI proposals were incorrect and were corrected:

1. **Selecting tools before inspecting the website**: The AI picked Playwright immediately without inspecting the site. We stopped and inspected the actual DOM and network requests first to determine what was genuinely necessary.
2. **Proposing to skip tests**: The AI recommended postponing tests until after MVP. We corrected this because reliability is an explicit evaluation criterion, adding targeted tests early for scraping logic, retry paths, and cron security.
3. **Assuming Render infrastructure details**: The AI made unverified claims about specific memory limits and spin-down timers. We treated these as assumptions and designed the scraper to run sequentially to be safe with memory regardless of the provider.
4. **Unnecessary database complexity**: The AI proposed four tables (`products` and `tracked_products`). Because this application does not have user accounts or multi-user ownership, we simplified to three tables with an `is_active` toggle flag.

---

## Known Limitations

- **Render Free Tier Sleep**: On the free tier, Render may spin down instances after a period of inactivity. Waking up the service can take additional time on the first request.
- **In-Memory Batch Lock**: The lock preventing overlapping batch runs is stored in memory (`let isBatchRunning = false`). This is designed for a single-server setup and would reset if the server restarts.
- **Sequential Scraping Duration**: Products are scraped one after another to keep memory usage low. As a result, batch runs take longer as more products are added.
- **Database Fallback Behavior**: In local development, if Supabase credentials are not entered, the app uses a temporary in-memory store. In production (`NODE_ENV=production`), this fallback is disabled and the server will return an explicit configuration error if database credentials are missing.

---

## 2–4 Minute Demo Recording Checklist

Follow this sequence to record the demo video for assignment submission:

1. **Setup**: Set `SCRAPER_MODE=headed` in `backend/.env` and restart the backend.
2. **Search**: Search for a product (e.g., `"kettle"` or `"summit"`) and display the catalog results.
3. **Add to Tracking**: Click `+ Add to Tracking` and show the product appear in the tracked list.
4. **Run Headed Scrape**: Click `⚡ Scrape Now` and show the visible browser window navigate, move the mouse, reveal the price, and close cleanly.
5. **Inspect Results**: Show the updated price, stock badge, and timestamp on the dashboard.
6. **History & Logs**: Open the `📊 Details` modal and display both the price snapshot and the audit log with response time and retry count.
7. **Pause Tracking**: Click `Pause` to demonstrate the active tracking toggle without deleting history.
