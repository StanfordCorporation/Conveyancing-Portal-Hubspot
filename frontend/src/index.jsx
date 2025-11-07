import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Simple test component to verify deployment
function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 Stanford Legal Conveyancing Portal</h1>
      <p>Frontend deployed successfully!</p>
      <p><strong>Backend API:</strong> {import.meta.env.VITE_API_BASE_URL || 'Not configured'}</p>
      <p><strong>Stripe Key:</strong> {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Configured' : 'Not configured'}</p>
      <p><strong>Build Time:</strong> {new Date().toISOString()}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Environment Check:</h3>
        <ul>
          <li>React Version: {React.version}</li>
          <li>Environment: {import.meta.env.MODE}</li>
          <li>Base URL: {import.meta.env.BASE_URL}</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test API Connection:</h3>
        <button 
          onClick={async () => {
            try {
              const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/health`);
              const data = await response.json();
              alert(`API Response: ${JSON.stringify(data, null, 2)}`);
            } catch (error) {
              alert(`API Error: ${error.message}`);
            }
          }}
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test Backend Connection
        </button>
      </div>
    </div>
  );
}

// Temporarily use simple test app
function RootApp() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<TestApp />} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
