import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.error('[API] Authentication error - redirecting to login');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/agent/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Agent API Service
 * All API calls for the agent dashboard
 */
export const agentApi = {
  /**
   * Get complete dashboard data (agent info, deals, metrics)
   */
  getDashboardComplete: () => {
    console.log('[API] Fetching dashboard complete');
    return api.get('/agent/dashboard-complete');
  },

  /**
   * Get agent profile
   */
  getProfile: () => {
    return api.get('/agent/profile');
  },

  /**
   * Update agent profile
   */
  updateProfile: (updates) => {
    return api.patch('/agent/profile', updates);
  },

  /**
   * Create new lead
   */
  createLead: (leadData) => {
    console.log('[API] Creating new lead:', leadData.property?.address);
    return api.post('/agent/leads/create', leadData);
  },

  /**
   * Send client portal invitation
   */
  sendClientPortalInvitation: (leadId) => {
    console.log('[API] Sending client portal invitation for lead:', leadId);
    return api.post(`/agent/leads/${leadId}/send-to-client`, { sendEmail: true });
  },

  /**
   * Send client invitation (alias for sendClientPortalInvitation)
   */
  sendClientInvitation: (leadId) => {
    console.log('[API] Sending client invitation for lead:', leadId);
    return api.post(`/agent/leads/${leadId}/send-to-client`, { sendEmail: true });
  },

  /**
   * Get lead details
   */
  getLead: (leadId) => {
    return api.get(`/agent/leads/${leadId}`);
  },

  /**
   * Update lead
   */
  updateLead: (leadId, updates) => {
    console.log('[API] Updating lead:', leadId);
    return api.patch(`/agent/leads/${leadId}`, { updates });
  },

  /**
   * Upload document for deal
   */
  uploadDocument: (dealId, documentType, file) => {
    console.log('[API] Uploading document:', documentType, 'for deal:', dealId);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    
    return api.post(`/agent/deals/${dealId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Upload title search file
   */
  uploadTitleSearchFile: (file) => {
    console.log('[API] Uploading title search file');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', 'title_search');
    
    return api.post('/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Update agent profile
   */
  updateAgentProfile: (profileData) => {
    console.log('[API] Updating agent profile');
    return api.patch('/agent/profile', profileData);
  }
};

export default api;
