import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EmbeddedSigning from './EmbeddedSigning.jsx';
import './signing-status.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * SigningStatus Component
 * 
 * Shows signing status for multi-signer workflows
 * - If this signer's turn: Show embedded signing
 * - If waiting for others: Show waiting message
 * - If all complete: Show completion message
 */
export default function SigningStatus({ dealId, contactEmail, sellers, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [envelopeId, setEnvelopeId] = useState(null);
  const [signingStatus, setSigningStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dealId && contactEmail) {
      checkForExistingEnvelope();
    }
  }, [dealId, contactEmail]);

  // Check if envelope already exists in HubSpot (called on component mount)
  const checkForExistingEnvelope = async () => {
    try {
      setLoading(true);
      console.log('[SigningStatus] Checking for existing envelope for deal:', dealId);

      const response = await axios.get(`${API_BASE_URL}/api/docusign/check-envelope/${dealId}`);

      if (response.data.hasEnvelope) {
        console.log('[SigningStatus] Found existing envelope:', response.data.envelopeId);
        setEnvelopeId(response.data.envelopeId);
        
        // Check the current status of the existing envelope
        await checkEnvelopeStatus(response.data.envelopeId);
      } else {
        console.log('[SigningStatus] No existing envelope - ready to create one');
        setLoading(false);
      }
    } catch (err) {
      console.error('[SigningStatus] Error checking for existing envelope:', err);
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const checkSigningStatus = async () => {
    try {
      setLoading(true);
      console.log('[SigningStatus] Creating/getting signing session for deal:', dealId);

      // Build signers array from pre-loaded seller data (avoid redundant HubSpot fetch)
      const signersToSend = [];
      
      console.log('[SigningStatus] 🔍 Sellers data received:', sellers);
      
      if (sellers) {
        if (sellers.primarySeller) {
          console.log('[SigningStatus] Adding primary seller:', sellers.primarySeller.fullName, sellers.primarySeller.email);
          signersToSend.push({
            id: sellers.primarySeller.id,
            contactId: sellers.primarySeller.id,
            name: sellers.primarySeller.fullName,
            firstname: sellers.primarySeller.fullName?.split(' ')[0],
            lastname: sellers.primarySeller.fullName?.split(' ').slice(1).join(' '),
            email: sellers.primarySeller.email
          });
        }
        if (sellers.additionalSeller && sellers.additionalSeller.fullName !== 'N/A') {
          console.log('[SigningStatus] Adding additional seller:', sellers.additionalSeller.fullName, sellers.additionalSeller.email);
          signersToSend.push({
            id: sellers.additionalSeller.id,
            contactId: sellers.additionalSeller.id,
            name: sellers.additionalSeller.fullName,
            firstname: sellers.additionalSeller.fullName?.split(' ')[0],
            lastname: sellers.additionalSeller.fullName?.split(' ').slice(1).join(' '),
            email: sellers.additionalSeller.email
          });
        } else {
          console.log('[SigningStatus] ⚠️ No additional seller or is N/A:', sellers.additionalSeller);
        }
      } else {
        console.log('[SigningStatus] ⚠️ No sellers data provided!');
      }

      console.log(`[SigningStatus] Sending ${signersToSend.length} signer(s) from pre-loaded data:`);
      signersToSend.forEach((signer, idx) => {
        console.log(`  ${idx + 1}. ${signer.name} (${signer.email})`);
      });

      // This will either create a new envelope or return existing one
      const response = await axios.post(`${API_BASE_URL}/api/docusign/create-signing-session`, {
        dealId,
        signers: signersToSend  // Send sellers to avoid backend fetch
      });

      if (response.data.success) {
        const envId = response.data.envelopeId;
        setEnvelopeId(envId);
        
        // If this was an existing envelope, check its status
        if (response.data.existingEnvelope) {
          console.log('[SigningStatus] Using existing envelope, checking status...');
          await checkEnvelopeStatus(envId);
        } else {
          // New envelope created
          const additionalSigners = response.data.additionalSigners || [];
          
          setSigningStatus({
            canSign: true,
            isFirstSigner: true,
            additionalSigners,
            message: additionalSigners.length > 0 
              ? `After you sign, the document will be sent to ${additionalSigners.map(s => s.name).join(', ')} for signature.`
              : 'You are the only signer for this document.'
          });
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('[SigningStatus] Error:', err);
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const checkEnvelopeStatus = async (envId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/docusign/envelope-status`, {
        envelopeId: envId,
        dealId: dealId // Pass dealId to update HubSpot status
      });

      console.log('[SigningStatus] Envelope status response:', response.data);

      // Find signers from the response (or use stored signers if available)
      let signers = response.data.recipients?.signers || [];
      
      // If no signers in response, try to get from stored data
      if (signers.length === 0 && response.data.storedSigners) {
        signers = response.data.storedSigners.map(s => ({
          name: s.name,
          email: s.email,
          status: 'sent', // Default status
          routingOrder: s.routingOrder
        }));
      }
      
      // Normalize email for comparison (lowercase, trim)
      const normalizedContactEmail = contactEmail?.toLowerCase()?.trim();
      
      const currentSigner = signers.find(s => 
        s.email?.toLowerCase()?.trim() === normalizedContactEmail
      );
      
      const allSigners = signers.map(s => ({
        name: s.name,
        email: s.email,
        status: s.status || 'sent',
        order: s.routingOrder || s.routingOrder
      }));

      if (!currentSigner) {
        setSigningStatus({
          canSign: false,
          message: 'You are not a signer on this document.',
          allSigners
        });
      } else if (currentSigner.status === 'completed') {
        // This signer already completed
        const waitingFor = signers.filter(s => 
          s.status !== 'completed' && parseInt(s.routingOrder) > parseInt(currentSigner.routingOrder)
        );

        if (waitingFor.length > 0) {
          setSigningStatus({
            canSign: false,
            isCompleted: true,
            waitingFor: waitingFor.map(s => s.name),
            message: `You have signed this document. Waiting for ${waitingFor.map(s => s.name).join(', ')} to sign.`,
            allSigners
          });
        } else {
          setSigningStatus({
            canSign: false,
            isCompleted: true,
            allComplete: true,
            message: 'All signers have completed signing this document.',
            allSigners
          });
        }
      } else if (currentSigner.status === 'sent' || currentSigner.status === 'delivered') {
        // It's this signer's turn
        setSigningStatus({
          canSign: true,
          message: 'Ready for your signature',
          allSigners
        });
      } else {
        // Waiting for previous signers
        const previousSigners = signers.filter(s => 
          parseInt(s.routingOrder) < parseInt(currentSigner.routingOrder) &&
          s.status !== 'completed'
        );

        setSigningStatus({
          canSign: false,
          waitingFor: previousSigners.map(s => s.name),
          message: previousSigners.length > 0
            ? `Waiting for ${previousSigners.map(s => s.name).join(', ')} to sign first.`
            : 'Processing...',
          allSigners
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('[SigningStatus] Error checking envelope:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSigningComplete = (completedEnvelopeId) => {
    console.log('[SigningStatus] Signing completed:', completedEnvelopeId);
    
    // Refresh status to show "waiting for others" message
    if (envelopeId || completedEnvelopeId) {
      checkEnvelopeStatus(envelopeId || completedEnvelopeId);
    }
    
    if (onComplete) {
      onComplete(completedEnvelopeId);
    }
  };

  if (loading) {
    return (
      <div className="signing-status-container">
        <div className="status-loading">
          <div className="spinner"></div>
          <p>Checking signing status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="signing-status-container">
        <div className="status-error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Signing Status</h3>
          <p>{error}</p>
          <button onClick={checkSigningStatus} className="btn-primary retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If no envelope exists yet, show "Start Signing" button
  if (!envelopeId && !signingStatus) {
    return (
      <div className="signing-status-container">
        <div className="status-message status-ready">
          <div className="status-icon">📝</div>
          <div className="status-content">
            <h2>Ready to Sign</h2>
            <p>Click below to start the signing process for this property disclosure.</p>
            <button onClick={checkSigningStatus} className="btn-primary start-signing-btn">
              Start Signing Process
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!signingStatus) {
    return null;
  }

  // Show signing interface if it's this signer's turn
  if (signingStatus.canSign && !signingStatus.isCompleted) {
    // Build signers array to pass to EmbeddedSigning
    const signersToPass = [];
    if (sellers) {
      if (sellers.primarySeller) {
        signersToPass.push({
          id: sellers.primarySeller.id,
          contactId: sellers.primarySeller.id,
          name: sellers.primarySeller.fullName,
          email: sellers.primarySeller.email
        });
      }
      if (sellers.additionalSeller && sellers.additionalSeller.fullName !== 'N/A') {
        signersToPass.push({
          id: sellers.additionalSeller.id,
          contactId: sellers.additionalSeller.id,
          name: sellers.additionalSeller.fullName,
          email: sellers.additionalSeller.email
        });
      }
    }
    
    return (
      <div className="signing-status-container">
        {signingStatus.additionalSigners && signingStatus.additionalSigners.length > 0 && (
          <div className="signing-info-banner">
            <div className="info-icon">ℹ️</div>
            <div>
              <strong>Multi-Signer Document</strong>
              <p>{signingStatus.message}</p>
            </div>
          </div>
        )}
        <EmbeddedSigning 
          dealId={dealId}
          signers={signersToPass}
          onComplete={handleSigningComplete}
        />
      </div>
    );
  }

  // Show waiting/completion status
  return (
    <div className="signing-status-container">
      <div className={`status-message ${signingStatus.allComplete ? 'status-complete' : 'status-waiting'}`}>
        <div className="status-icon">
          {signingStatus.allComplete ? '✅' : '⏳'}
        </div>
        
        <div className="status-content">
          <h2>
            {signingStatus.allComplete ? 'Signing Completed' : 
             signingStatus.isCompleted ? 'You Have Signed' : 
             'Waiting to Sign'}
          </h2>
          
          <p className="status-description">{signingStatus.message}</p>

          {signingStatus.waitingFor && signingStatus.waitingFor.length > 0 && (
            <div className="waiting-list">
              <h4>Waiting on:</h4>
              <ul>
                {signingStatus.waitingFor.map((name, idx) => (
                  <li key={idx}>
                    <span className="waiting-dot"></span>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {signingStatus.allSigners && signingStatus.allSigners.length > 1 && (
            <div className="signer-progress">
              <h4>Signing Progress:</h4>
              <div className="signers-list">
                {signingStatus.allSigners
                  .sort((a, b) => parseInt(a.order) - parseInt(b.order))
                  .map((signer, idx) => (
                    <div key={idx} className={`signer-item signer-${signer.status}`}>
                      <div className="signer-number">{signer.order}</div>
                      <div className="signer-info">
                        <div className="signer-name">{signer.name}</div>
                        <div className="signer-status">
                          {signer.status === 'completed' ? '✅ Signed' :
                           signer.status === 'sent' || signer.status === 'delivered' ? '📝 Ready to sign' :
                           '⏳ Waiting'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {signingStatus.allComplete && (
            <div className="completion-actions">
              <p className="completion-note">
                🎉 All signatures have been collected! You can now proceed to the next step.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

