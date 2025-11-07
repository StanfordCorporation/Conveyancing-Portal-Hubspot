/**
 * Permission Middleware
 * Checks req.user.permissionLevel for specific privileges
 * Must be used AFTER agentAuth middleware
 */

/**
 * Require Admin permission (association type 7)
 * Blocks View All and Standard users
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (req.user.permissionLevel !== 'admin') {
    console.log(`[Permissions] ❌ User ${req.user.id} denied - requires admin (has ${req.user.permissionLevel})`);
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This action requires Admin privileges'
    });
  }

  console.log(`[Permissions] ✅ Admin access granted to user ${req.user.id}`);
  next();
};

/**
 * Require View All or Admin permission (association type 9 or 7)
 * Blocks Standard users
 */
export const requireViewAll = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!['admin', 'view_all'].includes(req.user.permissionLevel)) {
    console.log(`[Permissions] ❌ User ${req.user.id} denied - requires view_all or admin (has ${req.user.permissionLevel})`);
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This action requires View All or Admin privileges'
    });
  }

  console.log(`[Permissions] ✅ View All access granted to user ${req.user.id} (${req.user.permissionLevel})`);
  next();
};

/**
 * Verify user has agency
 * Some routes require agencyId
 */
export const requireAgency = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!req.user.agencyId) {
    console.log(`[Permissions] ❌ User ${req.user.id} denied - no agency association`);
    return res.status(400).json({
      error: 'No Agency',
      message: 'User is not associated with an agency'
    });
  }

  console.log(`[Permissions] ✅ Agency check passed for user ${req.user.id} (agency: ${req.user.agencyId})`);
  next();
};

export default {
  requireAdmin,
  requireViewAll,
  requireAgency
};
