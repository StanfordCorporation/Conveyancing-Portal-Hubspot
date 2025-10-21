import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Import Portal Apps
import ClientPortal from '../client-portal/src/App';
import AgentPortal from '../agent-portal/src/App';
import DisclosureForm from '../client-portal/src/components/disclosure/DisclosureForm';

function RootApp() {
  return (
    <Router>
      <Routes>
        {/* Disclosure Form - Standalone entry point */}
        <Route path="/disclosure" element={<DisclosureForm />} />

        {/* Client Portal - All routes under /client */}
        <Route path="/client/*" element={<ClientPortal />} />

        {/* Agent Portal - All routes under /agent */}
        <Route path="/agent/*" element={<AgentPortal />} />

        {/* Default redirect to client portal */}
        <Route path="/" element={<Navigate to="/client/login" replace />} />

        {/* Catch all - redirect to client */}
        <Route path="*" element={<Navigate to="/client/login" replace />} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
