CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  store_product_id INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  url TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
  stock_status TEXT NOT NULL,
  stock_count INT,
  scraped_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON price_history(product_id, scraped_at DESC);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id BIGSERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'RETRY')),
  response_time_ms INT,
  attempt_count INT DEFAULT 1 NOT NULL,
  error_message TEXT,
  mode VARCHAR(20) DEFAULT 'headless' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_product ON scrape_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON scrape_logs(status, created_at DESC);
