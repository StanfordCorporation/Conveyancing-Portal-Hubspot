import React, { useState } from 'react';
import './BetaBanner.css';

export default function BetaBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="beta-banner">
      <div className="beta-banner-content">
        <div className="beta-banner-text">
          <span className="beta-badge">BETA</span>
          <span className="beta-message">
            You've been selected for our beta mode. Introducing the new Agent Portal.
            Please send your feedback through to{' '}
            <a href="mailto:innovations@stanford.au" className="beta-email">
              innovations@stanford.au
            </a>
          </span>
        </div>
        <button
          className="beta-banner-close"
          onClick={() => setIsVisible(false)}
          aria-label="Close banner"
        >
          ×
        </button>
      </div>
    </div>
  );
}
