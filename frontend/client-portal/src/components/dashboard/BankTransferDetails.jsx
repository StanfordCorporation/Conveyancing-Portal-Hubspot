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

Amount Due: $${amount} AUD

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
      <div className="bank-transfer-header">
        <div className="header-icon">🏦</div>
        <h2>Trust Account Payment Required</h2>
        <p className="header-subtitle">
          So we can order the searches straight away, we request you place the sum of <strong>${amount}</strong> into our trust account using the below details:
        </p>
      </div>

      <div className="bank-details-card">
        <div className="bank-detail-row">
          <span className="detail-label">Bank:</span>
          <span className="detail-value bank-name">National Australia Bank</span>
        </div>

        <div className="bank-detail-row">
          <span className="detail-label">BSB:</span>
          <span className="detail-value">084 004</span>
        </div>

        <div className="bank-detail-row">
          <span className="detail-label">Account:</span>
          <span className="detail-value">907 123 965</span>
        </div>

        <div className="bank-detail-row reference-row">
          <span className="detail-label">Reference:</span>
          <span className="detail-value reference-number">{referenceNumber}</span>
        </div>

        <div className="reference-note">
          <span className="note-icon">💡</span>
          <p>
            <strong>Please use this matter reference number for the payment</strong> as it helps us fast track your process.
          </p>
        </div>
      </div>

      <div className="what-happens-next">
        <h3>What happens next?</h3>
        <div className="next-steps">
          <p>
            Once we have received payment, we will order the searches, and provide you with the completed Seller's Disclosure Statement for review and signature.
          </p>
          <p>
            Please do not hesitate to contact us for any assistance you may require with this process.
          </p>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          className="download-button"
          onClick={handleDownloadDetails}
          type="button"
        >
          <span className="button-icon">⬇️</span>
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
              <span className="button-icon">✓</span>
              I Have Made the Payment
            </>
          )}
        </button>
      </div>

      <div className="processing-note">
        <span className="warning-icon">⚠️</span>
        <p>
          <strong>Please note:</strong> There might be a delay of a few hours for us to confirm receipt of your bank transfer. We will notify you once the payment has been received and processed.
        </p>
      </div>
    </div>
  );
}

