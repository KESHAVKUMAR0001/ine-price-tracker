const MOCK_STORE_BASE = 'https://demo.inelabteamdev.com';

// In-memory catalog cache with 10-minute TTL to keep searches fast and reliable
let catalogCache = {
  items: [],
  lastFetchedAt: 0
};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Format a raw product item from the INE mock store into our standard schema
 */
function formatProduct(item) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    brand: item.brand,
    category: item.category,
    sku: item.sku,
    url: `${MOCK_STORE_BASE}/product/${item.id}`,
    description: item.description
  };
}

/**
 * Fetch a single page from the INE mock store with a 10-second timeout
 */
async function fetchCatalogPage(page = 1, pageSize = 60) {
  const url = `${MOCK_STORE_BASE}/api/catalog?page=${page}&pageSize=${pageSize}`;
  
  // Abort request if the mock store takes longer than 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`INE Mock Store responded with HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request to INE Mock Store timed out after 10 seconds');
    }
    throw error;
  }
}

/**
 * Load all catalog items to support accurate searching across all 1000 products
 */
async function getAllCatalogItems() {
  const now = Date.now();
  // Return cached items if still fresh
  if (catalogCache.items.length > 0 && (now - catalogCache.lastFetchedAt < CACHE_TTL_MS)) {
    return catalogCache.items;
  }

  // Fetch initial page to discover total pages
  const firstPage = await fetchCatalogPage(1, 60);
  const totalPages = firstPage.pages || 1;
  let allItems = firstPage.items ? firstPage.items.map(formatProduct) : [];

  // Fetch remaining pages in parallel batches
  const pagePromises = [];
  for (let p = 2; p <= totalPages; p++) {
    pagePromises.push(
      fetchCatalogPage(p, 60)
        .then(data => (data.items || []).map(formatProduct))
        .catch(err => {
          console.warn(`Warning: failed to fetch catalog page ${p}:`, err.message);
          return [];
        })
    );
  }

  const remainingResults = await Promise.all(pagePromises);
  remainingResults.forEach(pageItems => {
    allItems = allItems.concat(pageItems);
  });

  // De-duplicate by product ID
  const uniqueMap = new Map();
  allItems.forEach(item => {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  });

  const uniqueItems = Array.from(uniqueMap.values());
  catalogCache = {
    items: uniqueItems,
    lastFetchedAt: now
  };

  return uniqueItems;
}

/**
 * Get paginated products
 */
async function getProducts(page = 1, pageSize = 20) {
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numPageSize = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));

  // If cache is ready, paginate locally for instant response
  if (catalogCache.items.length > 0 && (Date.now() - catalogCache.lastFetchedAt < CACHE_TTL_MS)) {
    const total = catalogCache.items.length;
    const startIndex = (numPage - 1) * numPageSize;
    const items = catalogCache.items.slice(startIndex, startIndex + numPageSize);

    return {
      page: numPage,
      pageSize: numPageSize,
      pages: Math.ceil(total / numPageSize),
      total,
      items
    };
  }

  // Otherwise fetch from mock store directly
  const data = await fetchCatalogPage(numPage, numPageSize);
  return {
    page: data.page || numPage,
    pageSize: data.pageSize || numPageSize,
    pages: data.pages || 1,
    total: data.total || 0,
    items: (data.items || []).map(formatProduct)
  };
}

/**
 * Search products by keyword across name, brand, category, or sku
 */
async function searchProducts(keyword, page = 1, pageSize = 20) {
  const trimmed = (keyword || '').trim().toLowerCase();
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numPageSize = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20));

  if (!trimmed) {
    return getProducts(numPage, numPageSize);
  }

  // Ensure catalog is loaded for comprehensive search
  const allItems = await getAllCatalogItems();

  // Case-insensitive substring match
  const matched = allItems.filter(item => {
    return (
      (item.name && item.name.toLowerCase().includes(trimmed)) ||
      (item.brand && item.brand.toLowerCase().includes(trimmed)) ||
      (item.category && item.category.toLowerCase().includes(trimmed)) ||
      (item.sku && item.sku.toLowerCase().includes(trimmed))
    );
  });

  const total = matched.length;
  const startIndex = (numPage - 1) * numPageSize;
  const items = matched.slice(startIndex, startIndex + numPageSize);

  return {
    query: trimmed,
    page: numPage,
    pageSize: numPageSize,
    pages: Math.ceil(total / numPageSize) || 1,
    total,
    items
  };
}

module.exports = {
  getProducts,
  searchProducts
};
