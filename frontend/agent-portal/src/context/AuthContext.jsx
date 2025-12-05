/**
 * Auth Context for Agent Portal
 * Manages authentication state and permission levels
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Process URL token synchronously BEFORE React renders (prevents race condition)
const processUrlToken = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      console.log('[Auth] Token found in URL, processing staff login...');

      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(urlToken.split('.')[1]));

      // Create user object from token payload
      const userData = {
        id: payload.contactId,
        contactId: payload.contactId,
        email: payload.email,
        role: payload.role,
        permissionLevel: payload.permissionLevel,
        agencyId: payload.agencyId,
        staffAccess: payload.staffAccess || false
      };

      // Store in localStorage SYNCHRONOUSLY (before any API calls)
      localStorage.setItem('authToken', urlToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Clean URL (remove token param)
      window.history.replaceState({}, document.title, window.location.pathname);

      console.log('[Auth] Staff login processed, user:', userData.email);
      return userData;
    }
  } catch (error) {
    console.error('[Auth] Error processing URL token:', error);
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Process URL token FIRST (synchronous, before useState initializes)
  const urlUser = processUrlToken();

  // Initialize state - use URL user if available, otherwise load from localStorage
  const [user, setUser] = useState(() => {
    if (urlUser) return urlUser;
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false); // No async loading needed now

  // Validate token still exists in localStorage (for edge cases)
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (user && !token) {
      console.warn('[Auth] User exists but token missing, clearing state');
      setUser(null);
    }
  }, [user]);

  const login = (userData, token) => {
    // Store token and user data
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/agent/login');
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Permission helper functions
  const isAdmin = () => {
    return user?.permissionLevel === 'admin';
  };

  const canViewAll = () => {
    return user?.permissionLevel === 'admin' || user?.permissionLevel === 'view_all';
  };

  const isStandard = () => {
    return user?.permissionLevel === 'standard';
  };

  const hasAgency = () => {
    return !!user?.agencyId;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    canViewAll,
    isStandard,
    hasAgency,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
