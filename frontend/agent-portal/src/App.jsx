import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import '../../src/index.css';

// Temporary simple agent portal to fix React error
function SimpleAgentPortal() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏢 Agent Portal</h1>
      <p>Agent portal is temporarily simplified to fix deployment issues.</p>
      <p>Full functionality will be restored after deployment is stable.</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/client/login" style={{ color: '#007bff', textDecoration: 'underline' }}>
          Go to Client Portal
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Simplified agent portal */}
      <Route path="*" element={<SimpleAgentPortal />} />
    </Routes>
  );
}

export default App;
