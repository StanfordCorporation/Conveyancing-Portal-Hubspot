import axios from 'axios';
import { hubspotConfig } from '../../config/hubspot.config.js';

// Create HubSpot API client
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
hubspotClient.interceptors.response.use(
  (response) => response,
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
