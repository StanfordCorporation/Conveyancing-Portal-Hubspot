/**
 * DocuSign Signing Complete Handler
 *
 * This page is loaded after DocuSign signing completes.
 * If loaded in an iframe (embedded signing), it redirects the parent window.
 * Otherwise, it redirects normally.
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function SigningComplete() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get query parameters from DocuSign
    const event = searchParams.get('event');
    const envelopeId = searchParams.get('envelopeId');

    console.log('[DocuSign Complete] Event:', event);
    console.log('[DocuSign Complete] Envelope ID:', envelopeId);

    // Determine if we're in an iframe
    const isInIframe = window.self !== window.top;

    // Target URL to redirect to - go to Step 5 (payment) with current property
    const dashboardUrl = '/dashboard?signing=complete&step=5' +
      (envelopeId ? `&envelopeId=${envelopeId}` : '') +
      (event ? `&event=${event}` : '');

    console.log('[DocuSign Complete] Detected iframe:', isInIframe);
    console.log('[DocuSign Complete] Redirecting to:', dashboardUrl);

    // ALWAYS try to redirect parent window (works for both iframe and non-iframe)
    try {
      if (isInIframe) {
        // In iframe - send message to parent
        window.parent.postMessage({
          type: 'DOCUSIGN_COMPLETE',
          event,
          envelopeId,
          redirectTo: dashboardUrl
        }, window.location.origin);  // Use specific origin instead of '*'
        
        console.log('[DocuSign Complete] Message sent to parent window');
      } else {
        // Not in iframe - redirect normally
        window.location.href = dashboardUrl;
      }
    } catch (error) {
      console.error('[DocuSign Complete] Error during redirect:', error);
      // Fallback: Show manual link
    }
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '1rem'
        }}>
          ✅
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#333'
        }}>
          Signing Complete
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '1rem'
        }}>
          Redirecting you back to your dashboard...
        </p>
        <div style={{
          width: '200px',
          height: '4px',
          backgroundColor: '#e0e0e0',
          borderRadius: '2px',
          overflow: 'hidden',
          margin: '0 auto'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#4CAF50',
            animation: 'progress 2s ease-in-out infinite',
            transformOrigin: 'left'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.5); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}

export default SigningComplete;
