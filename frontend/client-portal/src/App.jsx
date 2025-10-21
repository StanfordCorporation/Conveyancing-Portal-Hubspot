import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import '../../src/index.css';
import ConveyancingLogin from './components/auth/Login';
import DisclosureForm from './components/disclosure/DisclosureForm';
import ClientDashboard from './components/dashboard/ClientDashboard';

function App() {
  return (
    <Routes>
      {/* Root - redirect to login */}
      <Route path="/" element={<Navigate to="login" replace />} />

      {/* Client Portal routes */}
      <Route path="login" element={<ConveyancingLogin />} />
      <Route path="disclosure" element={<DisclosureForm />} />
      <Route path="dashboard" element={<ClientDashboard />} />

      {/* Catch-all for this portal */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}

export default App;
