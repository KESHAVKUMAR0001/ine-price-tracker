const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Reusable helper for JSON HTTP requests
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Health
  getHealth: () => request('/api/health'),

  // Catalog
  searchCatalog: (query, page = 1, pageSize = 20) =>
    request(`/api/products/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`),
  getCatalog: (page = 1, pageSize = 20) =>
    request(`/api/products?page=${page}&pageSize=${pageSize}`),

  // Tracked Products
  getTrackedProducts: () => request('/api/tracked-products'),
  addTrackedProduct: (product) =>
    request('/api/tracked-products', {
      method: 'POST',
      body: JSON.stringify(product)
    }),
  toggleTrackedProduct: (id) =>
    request(`/api/tracked-products/${id}/toggle`, {
      method: 'PATCH'
    }),
  deleteTrackedProduct: (id) =>
    request(`/api/tracked-products/${id}`, {
      method: 'DELETE'
    }),

  // Scraping, History & Logs
  triggerScrape: (productId) =>
    request(`/api/scrape/${productId}`, {
      method: 'POST'
    }),
  getPriceHistory: (productId) =>
    request(`/api/scrape/${productId}/history`),
  getScrapeLogs: (productId) =>
    request(`/api/scrape/${productId}/logs`)
};
