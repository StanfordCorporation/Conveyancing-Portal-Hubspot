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
  const [conveyancing, setConveyancing] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

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
        setConveyancing(response.data.conveyancing);
        console.log(`[DynamicQuote] ✅ Quote loaded: $${response.data.quote.grandTotal}`);
        console.log(`[DynamicQuote] 🏢 Conveyancing loaded: $${response.data.conveyancing?.totalFee}`);

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

  // Merge all searches into a single list
  const getAllSearches = () => {
    if (!quote) return [];
    return [
      ...quote.baseSearches,
      ...quote.conditionalSearches
    ];
  };

  // Handle the primary CTA action
  const handlePrimaryAction = () => {
    if (onSubmit) {
      onSubmit();
    } else {
      handleAcceptQuote();
    }
  };

  const isPrimaryActionLoading = submitting || accepting;

  if (loading) {
    return (
      <div className="quote-loading-container">
        <div className="quote-loading">
          <div className="spinner"></div>
          <p>Calculating your quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quote-error-container">
        <div className="quote-error">
          <h3>Unable to Calculate Quote</h3>
          <p>{error}</p>
          <button onClick={fetchQuote} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!quote || !conveyancing) {
    return null;
  }

  const allSearches = getAllSearches();
  const totalEstimate = quote.grandTotal + conveyancing.totalFee;
  const payNowAmount = quote.grandTotal + conveyancing.depositNow;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Quote Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-7">
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Custom Quote</h2>
          {metadata?.propertyAddress && (
            <p className="text-blue-100 text-sm mt-2 font-medium">{metadata.propertyAddress}</p>
          )}
        </div>

        {/* Section 1: Property Searches */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Searches</h3>
          
          {/* Search Items List */}
          <div className="space-y-3">
            {allSearches.map((search, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <span className="text-gray-700">{search.name}</span>
                <span className="font-medium text-gray-900">{formatCurrency(search.cost)}</span>
              </div>
            ))}
          </div>

          {/* Required Searches Cost Total */}
          <div className="pt-4 mt-4 border-t-2 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Required Searches Cost</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(quote.grandTotal)}</span>
            </div>
          </div>

          {/* Accordion: View Detailed Breakdown */}
          <div className="mt-4">
            <button
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <span>View breakdown details</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {breakdownOpen && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="pb-3 font-medium">Search</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Reason</th>
                      <th className="pb-3 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quote.breakdown.map((item, index) => (
                      <tr key={index} className={item.included ? '' : 'opacity-50'}>
                        <td className="py-2 text-gray-800">{item.name}</td>
                        <td className="py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.included 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.included ? '✓ Included' : '✗ Excluded'}
                          </span>
                        </td>
                        <td className="py-2 text-gray-600">{item.reason}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Professional Conveyancing */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-700 mb-4">
            Professional <span className="font-normal">Fixed Fees for your Entire End-to-End Sale Conveyance</span>
          </h3>

          {/* Deposit now (held in trust) */}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Deposit now (held in trust)</span>
            <span className="font-semibold text-gray-900">{formatCurrency(conveyancing.depositNow)}</span>
          </div>

          {/* Not Payable until Settlement */}
          <div className="flex justify-between items-center py-2 mb-4">
            <span className="text-gray-700">Not Payable until Settlement</span>
            <span className="font-semibold text-gray-900">{formatCurrency(conveyancing.settlementAmount)}</span>
          </div>

          {/* Disclosure Defense Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r p-3 mb-3">
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong className="text-gray-900">Incorrect Disclosure could give a buyer a terminable right until settlement.</strong> So, we include it at no extra cost as part of our Fixed Fee for Conveyancing.
            </p>
          </div>

          {/* Final statement */}
          <p className="text-gray-700 text-sm">
            This allows us to <strong className="text-gray-900">Defend your Disclosure all the way until Settlement.</strong>
          </p>
        </div>

        {/* Section 3: Payment Summary Footer */}
        <div className="bg-gray-50 px-8 py-6">
          {/* Start Now & Pay Button - Primary CTA */}
          {!readOnly && (
            <button
              onClick={handlePrimaryAction}
              disabled={isPrimaryActionLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl p-4 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <p className="text-lg font-bold tracking-wide">
                    {isPrimaryActionLoading ? 'Processing...' : `Order Searches and Start Now`}
                  </p>
                  <p className="text-emerald-100 text-sm mt-1">Required Searches + Conveyancing Deposit</p>
                </div>
                <span className="text-3xl font-extrabold">{formatCurrency(payNowAmount)}</span>
              </div>
            </button>
          )}

          {/* Read-only state: show info instead of button */}
          {readOnly && (
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <p className="text-lg font-bold tracking-wide">PAID</p>
                  <p className="text-emerald-100 text-sm mt-1">Required Searches + Conveyancing Deposit</p>
                </div>
                <span className="text-3xl font-extrabold">{formatCurrency(payNowAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Read-only Notice */}
      {readOnly && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">This section is read-only. Payment has been completed.</p>
        </div>
      )}

      {/* Secondary Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        {onBack && (
          <button 
            onClick={onBack} 
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={readOnly}
          >
            ← Back to Questionnaire
          </button>
        )}

        <button 
          onClick={fetchQuote} 
          className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          disabled={readOnly}
        >
          Recalculate Quote
        </button>
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Note:</strong> This quote is calculated based on your questionnaire answers.
          {onBack && ' If you need to make changes, click "Back to Questionnaire" to edit your responses.'}
        </p>
      </div>
    </div>
  );
}
