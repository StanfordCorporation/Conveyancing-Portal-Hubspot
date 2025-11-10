/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and sets user context
 */

import jwt from 'jsonwebtoken';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth Middleware] ⚠️ No JWT token provided');
    console.log('[Auth Middleware] 🔍 Received header:', authHeader);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'JWT token required'
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  console.log('[Auth Middleware] 🔍 Attempting to verify token...');
  console.log('[Auth Middleware] 🔍 Token length:', token.length);
  console.log('[Auth Middleware] 🔍 Token preview:', token.substring(0, 50) + '...');

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    req.user = decoded;
    console.log(`[Auth Middleware] ✅ Token verified for user: ${decoded.email}`);
    next();
  } catch (error) {
    console.error('[Auth Middleware] ❌ Token verification failed:', error.message);
    console.error('[Auth Middleware] 🔍 Error name:', error.name);
    console.error('[Auth Middleware] 🔍 Full token:', token);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'JWT token has expired'
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid JWT token'
    });
  }
};

/**
 * Role-based authorization middleware
 * Ensures user has required role
 */
export const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      console.log(`[Auth Middleware] ❌ User ${req.user.email} not authorized. Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: `User role "${req.user.role}" is not authorized. Required: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

export default {
  authenticateJWT,
  authorizeRole
};
