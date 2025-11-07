import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeVideoContext = createContext();

export const useVideoTheme = () => {
  const context = useContext(ThemeVideoContext);
  if (!context) {
    throw new Error('useVideoTheme must be used within a VideoThemeProvider');
  }
  return context;
};

export const VideoThemeProvider = ({ children }) => {
  // Initialize from localStorage or default to false (light mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved === 'true';
  });

  // Sync dark mode with HTML class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const toggleMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleMode
  };

  return (
    <ThemeVideoContext.Provider value={value}>
      {children}
    </ThemeVideoContext.Provider>
  );
};
