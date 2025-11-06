/**
 * Smokeball API Client
 * Base HTTP client with automatic token refresh and retry logic
 */

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { SMOKEBALL_CONFIG, SMOKEBALL_API } from '../../config/smokeball.js';
import { getCurrentAccessToken, isAuthenticated } from './auth.js';

/**
 * Create Smokeball API client with retry logic
 */
const smokeballClient = axios.create({
  baseURL: SMOKEBALL_API.basePath,
  headers: SMOKEBALL_API.headers,
  timeout: 30000, // 30 second timeout
});

/**
 * Configure axios-retry for transient failures
 * Retries on network errors and 5xx server errors
 */
axiosRetry(smokeballClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s
  retryCondition: (error) => {
    // Retry on network errors
    if (axiosRetry.isNetworkError(error)) {
      return true;
    }

    // Retry on 5xx server errors
    if (axiosRetry.isRetryableError(error)) {
      return true;
    }

    // Retry on specific status codes
    const status = error.response?.status;
    return status === 429 || status === 503 || status === 504;
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`[Smokeball Client] 🔄 Retry attempt ${retryCount} for ${requestConfig.method.toUpperCase()} ${requestConfig.url}`);
  },
});

/**
 * Request interceptor - Add authentication token
 */
smokeballClient.interceptors.request.use(
  async (config) => {
    try {
      // Get current access token (auto-refreshes if needed)
      const accessToken = await getCurrentAccessToken();

      // Add Authorization header
      config.headers.Authorization = `Bearer ${accessToken}`;

      console.log(`[Smokeball Client] 📤 ${config.method.toUpperCase()} ${config.url}`);

      return config;

    } catch (error) {
      console.error('[Smokeball Client] ❌ Error in request interceptor:', error.message);
      throw error;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Log responses and handle errors
 */
smokeballClient.interceptors.response.use(
  (response) => {
    console.log(`[Smokeball Client] ✅ ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data, config } = error.response;
      console.error(`[Smokeball Client] ❌ ${status} ${config.method.toUpperCase()} ${config.url}`);
      console.error(`[Smokeball Client] Error:`, data);

      // Handle specific error codes
      if (status === 401) {
        console.error('[Smokeball Client] 🔒 Unauthorized - Token may be invalid. Try re-authenticating.');
      } else if (status === 403) {
        console.error('[Smokeball Client] 🚫 Forbidden - Insufficient permissions');
      } else if (status === 404) {
        console.error('[Smokeball Client] 🔍 Not Found');
      } else if (status === 429) {
        console.error('[Smokeball Client] ⏱️ Rate limit exceeded');
      }

    } else if (error.request) {
      // Request made but no response received
      console.error('[Smokeball Client] ❌ No response received:', error.message);
    } else {
      // Error setting up request
      console.error('[Smokeball Client] ❌ Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * HTTP Method Wrappers
 */

/**
 * GET request
 *
 * @param {string} endpoint - API endpoint (e.g., '/matters')
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
export async function get(endpoint, params = {}) {
  try {
    const response = await smokeballClient.get(endpoint, { params });
    return response.data;
  } catch (error) {
    throw handleError(error, 'GET', endpoint);
  }
}

/**
 * POST request
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function post(endpoint, data = {}) {
  try {
    const response = await smokeballClient.post(endpoint, data);
    return response.data;
  } catch (error) {
    throw handleError(error, 'POST', endpoint);
  }
}

/**
 * PUT request
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function put(endpoint, data = {}) {
  try {
    // Use application/json-patch+json for contact updates (per Smokeball API docs)
    const config = {};
    if (endpoint.includes('/contacts/')) {
      config.headers = {
        'Content-Type': 'application/json-patch+json',
      };
    }

    const response = await smokeballClient.put(endpoint, data, config);
    return response.data;
  } catch (error) {
    throw handleError(error, 'PUT', endpoint);
  }
}

/**
 * PATCH request
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export async function patch(endpoint, data = {}) {
  try {
    const response = await smokeballClient.patch(endpoint, data);
    return response.data;
  } catch (error) {
    throw handleError(error, 'PATCH', endpoint);
  }
}

/**
 * DELETE request
 *
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
export async function del(endpoint) {
  try {
    const response = await smokeballClient.delete(endpoint);
    return response.data;
  } catch (error) {
    throw handleError(error, 'DELETE', endpoint);
  }
}

/**
 * Handle and format API errors
 *
 * @param {Error} error - Axios error
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @returns {Error} Formatted error
 */
function handleError(error, method, endpoint) {
  const status = error.response?.status;
  const errorData = error.response?.data;

  let message = `Smokeball API Error: ${method} ${endpoint}`;

  if (status) {
    message += ` - ${status}`;
  }

  if (errorData?.message) {
    message += ` - ${errorData.message}`;
  } else if (errorData?.error_description) {
    message += ` - ${errorData.error_description}`;
  } else if (error.message) {
    message += ` - ${error.message}`;
  }

  const formattedError = new Error(message);
  formattedError.status = status;
  formattedError.originalError = error;
  formattedError.responseData = errorData;

  return formattedError;
}

/**
 * Check if client is authenticated
 *
 * @returns {boolean} True if authenticated
 */
export function isClientAuthenticated() {
  return isAuthenticated();
}

// Export client instance for advanced usage
export { smokeballClient };

export default {
  get,
  post,
  put,
  patch,
  delete: del,
  isClientAuthenticated,
};
