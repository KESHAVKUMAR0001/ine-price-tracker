const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/healthRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const productRoutes = require('./routes/productRoutes');
const scrapeRoutes = require('./routes/scrapeRoutes');
const cronRoutes = require('./routes/cronRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/products', catalogRoutes);
app.use('/api/tracked-products', productRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/cron', cronRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'INE Product Price Tracker API is running.',
    healthEndpoint: '/api/health'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
