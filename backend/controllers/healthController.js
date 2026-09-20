const supabase = require('../config/supabase');

// Controller to report system status and verify Supabase connection
async function getHealth(req, res, next) {
  try {
    let dbStatus = 'unconfigured';
    let dbError = null;

    if (supabase) {
      try {
        // Query product table count as a lightweight connection test
        const { error } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true });

        if (error) {
          dbStatus = 'error';
          dbError = error.message;
        } else {
          dbStatus = 'connected';
        }
      } catch (err) {
        dbStatus = 'unreachable';
        dbError = err.message;
      }
    }

    res.json({
      success: true,
      service: 'INE Price Tracker Backend',
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        details: dbError || (dbStatus === 'connected' ? 'Supabase connection verified' : 'Check backend/.env credentials')
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth
};
