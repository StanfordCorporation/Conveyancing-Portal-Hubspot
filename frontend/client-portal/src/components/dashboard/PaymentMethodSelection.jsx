import React from 'react';
import './payment-method-selection.css';

/**
 * Payment Method Selection Component
 * Allows users to choose between Credit Card (Stripe) or Bank Transfer
 */
export default function PaymentMethodSelection({ amount, onSelectMethod }) {
  const handleMethodSelect = (method) => {
    console.log(`[Payment Method Selection] Selected: ${method}`);
    onSelectMethod(method);
  };

  return (
    <div className="payment-method-selection-container">
      <div className="payment-method-header">
        <h2>Choose Payment Method</h2>
        <p className="payment-subtitle">Select how you'd like to pay for your conveyancing searches</p>
        <div className="payment-amount-display">
          <span className="amount-label">Amount Due:</span>
          <span className="amount-value">${amount} AUD</span>
        </div>
      </div>

      <div className="payment-methods-grid">
        {/* Credit Card Payment - Recommended */}
        <div 
          className="payment-method-card recommended"
          onClick={() => handleMethodSelect('Stripe')}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && handleMethodSelect('Stripe')}
        >
          <div className="recommended-badge">Recommended</div>
          <div className="method-icon">💳</div>
          <h3 className="method-title">Pay by Credit Card</h3>
          <div className="method-feature instant-badge">⚡ Instant Processing</div>
          <div className="method-description">
            <p>Pay securely with your credit or debit card</p>
            <ul className="method-features">
              <li>✓ Immediate search ordering</li>
              <li>✓ Secure payment via Stripe</li>
              <li>✓ Instant confirmation</li>
              <li>✓ Accepts Visa, Mastercard, Amex</li>
            </ul>
          </div>
          <div className="method-note info-note">
            💡 <strong>Credit Card Payment allows us to Order searches immediately</strong>
          </div>
          <button className="select-method-button primary">
            Select Credit Card
          </button>
        </div>

        {/* Bank Transfer Payment */}
        <div 
          className="payment-method-card"
          onClick={() => handleMethodSelect('Bank Transfer')}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && handleMethodSelect('Bank Transfer')}
        >
          <div className="method-icon">🏦</div>
          <h3 className="method-title">Pay by Bank Transfer</h3>
          <div className="method-feature">Manual Processing</div>
          <div className="method-description">
            <p>Transfer funds directly to our trust account</p>
            <ul className="method-features">
              <li>✓ Direct bank transfer</li>
              <li>✓ Pay from your bank account</li>
              <li>✓ No card required</li>
              <li>✓ We'll provide account details</li>
            </ul>
          </div>
          <div className="method-note warning-note">
            ⚠️ <strong>There might be a delay of a few hours</strong> for processing after we receive your transfer
          </div>
          <button className="select-method-button secondary">
            Select Bank Transfer
          </button>
        </div>
      </div>

      <div className="payment-security-footer">
        <span className="security-icon">🔒</span>
        <p>All payments are secure and encrypted. Your payment information is never stored on our servers.</p>
      </div>
    </div>
  );
}

