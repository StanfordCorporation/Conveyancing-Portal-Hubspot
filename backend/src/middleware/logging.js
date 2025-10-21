/**
 * Request/Response Logging Middleware
 * Logs all API requests and responses
 */

export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`\n================================================================================`);
  console.log(`[${timestamp}] ${method} ${path}`);
  console.log(`[Request] IP: ${ip}`);

  if (method !== 'GET' && Object.keys(req.body).length > 0) {
    console.log(`[Request Body]:`, JSON.stringify(req.body, null, 2));
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const statusCode = res.statusCode;
    console.log(`[Response] Status: ${statusCode}`);

    if (statusCode >= 400) {
      console.log(`[Response] Error:`, data);
    } else if (data && data.length < 1000) {
      // Only log small responses
      console.log(`[Response] Success`);
    }

    console.log(`================================================================================\n`);
    return originalSend.call(this, data);
  };

  next();
};

export default requestLogger;
