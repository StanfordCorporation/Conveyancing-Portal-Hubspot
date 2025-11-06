import React from 'react';
import EmbeddedSigning from './EmbeddedSigning.jsx';
import './docusign-wrapper.css';

/**
 * DocuSignAccessTokenWrapper Component
 *
 * NOTE: JWT authentication is now handled automatically by the backend!
 * This wrapper is simplified - no more manual token management needed.
 *
 * Props:
 * - dealId: HubSpot deal ID
 */
export default function DocuSignAccessTokenWrapper({ dealId }) {
  const handleSigningComplete = (envelopeId) => {
    console.log('[DocuSignWrapper] Signing completed:', envelopeId);
    alert('Document signed successfully!');
    // TODO: Update deal status in HubSpot
    // TODO: Move to next step (payment)
  };

  return (
    <div className="docusign-wrapper">
      <div className="token-status-bar">
        <div className="token-status">
          <span className="status-indicator active"></span>
          <span className="status-text">DocuSign Connected (JWT Authentication)</span>
        </div>
      </div>

      <EmbeddedSigning
        dealId={dealId}
        onComplete={handleSigningComplete}
      />
    </div>
  );
}
