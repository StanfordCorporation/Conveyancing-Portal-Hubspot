import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../services/api.js';
import './dynamic-quote.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * DynamicQuote Component
 *
 * Displays a dynamically calculated quote based on property questionnaire answers
 * Updates automatically when questionnaire data changes
 *
 * Props:
 * - dealId: HubSpot deal ID
 * - onUpdate: Callback function called when quote is recalculated
 * - onBack: Callback to navigate back to questionnaire
 * - onSubmit: Callback to submit questionnaire
 * - submitting: Boolean indicating if submission is in progress
 */
export default function DynamicQuote({ dealId, onUpdate, onBack, onSubmit, submitting = false, readOnly = false }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (dealId) {
      fetchQuote();
    }
  }, [dealId]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[DynamicQuote] 🔄 Fetching fresh quote from backend for deal: ${dealId}`);

      const response = await axios.post(`${API_BASE_URL}/quote/calculate`, {
        dealId
      });

      if (response.data.success) {
        setQuote(response.data.quote);
        setMetadata(response.data.metadata);
        console.log(`[DynamicQuote] ✅ Quote loaded: $${response.data.quote.grandTotal}`);

        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate(response.data.quote);
        }
      } else {
        throw new Error('Failed to calculate quote');
      }
    } catch (err) {
      console.error('[DynamicQuote] ❌ Error fetching quote:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    try {
      setAccepting(true);
      console.log(`[DynamicQuote] ✅ Accepting quote for deal: ${dealId}`);
      
      // Update deal stage to Awaiting Retainer (Step 4 - Signature)
      // Using api instance which automatically adds Authorization header
      const response = await api.patch(
        `/client/property/${dealId}/stage`,
        {
          stage: '1923682792', // AWAITING_RETAINER stage ID
          stepNumber: 4
        }
      );

      if (response.data.success) {
        console.log(`[DynamicQuote] 🎉 Quote accepted! Deal progressed to Awaiting Signature`);
        
        // Reload the page to refresh the dashboard with new stage
        window.location.reload();
      } else {
        throw new Error('Failed to accept quote');
      }
    } catch (err) {
      console.error('[DynamicQuote] ❌ Error accepting quote:', err);
      alert(err.response?.data?.error || err.message || 'Failed to accept quote. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="quote-container">
        <div className="quote-loading">
          <div className="spinner"></div>
          <p>Calculating your quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quote-container">
        <div className="quote-error">
          <h3>Unable to Calculate Quote</h3>
          <p>{error}</p>
          <button onClick={fetchQuote} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <div className="quote-container">
      <div className="quote-header">
        <h2>Your Property Search Quote</h2>
        {metadata && (
          <div className="quote-metadata">
            <p className="property-address">{metadata.propertyAddress}</p>
            <p className="calculated-at">
              Calculated: {new Date(metadata.calculatedAt).toLocaleString('en-AU')}
            </p>
          </div>
        )}
      </div>

      {/* Base Searches */}
      <div className="quote-section">
        <h3>Essential Searches</h3>
        <p className="section-description">These searches are required for every property transaction</p>
        <div className="search-items">
          {quote.baseSearches.map((search, index) => (
            <div key={index} className="search-item">
              <div className="search-name">{search.name}</div>
              <div className="search-cost">{formatCurrency(search.cost)}</div>
            </div>
          ))}
        </div>
        <div className="section-total">
          <span>Essential Searches Total:</span>
          <span className="total-amount">{formatCurrency(quote.baseTotal)}</span>
        </div>
      </div>

      {/* Conditional Searches */}
      {quote.conditionalSearches.length > 0 && (
        <div className="quote-section conditional-section">
          <h3>Additional Searches Required</h3>
          <p className="section-description">Based on your property questionnaire answers</p>
          <div className="search-items">
            {quote.conditionalSearches.map((search, index) => (
              <div key={index} className="search-item">
                <div className="search-info">
                  <div className="search-name">{search.name}</div>
                  <div className="search-trigger">{search.trigger}</div>
                </div>
                <div className="search-cost">{formatCurrency(search.cost)}</div>
              </div>
            ))}
          </div>
          <div className="section-total">
            <span>Additional Searches Total:</span>
            <span className="total-amount">{formatCurrency(quote.conditionalTotal)}</span>
          </div>
        </div>
      )}

      {/* Grand Total */}
      <div className="quote-grand-total">
        <div className="total-label">Total Quote</div>
        <div className="total-amount">{formatCurrency(quote.grandTotal)}</div>
      </div>

      {/* Detailed Breakdown (Collapsible) */}
      <details className="quote-breakdown">
        <summary>View Detailed Breakdown</summary>
        <div className="breakdown-content">
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Search Name</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {quote.breakdown.map((item, index) => (
                <tr key={index} className={item.included ? 'included' : 'excluded'}>
                  <td>{item.name}</td>
                  <td>
                    <span className={`status-badge ${item.included ? 'status-included' : 'status-excluded'}`}>
                      {item.included ? '✓ Included' : '✗ Excluded'}
                    </span>
                  </td>
                  <td className="reason-cell">{item.reason}</td>
                  <td className="cost-cell">{formatCurrency(item.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Phase 3.5: Read-only notice */}
      {readOnly && (
        <div className="read-only-notice">
          <p>This section is read-only. Payment has been completed.</p>
        </div>
      )}

      {/* Navigation and Action Buttons */}
      <div className="quote-actions">
        {onBack && (
          <button onClick={onBack} className="btn-secondary" disabled={readOnly}>
            ← Back to Questionnaire
          </button>
        )}

        <button onClick={fetchQuote} className="btn-secondary refresh-btn" disabled={readOnly}>
          Recalculate Quote
        </button>

        {onSubmit && (
          <button
            onClick={onSubmit}
            className="btn-primary submit-btn"
            disabled={submitting || readOnly}
          >
            {submitting ? 'Submitting...' : 'Submit Questionnaire ✓'}
          </button>
        )}

        {!onSubmit && (
          <button
            onClick={handleAcceptQuote}
            disabled={accepting || readOnly}
            className="btn-primary accept-quote-btn"
            disabled={accepting}
          >
            {accepting ? 'Accepting...' : 'Accept Your Quote ✓'}
          </button>
        )}
      </div>

      {/* Info Note */}
      <div className="quote-note">
        <p>
          💡 <strong>Note:</strong> This quote is calculated based on your questionnaire answers.
          {onBack && ' If you need to make changes, click "Back to Questionnaire" to edit your responses.'}
          {!onSubmit && ' Once you\'re satisfied with the quote, click "Accept Your Quote" to proceed to the signature step.'}
        </p>
      </div>
    </div>
  );
}
