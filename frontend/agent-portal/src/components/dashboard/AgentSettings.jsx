import React from 'react';
import { Settings } from 'lucide-react';

export default function AgentSettings() {
  return (
    <div className="agent-settings">
      <div className="content-header">
        <h1 className="content-title">Settings</h1>
        <p className="content-subtitle">Coming Soon</p>
      </div>

      <div className="empty-state">
        <Settings size={48} color="var(--gray-400)" />
        <h3>Feature Coming Soon</h3>
        <p>Let us know if you want us to build something for you at <a href="mailto:innovations@stanford.au" style={{ color: 'var(--primary-blue)', textDecoration: 'underline' }}>innovations@stanford.au</a></p>
      </div>
    </div>
  );
}

