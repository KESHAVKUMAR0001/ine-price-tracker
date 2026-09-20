const catalogService = require('../services/catalogService');

async function getProducts(req, res, next) {
  try {
    const { page, pageSize } = req.query;
    const result = await catalogService.getProducts(page, pageSize);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function searchProducts(req, res, next) {
  try {
    const { q, page, pageSize } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter "q" is required'
      });
    }

    const result = await catalogService.searchProducts(q, page, pageSize);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  searchProducts
};
