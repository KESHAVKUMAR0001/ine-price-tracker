const supabase = require('../config/supabase');

// Fallback in-memory storage used ONLY in local development when Supabase credentials are not yet entered
let memoryProducts = [];
let memoryIdCounter = 1;

function ensureDatabase() {
  if (!supabase && process.env.NODE_ENV === 'production') {
    const err = new Error('Database Error: Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in your environment.');
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Add a product to tracking
 * Prevents duplicates using store_product_id
 */
async function addTrackedProduct({ store_product_id, name, slug, url, brand, category }) {
  ensureDatabase();
  if (!store_product_id || !name || !url) {
    throw new Error('store_product_id, name, and url are required fields.');
  }

  const numStoreId = parseInt(store_product_id, 10);
  if (isNaN(numStoreId)) {
    throw new Error('store_product_id must be a valid integer.');
  }

  // --- Real Supabase Execution ---
  if (supabase) {
    // Check for existing product to prevent duplicate tracking
    const { data: existing, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('store_product_id', numStoreId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Database error checking product: ${checkError.message}`);
    }

    if (existing) {
      const err = new Error(`Product with store_product_id ${numStoreId} is already being tracked.`);
      err.statusCode = 409;
      err.product = existing;
      throw err;
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{
        store_product_id: numStoreId,
        name: name.trim(),
        slug: slug || null,
        url: url.trim(),
        brand: brand || null,
        category: category || null,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save tracked product: ${error.message}`);
    }

    return data;
  }

  // --- In-Memory Fallback ---
  const existing = memoryProducts.find(p => p.store_product_id === numStoreId);
  if (existing) {
    const err = new Error(`Product with store_product_id ${numStoreId} is already being tracked.`);
    err.statusCode = 409;
    err.product = existing;
    throw err;
  }

  const newProduct = {
    id: memoryIdCounter++,
    store_product_id: numStoreId,
    name: name.trim(),
    slug: slug || null,
    url: url.trim(),
    brand: brand || null,
    category: category || null,
    is_active: true,
    last_scraped_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryProducts.unshift(newProduct);
  return newProduct;
}

/**
 * Get all tracked products
 */
async function getTrackedProducts() {
  ensureDatabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tracked products: ${error.message}`);
    }

    return data || [];
  }

  return memoryProducts;
}

/**
 * Toggle tracking active status (enable/disable without deleting history)
 */
async function toggleTrackedProduct(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error('Product ID must be a valid integer.');
  }

  if (supabase) {
    // 1. Fetch current status
    const { data: current, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', numId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!current) {
      const err = new Error(`Tracked product with ID ${numId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Toggle status
    const updatedStatus = !current.is_active;
    const { data, error: updateError } = await supabase
      .from('products')
      .update({
        is_active: updatedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', numId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to toggle status: ${updateError.message}`);
    }

    return data;
  }

  // --- In-Memory Fallback ---
  const product = memoryProducts.find(p => p.id === numId);
  if (!product) {
    const err = new Error(`Tracked product with ID ${numId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  product.is_active = !product.is_active;
  product.updated_at = new Date().toISOString();
  return product;
}

/**
 * Delete a tracked product
 * Note: Database foreign keys use ON DELETE CASCADE, which also cleans up price history and logs.
 */
async function deleteTrackedProduct(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error('Product ID must be a valid integer.');
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', numId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to delete tracked product: ${error.message}`);
    }

    if (!data) {
      const err = new Error(`Tracked product with ID ${numId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    return {
      deletedProduct: data,
      note: 'Product and all associated price history were removed via ON DELETE CASCADE.'
    };
  }

  // --- In-Memory Fallback ---
  const index = memoryProducts.findIndex(p => p.id === numId);
  if (index === -1) {
    const err = new Error(`Tracked product with ID ${numId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const [deletedProduct] = memoryProducts.splice(index, 1);
  return {
    deletedProduct,
    note: 'Product and all associated price history were removed.'
  };
}

module.exports = {
  addTrackedProduct,
  getTrackedProducts,
  toggleTrackedProduct,
  deleteTrackedProduct
};
