import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api.js';
import './payment-form.css';

/**
 * Payment Form Component
 * Handles Stripe payment processing for property deals
 */

// Load Stripe publishable key
let stripePromise = null;

const getStripePromise = async () => {
  if (!stripePromise) {
    try {
      const response = await api.get('/payment/config');
      stripePromise = loadStripe(response.data.publishableKey);
      console.log('[Payment] ✅ Stripe loaded with publishable key');
    } catch (error) {
      console.error('[Payment] ❌ Error loading Stripe config:', error);
    }
  }
  return stripePromise;
};

/**
 * Main Payment Form Container
 */
export default function PaymentForm({ dealId, amount, paymentBreakdown, onSuccess, onCancel }) {
  const [stripePromiseState, setStripePromiseState] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [useDynamicDetection, setUseDynamicDetection] = useState(false);
  const [baseAmount, setBaseAmount] = useState(amount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);

  useEffect(() => {
    // Load Stripe
    getStripePromise().then(stripe => {
      setStripePromiseState(stripe);
    });

    // Create payment intent
    createPaymentIntent();
  }, [dealId, amount]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[Payment] 💳 Creating payment intent for deal ${dealId}`);
      console.log(`[Payment] 💰 Amount: $${(amount / 100).toFixed(2)}`);

      const response = await api.post('/payment/create-payment-intent', {
        dealId: dealId,
        amount: amount,
      });

      setClientSecret(response.data.clientSecret);
      setFeeBreakdown(response.data.feeBreakdown);
      setPaymentIntentId(response.data.paymentIntentId);
      setUseDynamicDetection(response.data.useDynamicDetection);
      setBaseAmount(response.data.baseAmount);

      console.log('[Payment] ✅ Payment intent created');
      console.log(`[Payment] 🔧 Dynamic detection: ${response.data.useDynamicDetection ? 'ENABLED' : 'DISABLED'}`);
      console.log(`[Payment] 💰 Base: ${response.data.feeBreakdown?.baseAmount}, Fee: ${response.data.feeBreakdown?.stripeFee}, Total: ${response.data.feeBreakdown?.totalAmount}`);
    } catch (err) {
      console.error('[Payment] ❌ Error creating payment intent:', err);

      // Check if payments are disabled
      if (err.response?.data?.paymentsDisabled) {
        setPaymentsDisabled(true);
        setError(err.response.data.message || 'Credit card payments are currently disabled.');
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Initializing secure payment...</p>
      </div>
    );
  }

  if (error) {
    // If payments are disabled, don't show anything
    if (paymentsDisabled) {
      return null;
    }

    // For other errors, show retry option
    return (
      <div className="payment-error">
        <h3>Payment Initialization Error</h3>
        <p>{error}</p>
        <button onClick={createPaymentIntent} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!clientSecret || !stripePromiseState) {
    return <div className="payment-loading">Loading payment form...</div>;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0E6DFF',
        colorBackground: '#ffffff',
        colorText: '#1F2937',
        colorDanger: '#EF4444',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="payment-container">
      <Elements stripe={stripePromiseState} options={options}>
        <CheckoutForm
          dealId={dealId}
          amount={amount}
          feeBreakdown={feeBreakdown}
          paymentBreakdown={paymentBreakdown}
          paymentIntentId={paymentIntentId}
          useDynamicDetection={useDynamicDetection}
          baseAmount={baseAmount}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
}

/**
 * Checkout Form with Stripe Elements
 */
function CheckoutForm({ dealId, amount, feeBreakdown, paymentBreakdown, paymentIntentId, useDynamicDetection, baseAmount, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('[Payment] 💳 Processing payment...');
      console.log(`[Payment] 🔧 Dynamic detection: ${useDynamicDetection ? 'ENABLED' : 'DISABLED'}`);

      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?payment=success&dealId=${dealId}`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        console.error('[Payment] ❌ Payment failed:', submitError.message);
        setError(submitError.message);
        setProcessing(false);
      } else {
        console.log('[Payment] ✅ Payment authorized!');

        // If dynamic detection is enabled, adjust and capture
        if (useDynamicDetection) {
          console.log('[Payment] 🔍 Detecting card country and adjusting fee...');
          try {
            const adjustResponse = await api.post(`/payment/adjust-and-capture/${paymentIntentId}`, {
              baseAmount: baseAmount,
            });

            console.log(`[Payment] 🌍 Card type: ${adjustResponse.data.cardType}`);
            console.log(`[Payment] ✅ Payment captured with adjusted fee: ${adjustResponse.data.feeBreakdown.totalAmount}`);
          } catch (adjustError) {
            console.error('[Payment] ❌ Error adjusting fee:', adjustError);
            setError('Payment authorized but fee adjustment failed. Please contact support.');
            setProcessing(false);
            return;
          }
        }

        setSucceeded(true);
        setProcessing(false);

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('[Payment] ❌ Payment error:', err);
      setError('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="payment-success">
        <div className="success-icon">✓</div>
        <h2>Payment Successful!</h2>
        <p>Your payment of {feeBreakdown?.totalAmount || `$${(amount / 100).toFixed(2)}`} AUD has been processed.</p>
        <p className="success-message">
          Thank you for your payment. You will receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-header">
        <h3>Complete Payment</h3>

        {feeBreakdown ? (
          <div className="payment-breakdown">
            {paymentBreakdown ? (
              <>
                <div className="breakdown-row">
                  <span className="breakdown-label">Searches Fee:</span>
                  <span className="breakdown-value">A${parseFloat(paymentBreakdown.searches).toFixed(2)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">Conveyancing Deposit:</span>
                  <span className="breakdown-value">A${parseFloat(paymentBreakdown.deposit).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="breakdown-row">
                <span className="breakdown-label">Conveyancing Fee:</span>
                <span className="breakdown-value">{feeBreakdown.baseAmount}</span>
              </div>
            )}
            <div className="breakdown-row surcharge">
              <span className="breakdown-label">
                Card Processing Surcharge ({feeBreakdown.feePercentage}):
              </span>
              <span className="breakdown-value">{feeBreakdown.stripeFee}</span>
            </div>
            <div className="breakdown-row total">
              <span className="breakdown-label">Total Charge:</span>
              <span className="breakdown-value total-amount">{feeBreakdown.totalAmount}</span>
            </div>
            <p className="surcharge-notice">
              A {feeBreakdown.feePercentage} card processing surcharge applies to this payment.
            </p>
          </div>
        ) : (
          <p className="payment-amount">Amount: ${(amount / 100).toFixed(2)} AUD</p>
        )}
      </div>

      <div className="payment-element-container">
        <PaymentElement />
      </div>

      {error && (
        <div className="payment-error-message">
          <span className="error-icon">⚠</span>
          {error}
        </div>
      )}

      <div className="payment-actions">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-button"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="pay-button"
          disabled={!stripe || processing}
        >
          {processing ? 'Processing...' : `Pay ${feeBreakdown?.totalAmount || `$${(amount / 100).toFixed(2)}`}`}
        </button>
      </div>

      <div className="payment-security">
        <span className="security-icon">🔒</span>
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  );
}
