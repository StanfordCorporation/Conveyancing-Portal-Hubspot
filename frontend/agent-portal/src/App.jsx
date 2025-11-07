import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import '../../src/index.css';
import { AuthProvider } from './context/AuthContext';
import { VideoThemeProvider } from './context/ThemeVideoContext';
import AgentLogin from './components/auth/Login';
import AgentDashboard from './components/dashboard/AgentDashboard';

function App() {
  return (
    <AuthProvider>
      <VideoThemeProvider>
        <Routes>
          {/* Root - redirect to login */}
          <Route path="/" element={<Navigate to="login" replace />} />

          {/* Agent Portal routes */}
          <Route path="login" element={<AgentLogin />} />
          <Route path="dashboard" element={<AgentDashboard />} />

          {/* Catch-all for this portal */}
          <Route path="*" element={<Navigate to="login" replace />} />
        </Routes>
      </VideoThemeProvider>
    </AuthProvider>
  );
}

export default App;
