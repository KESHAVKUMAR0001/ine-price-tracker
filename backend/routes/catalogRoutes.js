const express = require('express');
const router = express.Router();
const { getProducts, searchProducts } = require('../controllers/catalogController');

// Search products by name/brand/category/sku: GET /api/products/search?q=keyword
router.get('/search', searchProducts);

// List products with pagination: GET /api/products?page=1&pageSize=20
router.get('/', getProducts);

module.exports = router;
