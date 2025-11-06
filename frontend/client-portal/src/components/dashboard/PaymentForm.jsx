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
export default function PaymentForm({ dealId, amount, onSuccess, onCancel }) {
  const [stripePromiseState, setStripePromiseState] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      console.log('[Payment] ✅ Payment intent created');
    } catch (err) {
      console.error('[Payment] ❌ Error creating payment intent:', err);
      setError('Failed to initialize payment. Please try again.');
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
function CheckoutForm({ dealId, amount, onSuccess, onCancel }) {
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

      const { error: submitError } = await stripe.confirmPayment({
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
        console.log('[Payment] ✅ Payment succeeded!');
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
        <p>Your payment of ${(amount / 100).toFixed(2)} AUD has been processed.</p>
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
        <p className="payment-amount">Amount: ${(amount / 100).toFixed(2)} AUD</p>
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
          {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>

      <div className="payment-security">
        <span className="security-icon">🔒</span>
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  );
}
