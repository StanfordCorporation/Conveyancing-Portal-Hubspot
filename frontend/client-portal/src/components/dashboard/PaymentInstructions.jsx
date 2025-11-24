import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentForm from './PaymentForm.jsx';
import PaymentMethodSelection from './PaymentMethodSelection.jsx';
import BankTransferDetails from './BankTransferDetails.jsx';
import api from '../../services/api.js';
import './payment-instructions.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Payment Instructions Component
 * Displays payment information and Stripe payment form
 */
export default function PaymentInstructions({ dealId, quoteAmount: initialQuoteAmount, propertyAddress, onComplete, isActive, readOnly = false }) {
  const [paymentMethod, setPaymentMethod] = useState(null); // 'Stripe' or 'Bank Transfer'
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState(initialQuoteAmount || '0.00');
  const [loading, setLoading] = useState(!initialQuoteAmount);
  const [bankTransferRecorded, setBankTransferRecorded] = useState(false);

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

  // Handle payment method selection
  const handleMethodSelect = async (method) => {
    console.log(`[Payment Instructions] Method selected: ${method}`);
    setPaymentMethod(method);

    if (method === 'Stripe') {
      // Show Stripe payment form
      setShowPaymentForm(true);
    }
    // If Bank Transfer, we'll show the BankTransferDetails component
  };

  // Handle bank transfer confirmation
  const handleBankTransferConfirm = async () => {
    try {
      console.log('[Payment Instructions] Recording bank transfer payment...');

      // Call backend to record bank transfer selection
      await api.post(`/client/property/${dealId}/bank-transfer`, {
        amount: quoteAmount
      });

      console.log('[Payment Instructions] Bank transfer recorded successfully');
      setBankTransferRecorded(true);

      // Wait a moment, then notify parent
      setTimeout(() => {
        if (onComplete) {
          console.log('[Payment Instructions] 🎯 Notifying parent of completion');
          onComplete();
        }
      }, 1500);

    } catch (error) {
      console.error('[Payment Instructions] Error recording bank transfer:', error);
      alert('Failed to record bank transfer. Please try again.');
    }
  };

  // Generate reference number - use matter_uid from Smokeball or client phone
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    const fetchReferenceNumber = async () => {
      try {
        console.log(`[Payment Instructions] 🔄 Fetching reference number...`);
        
        // Fetch deal to get matter_uid (with cache-busting to prevent stale data)
        const response = await api.get(`/client/property/${dealId}?_t=${Date.now()}`);
        const dealData = response.data;

        console.log(`[Payment Instructions] 📋 Deal data received:`, {
          matter_uid: dealData.matter_uid || 'NOT SET',
          smokeball_lead_uid: dealData.smokeball_lead_uid || 'NOT SET',
          has_phone: !!dealData.primarySeller?.phone
        });

        // Try to use matter_uid first
        if (dealData.matter_uid) {
          setReferenceNumber(dealData.matter_uid);
          console.log(`[Payment Instructions] ✅ Using matter_uid as reference: ${dealData.matter_uid}`);
        } else if (dealData.primarySeller?.phone) {
          // Use client phone number if matter_uid not available
          const phoneRef = dealData.primarySeller.phone.replace(/\D/g, ''); // Remove non-digits
          setReferenceNumber(phoneRef);
          console.log(`[Payment Instructions] ⚠️ matter_uid not available, using phone as reference: ${phoneRef}`);
        } else {
          // Fallback to deal ID
          const shortId = dealId.slice(-4);
          setReferenceNumber(`25-${shortId}`);
          console.log(`[Payment Instructions] ⚠️ No matter_uid or phone, using deal ID as reference: 25-${shortId}`);
        }
      } catch (error) {
        console.error('[Payment Instructions] ❌ Error fetching reference:', error);
        // Fallback to deal ID
        const shortId = dealId.slice(-4);
        setReferenceNumber(`25-${shortId}`);
      }
    };

    // Refetch whenever user navigates to payment section
    if (dealId && paymentMethod === 'Bank Transfer' && isActive) {
      fetchReferenceNumber();
    }
  }, [dealId, paymentMethod, isActive]);

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

  if (paymentComplete || bankTransferRecorded) {
    const message = bankTransferRecorded 
      ? 'Bank Transfer Recorded!'
      : 'Payment Completed!';
    const description = bankTransferRecorded
      ? 'We will notify you once we receive your bank transfer.'
      : 'Your payment has been successfully processed.';

    return (
      <div className="payment-instructions-container">
        <div className="payment-complete-message">
          <div className="complete-icon">✓</div>
          <h2>{message}</h2>
          <p>Amount: ${quoteAmount} AUD</p>
          <div className="complete-details">
            <p>{description}</p>
            <p>A confirmation email has been sent to your registered email address.</p>
            <p className="next-steps">
              <strong>Next Steps:</strong> Our team will process your conveyancing request and contact you within 24-48 hours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show payment method selection first
  if (!paymentMethod) {
    return (
      <div className="payment-instructions-container">
        <PaymentMethodSelection 
          amount={quoteAmount}
          onSelectMethod={handleMethodSelect}
        />
      </div>
    );
  }

  // Show Stripe payment form if Credit Card selected
  if (paymentMethod === 'Stripe' && showPaymentForm) {
    return (
      <div className="payment-instructions-container">
        <PaymentForm
          dealId={dealId}
          amount={amountInCents}
          onSuccess={handlePaymentSuccess}
          onCancel={handleCancelPayment}
        />
      </div>
    );
  }

  // Show Bank Transfer details if Bank Transfer selected
  if (paymentMethod === 'Bank Transfer') {
    return (
      <div className="payment-instructions-container">
        <BankTransferDetails 
          amount={quoteAmount}
          dealId={dealId}
          referenceNumber={referenceNumber || 'Loading...'}
          onConfirm={handleBankTransferConfirm}
        />
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
