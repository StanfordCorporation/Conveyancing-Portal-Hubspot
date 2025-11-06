import React from 'react';
import { CheckCircle, AlertTriangle, Mail, User, Home, FileText } from 'lucide-react';

export default function CreateLeadStep3({ formData, updateFormData }) {
  // Calculate completion percentage
  const questionnaireFields = Object.keys(formData.questionnaireData || {});
  const totalPossibleFields = 10; // Simplified questionnaire has ~10 main fields
  const filledFields = questionnaireFields.filter(key => formData.questionnaireData[key]).length;
  const completionPercentage = Math.round((filledFields / totalPossibleFields) * 100);

  // Check for missing required fields
  const missingFields = [];
  if (!formData.propertyAddress) missingFields.push('Property Address');
  if (!formData.primarySeller.fullName) missingFields.push('Primary Seller Name');
  if (!formData.primarySeller.email) missingFields.push('Primary Seller Email');
  if (!formData.primarySeller.mobile) missingFields.push('Primary Seller Mobile');

  // Check additional sellers
  formData.additionalSellers.forEach((seller, index) => {
    if (!seller.fullName) missingFields.push(`Additional Seller ${index + 1} Name`);
    if (!seller.email) missingFields.push(`Additional Seller ${index + 1} Email`);
    if (!seller.mobile) missingFields.push(`Additional Seller ${index + 1} Mobile`);
  });

  return (
    <div className="step-content review-step">
      {/* Summary Header */}
      <div className="review-header">
        <h3>Review Your Lead Details</h3>
        <p>Please review all information before creating the lead</p>
      </div>

      {/* Property Information Card */}
      <div className="review-card">
        <div className="review-card-header">
          <Home size={20} />
          <h4>Property Information</h4>
        </div>
        <div className="review-card-body">
          <div className="review-item">
            <span className="review-label">Address:</span>
            <span className="review-value">{formData.propertyAddress || 'N/A'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Number of Owners:</span>
            <span className="review-value">{formData.numberOfOwners}</span>
          </div>
        </div>
      </div>

      {/* Primary Seller Card */}
      <div className="review-card">
        <div className="review-card-header">
          <User size={20} />
          <h4>Primary Seller</h4>
        </div>
        <div className="review-card-body">
          <div className="review-item">
            <span className="review-label">Name:</span>
            <span className="review-value">{formData.primarySeller.fullName || 'N/A'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Email:</span>
            <span className="review-value">{formData.primarySeller.email || 'N/A'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Mobile:</span>
            <span className="review-value">{formData.primarySeller.mobile || 'N/A'}</span>
          </div>
          {formData.primarySeller.address && (
            <div className="review-item">
              <span className="review-label">Address:</span>
              <span className="review-value">{formData.primarySeller.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Sellers */}
      {formData.additionalSellers.map((seller, index) => (
        <div key={index} className="review-card">
          <div className="review-card-header">
            <User size={20} />
            <h4>Additional Seller {index + 1}</h4>
          </div>
          <div className="review-card-body">
            <div className="review-item">
              <span className="review-label">Name:</span>
              <span className="review-value">{seller.fullName || 'N/A'}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Email:</span>
              <span className="review-value">{seller.email || 'N/A'}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Mobile:</span>
              <span className="review-value">{seller.mobile || 'N/A'}</span>
            </div>
            {seller.address && (
              <div className="review-item">
                <span className="review-label">Address:</span>
                <span className="review-value">{seller.address}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Questionnaire Completion */}
      <div className="review-card">
        <div className="review-card-header">
          <FileText size={20} />
          <h4>Property Questionnaire</h4>
        </div>
        <div className="review-card-body">
          <div className="completion-bar">
            <div className="completion-label">
              <span>Completion</span>
              <span className="completion-percentage">{completionPercentage}%</span>
            </div>
            <div className="completion-track">
              <div 
                className="completion-fill" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          <p className="completion-note">
            {completionPercentage === 0 
              ? 'No questionnaire data provided. The client will complete this in the portal.'
              : completionPercentage < 50
              ? 'Some basic information provided. The client can complete the rest.'
              : 'Most information provided. The client can review and complete any missing details.'
            }
          </p>
        </div>
      </div>

      {/* Missing Fields Warning */}
      {missingFields.length > 0 && (
        <div className="warning-card">
          <div className="warning-header">
            <AlertTriangle size={20} />
            <span>Missing Required Fields</span>
          </div>
          <ul className="warning-list">
            {missingFields.map((field, index) => (
              <li key={index}>{field}</li>
            ))}
          </ul>
          <p className="warning-note">
            Please go back and fill in the missing fields before proceeding.
          </p>
        </div>
      )}

      {/* Send Invitation Option */}
      <div className="review-card invitation-card">
        <div className="review-card-header">
          <Mail size={20} />
          <h4>Client Portal Invitation</h4>
        </div>
        <div className="review-card-body">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.sendInvitation}
              onChange={(e) => updateFormData({ sendInvitation: e.target.checked })}
            />
            <span>Send invitation to client portal</span>
          </label>
          <p className="checkbox-note">
            {formData.sendInvitation 
              ? '✅ An email with login instructions will be sent to the primary seller.'
              : 'ℹ️ You can send the invitation manually later from the leads list.'
            }
          </p>
        </div>
      </div>

      {/* Success Preview */}
      {missingFields.length === 0 && (
        <div className="success-preview">
          <CheckCircle size={24} />
          <div>
            <h4>Ready to Create Lead</h4>
            <p>All required information has been provided. Click "Send to Client Portal" to create the lead.</p>
          </div>
        </div>
      )}
    </div>
  );
}

