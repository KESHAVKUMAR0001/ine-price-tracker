function authCron(req, res, next) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({
      success: false,
      message: 'CRON_SECRET is not configured on the server.'
    });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>'
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== cronSecret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }

  next();
}

module.exports = authCron;
