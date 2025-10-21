import api from './api';

/**
 * Send OTP to email or mobile
 */
export const sendOTP = async (identifier, method) => {
  try {
    const response = await api.post('/auth/send-otp', {
      identifier,
      method
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to send OTP' };
  }
};

/**
 * Verify OTP and login
 */
export const verifyOTP = async (identifier, otp, method) => {
  try {
    const response = await api.post('/auth/verify-otp', {
      identifier,
      otp,
      method
    });

    // Store token and user data
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to verify OTP' };
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('authToken');
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export default {
  sendOTP,
  verifyOTP,
  logout,
  getCurrentUser,
  isAuthenticated
};
