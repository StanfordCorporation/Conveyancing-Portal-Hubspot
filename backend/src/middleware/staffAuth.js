/**
 * Staff Authentication Middleware
 * Validates staff password for admin/support access to agent accounts
 */

export const staffAuth = (req, res, next) => {
  try {
    const { staffPassword } = req.body;

    // Validate staff password is provided
    if (!staffPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Staff password is required'
      });
    }

    // Validate against environment variable
    const validPassword = process.env.STAFF_PASSWORD;

    if (!validPassword) {
      console.error('[Staff Auth] ❌ STAFF_PASSWORD environment variable not configured');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Staff authentication not configured'
      });
    }

    if (staffPassword !== validPassword) {
      console.warn('[Staff Auth] ❌ Invalid staff password attempt', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid staff password'
      });
    }

    console.log('[Staff Auth] ✅ Staff authenticated successfully');

    next();
  } catch (error) {
    console.error('[Staff Auth] ❌ Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

export default staffAuth;
