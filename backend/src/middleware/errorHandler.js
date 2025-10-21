/**
 * Global Error Handler Middleware
 * Catches and formats all errors consistently
 */

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler] ❌ Caught error:', {
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method
  });

  // Error with explicit status
  if (err.status) {
    return res.status(err.status).json({
      error: err.error || 'Error',
      message: err.message,
      ...(err.details && { details: err.details })
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
};

export default errorHandler;
