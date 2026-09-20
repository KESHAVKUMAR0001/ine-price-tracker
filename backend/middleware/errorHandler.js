function errorHandler(err, req, res, next) {
  console.error('Server error:', err.message || err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
}

module.exports = errorHandler;
