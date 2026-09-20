const express = require('express');
const router = express.Router();
const {
  addTrackedProduct,
  getTrackedProducts,
  toggleTrackedProduct,
  deleteTrackedProduct
} = require('../controllers/productController');

// Add a product to tracking: POST /api/tracked-products
router.post('/', addTrackedProduct);

// List all tracked products: GET /api/tracked-products
router.get('/', getTrackedProducts);

// Toggle tracking on/off: PATCH /api/tracked-products/:id/toggle
router.patch('/:id/toggle', toggleTrackedProduct);

// Delete tracked product: DELETE /api/tracked-products/:id
router.delete('/:id', deleteTrackedProduct);

module.exports = router;
