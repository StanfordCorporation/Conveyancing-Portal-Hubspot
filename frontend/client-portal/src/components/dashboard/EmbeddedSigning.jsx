import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './embedded-signing.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * EmbeddedSigning Component
 *
 * Displays DocuSign embedded signing iframe for document signature
 * NOTE: JWT authentication is now handled automatically by the backend!
 *
 * Props:
 * - dealId: HubSpot deal ID
 * - signers: Array of signers (optional, avoids backend fetch)
 * - onComplete: Callback when signing is complete
 */
export default function EmbeddedSigning({ dealId, signers, onComplete}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signingUrl, setSigningUrl] = useState(null);
  const [envelopeId, setEnvelopeId] = useState(null);
  const [signerInfo, setSignerInfo] = useState(null);

  useEffect(() => {
    if (dealId) {
      createSigningSession();
    }
  }, [dealId]);

  const createSigningSession = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[EmbeddedSigning] Creating signing session for deal: ${dealId}`);

      // Build request body
      const requestBody = { dealId };
      
      // Include signers if provided (avoids backend HubSpot fetch)
      if (signers && signers.length > 0) {
        console.log(`[EmbeddedSigning] Sending ${signers.length} signer(s) to backend`);
        requestBody.signers = signers;
      }

      // No need to send accessToken - JWT authentication handles it on backend!
      const response = await axios.post(`${API_BASE_URL}/docusign/create-signing-session`, requestBody);

      if (response.data.success) {
        console.log(`[EmbeddedSigning] 📦 Response data:`, response.data);
        console.log(`[EmbeddedSigning] 🔗 Signing URL:`, response.data.redirectUrl);
        
        setSigningUrl(response.data.redirectUrl);
        setEnvelopeId(response.data.envelopeId);
        setSignerInfo({
          name: response.data.signerName,
          email: response.data.signerEmail
        });

        console.log(`[EmbeddedSigning] ✅ Signing URL set - Envelope: ${response.data.envelopeId}`);
      } else {
        throw new Error('Failed to create signing session');
      }

    } catch (err) {
      console.error('[EmbeddedSigning] ❌ Error creating signing session:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load signing form');
    } finally {
      setLoading(false);
    }
  };

  // Listen for signing completion events from DocuSign iframe
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('[EmbeddedSigning] Message received:', event.origin, event.data);

      // Handle completion message from our SigningComplete component
      if (event.data?.type === 'DOCUSIGN_COMPLETE') {
        console.log('[EmbeddedSigning] ✅ Signing completed (from completion handler)!');
        console.log('[EmbeddedSigning] Envelope ID:', event.data.envelopeId);

        // Call onComplete callback to trigger parent component actions
        if (onComplete) {
          onComplete(event.data.envelopeId || envelopeId);
        }
        return;
      }

      // Verify the message is from DocuSign
      if (event.origin.includes('docusign')) {
        console.log('[EmbeddedSigning] Message from DocuSign:', event.data);

        // Check if signing is complete
        if (event.data === 'signing_complete' || event.data.event === 'signing_complete') {
          console.log('[EmbeddedSigning] ✅ Signing completed!');
          if (onComplete) {
            onComplete(envelopeId);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [envelopeId, onComplete]);

  if (loading) {
    return (
      <div className="signing-container">
        <div className="signing-loading">
          <div className="spinner"></div>
          <p>Preparing your document for signature...</p>
          <p className="loading-subtext">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="signing-container">
        <div className="signing-error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Signing Form</h3>
          <p>{error}</p>
          <button onClick={createSigningSession} className="btn-primary retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signing-container">
      <div className="signing-header">
        <div className="signing-info">
          <h2>Sign Your Document</h2>
          {signerInfo && (
            <p className="signer-details">
              Signing as: <strong>{signerInfo.name}</strong> ({signerInfo.email})
            </p>
          )}
        </div>
        <div className="envelope-id">
          Envelope: <code>{envelopeId}</code>
          <button 
            onClick={createSigningSession} 
            className="btn-secondary refresh-btn"
            style={{ marginLeft: '10px', fontSize: '12px', padding: '5px 10px' }}
            title="Refresh if the signing page doesn't load"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="signing-instructions">
        <p>📝 Please review and sign the document below. Click on the signature field to place your signature.</p>
      </div>

      {signingUrl && (
        <div className="signing-iframe-wrapper">
          {console.log('[EmbeddedSigning] 🎯 Loading iframe with URL:', signingUrl)}
          <iframe
            src={signingUrl}
            className="signing-iframe"
            title="DocuSign Embedded Signing"
            frameBorder="0"
            allow="camera; microphone"
            onLoad={() => console.log('[EmbeddedSigning] ✅ Iframe loaded')}
            onError={(e) => console.error('[EmbeddedSigning] ❌ Iframe error:', e)}
          />
        </div>
      )}
      
      {!signingUrl && (
        <div className="signing-error">
          <p>⚠️ No signing URL available</p>
        </div>
      )}

      <div className="signing-footer">
        <p className="security-note">
          🔒 This signing session is secured by DocuSign. Your signature is legally binding.
        </p>
      </div>
    </div>
  );
}
