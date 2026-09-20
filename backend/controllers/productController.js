const productService = require('../services/productService');

/**
 * Controller: Add a product to tracking
 * POST /api/tracked-products
 */
async function addTrackedProduct(req, res, next) {
  try {
    const { store_product_id, name, slug, url, brand, category } = req.body;

    if (!store_product_id || !name || !url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: store_product_id, name, and url are mandatory.'
      });
    }

    const product = await productService.addTrackedProduct({
      store_product_id,
      name,
      slug,
      url,
      brand,
      category
    });

    res.status(201).json({
      success: true,
      message: 'Product added to tracking successfully.',
      data: product
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        data: error.product
      });
    }
    next(error);
  }
}

/**
 * Controller: List all tracked products
 * GET /api/tracked-products
 */
async function getTrackedProducts(req, res, next) {
  try {
    const products = await productService.getTrackedProducts();

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Toggle active tracking status
 * PATCH /api/tracked-products/:id/toggle
 */
async function toggleTrackedProduct(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await productService.toggleTrackedProduct(id);

    res.json({
      success: true,
      message: `Product tracking is now ${updated.is_active ? 'ENABLED' : 'PAUSED'}.`,
      data: updated
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

/**
 * Controller: Delete a tracked product
 * DELETE /api/tracked-products/:id
 */
async function deleteTrackedProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await productService.deleteTrackedProduct(id);

    res.json({
      success: true,
      message: 'Product removed from tracking.',
      note: result.note,
      data: result.deletedProduct
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

module.exports = {
  addTrackedProduct,
  getTrackedProducts,
  toggleTrackedProduct,
  deleteTrackedProduct
};
