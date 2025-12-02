import React, { useState } from 'react';
import './bank-transfer-details.css';

/**
 * Bank Transfer Details Component
 * Displays trust account information and confirmation for bank transfer payments
 */
export default function BankTransferDetails({ amount, dealId, referenceNumber, onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirmPayment = async () => {
    setConfirming(true);
    console.log(`[Bank Transfer] User confirmed payment for deal ${dealId}`);
    
    // Call the onConfirm callback
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleDownloadDetails = () => {
    const details = `
Trust Account Payment Details
==============================

Amount Due: $${parseFloat(amount).toFixed(2)} AUD

Bank: National Australia Bank
BSB: 084 004
Account Number: 907 123 965
Reference: ${referenceNumber}

IMPORTANT: Please use the reference number "${referenceNumber}" when making your payment to help us identify your transaction quickly.

Once we receive your payment, we will order the searches and provide you with the completed Seller's Disclosure Statement for review and signature.

If you have any questions, please don't hesitate to contact us.
    `.trim();

    const blob = new Blob([details], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-transfer-details-${referenceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Bank Transfer] Details downloaded');
  };

  return (
    <div className="bank-transfer-container">
      {/* Header Section */}
      <div className="bank-transfer-header">
        <h2>Trust Account Payment</h2>
        <p className="header-subtitle">
          To proceed with ordering the searches, please transfer <span className="amount-highlight">${parseFloat(amount).toFixed(2)}</span> to our trust account using the details below.
        </p>
      </div>

      {/* Bank Details Card */}
      <div className="bank-details-card">
        <h3 className="card-title">Transfer Details</h3>
        
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Bank</span>
            <span className="detail-value">National Australia Bank</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">BSB</span>
            <span className="detail-value">084 004</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Account</span>
            <span className="detail-value">907 123 965</span>
          </div>
        </div>

        {/* Reference Number - Prominent Display */}
        <div className="reference-section">
          <span className="reference-label">Payment Reference</span>
          <div className="reference-number">{referenceNumber}</div>
          <div className="reference-note">
            <svg className="info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z" fill="currentColor"/>
            </svg>
            <p>Please use this reference number for the payment to help us quickly identify your transaction.</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="download-button"
          onClick={handleDownloadDetails}
          type="button"
        >
          <svg className="button-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 13L5 8H8V3H12V8H15L10 13Z" fill="currentColor"/>
            <path d="M3 15H17V17H3V15Z" fill="currentColor"/>
          </svg>
          Download Details
        </button>

        <button 
          className="confirm-button"
          onClick={handleConfirmPayment}
          disabled={confirming}
          type="button"
        >
          {confirming ? (
            <>
              <span className="spinner-small"></span>
              Processing...
            </>
          ) : (
            <>
              <svg className="button-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              I Have Made the Payment
            </>
          )}
        </button>
      </div>

      {/* What Happens Next Card */}
      <div className="next-steps-card">
        <h3 className="card-title">What Happens Next?</h3>
        <div className="steps-list">
          <div className="step-item">
            <div className="step-number">1</div>
            <p>We'll confirm receipt of your payment (usually within a few hours)</p>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <p>We'll order the necessary property searches</p>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <p>You'll receive the Seller's Disclosure Statement for review and signature</p>
          </div>
        </div>
      </div>

      {/* Processing Note */}
      <div className="processing-note">
        <svg className="warning-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 0L0 17.32L20 17.32L10 0ZM11 14.32H9V12.32H11V14.32ZM11 10.32H9V6.32H11V10.32Z" fill="currentColor"/>
        </svg>
        <p>
          <strong>Please note:</strong> Bank transfers may take a few hours to process. We'll notify you once your payment is confirmed.
        </p>
      </div>
    </div>
  );
}

