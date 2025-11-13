import axios from 'axios';
import { hubspotConfig } from '../../config/hubspot.js';

/**
 * HubSpot API HTTP Client
 * Configured axios instance with authentication, logging, and error handling
 */
const hubspotClient = axios.create({
  baseURL: hubspotConfig.apiBase,
  headers: {
    'Authorization': `Bearer ${hubspotConfig.accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging
hubspotClient.interceptors.request.use(
  (config) => {
    console.log(`[HubSpot] ${config.method.toUpperCase()} ${config.url}`);

    // Log request body for POST/PATCH/PUT requests
    if (config.data && ['post', 'patch', 'put'].includes(config.method.toLowerCase())) {
      console.log(`[HubSpot] 📤 Request body:`, JSON.stringify(config.data, null, 2));
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
hubspotClient.interceptors.response.use(
  (response) => {
    // Log successful response for POST/PATCH/PUT requests
    if (response.config.data && ['post', 'patch', 'put'].includes(response.config.method.toLowerCase())) {
      console.log(`[HubSpot] ✅ Response (${response.status}):`, JSON.stringify(response.data, null, 2));
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('[HubSpot Error]:', {
        status: error.response.status,
        message: error.response.data?.message || error.message,
        category: error.response.data?.category
      });
    }
    return Promise.reject(error);
  }
);

export default hubspotClient;
