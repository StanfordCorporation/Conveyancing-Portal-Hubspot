import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentForm from './PaymentForm.jsx';
import './payment-instructions.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Payment Instructions Component
 * Displays payment information and Stripe payment form
 */
export default function PaymentInstructions({ dealId, quoteAmount: initialQuoteAmount, propertyAddress, onComplete }) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState(initialQuoteAmount || '0.00');
  const [loading, setLoading] = useState(!initialQuoteAmount);

  // Fetch quote if not provided
  useEffect(() => {
    if (!initialQuoteAmount || initialQuoteAmount === '0.00') {
      fetchQuote();
    }
  }, [dealId, initialQuoteAmount]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      console.log(`[Payment Instructions] 🔄 Fetching quote for deal: ${dealId}`);

      const response = await axios.post(`${API_BASE_URL}/quote/calculate`, {
        dealId
      });

      if (response.data.success) {
        setQuoteAmount(response.data.quote.grandTotal);
        console.log(`[Payment Instructions] ✅ Quote loaded: $${response.data.quote.grandTotal}`);
      }
    } catch (err) {
      console.error('[Payment Instructions] ❌ Error fetching quote:', err);
      setQuoteAmount('0.00');
    } finally {
      setLoading(false);
    }
  };

  // Convert quote amount to cents for Stripe
  // Assuming quoteAmount is in dollars (e.g., 175.48)
  const amountInCents = Math.round(parseFloat(quoteAmount) * 100);

  const handlePaymentSuccess = async () => {
    setPaymentComplete(true);
    setShowPaymentForm(false);
    console.log('[Payment Instructions] ✅ Payment completed successfully');
    
    // Wait a moment for webhook to process, then notify parent
    setTimeout(() => {
      if (onComplete) {
        console.log('[Payment Instructions] 🎯 Notifying parent of completion');
        onComplete();
      }
    }, 1500);
  };

  const handleCancelPayment = () => {
    setShowPaymentForm(false);
  };

  if (loading) {
    return (
      <div className="payment-instructions-container">
        <div className="payment-loading">
          <div className="spinner"></div>
          <p>Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="payment-instructions-container">
        <div className="payment-complete-message">
          <div className="complete-icon">✓</div>
          <h2>Payment Completed!</h2>
          <p>Thank you for your payment of ${quoteAmount} AUD</p>
          <div className="complete-details">
            <p>Your payment has been successfully processed.</p>
            <p>A confirmation email has been sent to your registered email address.</p>
            <p className="next-steps">
              <strong>Next Steps:</strong> Our team will now process your conveyancing request and contact you within 24-48 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showPaymentForm) {
    return (
      <div className="payment-instructions-container">
        <PaymentForm
          dealId={dealId}
          amount={amountInCents}
          onSuccess={handlePaymentSuccess}
          onCancel={handleCancelPayment}
        />

        {/* Test Cards Information (only show in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="test-cards-info">
            <h4>🧪 Test Cards (Development Mode)</h4>
            <ul>
              <li><strong>Success:</strong> 4242 4242 4242 4242</li>
              <li><strong>Requires Authentication:</strong> 4000 0025 0000 3155</li>
              <li><strong>Declined:</strong> 4000 0000 0000 9995</li>
              <li>Use any future expiry date and any 3-digit CVC</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="payment-instructions-container">
      <div className="payment-overview">
        <h2>Payment Instructions</h2>
        <p className="payment-subtitle">Complete your conveyancing search payment</p>

        <div className="payment-details-card">
          <div className="detail-row">
            <span className="detail-label">Property:</span>
            <span className="detail-value">{propertyAddress || 'Property Address'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Deal ID:</span>
            <span className="detail-value">{dealId}</span>
          </div>
          <div className="detail-row total-row">
            <span className="detail-label">Total Amount:</span>
            <span className="detail-value total-amount">${quoteAmount} AUD</span>
          </div>
        </div>

        <div className="payment-methods">
          <h3>Accepted Payment Methods</h3>
          <div className="payment-method-icons">
            <div className="payment-icon">💳 Credit Card</div>
            <div className="payment-icon">💳 Debit Card</div>
            <div className="payment-icon">🍎 Apple Pay</div>
          </div>
        </div>

        <div className="payment-info-box">
          <h4>💡 Payment Information</h4>
          <ul>
            <li>Your payment will be processed securely through Stripe</li>
            <li>You will receive an email confirmation once payment is complete</li>
            <li>All transactions are encrypted and secure (PCI DSS compliant)</li>
            <li>Refunds can be requested within 30 days</li>
          </ul>
        </div>

        <div className="payment-actions-section">
          <button
            className="proceed-payment-button"
            onClick={() => setShowPaymentForm(true)}
          >
            Proceed to Payment
          </button>
          <p className="security-note">
            <span className="lock-icon">🔒</span>
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
