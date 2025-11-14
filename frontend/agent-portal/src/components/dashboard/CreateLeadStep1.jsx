import React, { useState } from 'react';
import { Plus, Trash2, Upload, FileText, X } from 'lucide-react';
import AddressAutocomplete from '../../../../src/components/common/AddressAutocomplete';

export default function CreateLeadStep1({ formData, updateFormData }) {
  const [uploadingTitleSearch, setUploadingTitleSearch] = useState(false);
  const handlePrimarySellerChange = (field, value) => {
    updateFormData(prev => ({
      primarySeller: {
        ...prev.primarySeller,
        [field]: value
      }
    }));
  };

  const handleAddAdditionalSeller = () => {
    updateFormData(prev => ({
      additionalSellers: [
        ...prev.additionalSellers,
        { fullName: '', email: '', mobile: '', address: '' }
      ]
    }));
  };

  const handleRemoveAdditionalSeller = (index) => {
    updateFormData(prev => ({
      additionalSellers: prev.additionalSellers.filter((_, i) => i !== index)
    }));
  };

  const handleAdditionalSellerChange = (index, field, value) => {
    updateFormData(prev => {
      const updated = [...prev.additionalSellers];
      updated[index] = { ...updated[index], [field]: value };
      return { additionalSellers: updated };
    });
  };

  const handleNumberOfOwnersChange = (value) => {
    const numOwners = parseInt(value);
    
    updateFormData(prev => {
      const currentAdditional = prev.additionalSellers.length;
      const neededAdditional = numOwners - 1;
      
      let additionalSellers = prev.additionalSellers;
      
      if (neededAdditional > currentAdditional) {
        // Add more sellers
        const toAdd = neededAdditional - currentAdditional;
        const newSellers = Array(toAdd).fill(null).map(() => ({
          fullName: '', email: '', mobile: '', address: ''
        }));
        additionalSellers = [...prev.additionalSellers, ...newSellers];
      } else if (neededAdditional < currentAdditional) {
        // Remove extra sellers
        additionalSellers = prev.additionalSellers.slice(0, neededAdditional);
      }
      
      return {
        numberOfOwners: value,
        additionalSellers
      };
    });
  };

  return (
    <div className="step-content">
      {/* Property Information */}
      <div className="form-section">
        <h3 className="section-title">Property Information</h3>
        
        <div className="form-row">
          <div className="form-group full-width">
            <label className="form-label required">Property Address</label>
            <AddressAutocomplete
              className="form-input"
              placeholder="123 Main Street, Brisbane QLD 4000"
              value={formData.propertyAddress}
              onChange={(value) => updateFormData({ propertyAddress: value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Number of Owners</label>
            <select
              className="form-select"
              value={formData.numberOfOwners}
              onChange={(e) => handleNumberOfOwnersChange(e.target.value)}
            >
              <option value="1">1 Owner</option>
              <option value="2">2 Owners</option>
              <option value="3">3 Owners</option>
              <option value="4">4 Owners</option>
            </select>
          </div>
        </div>
      </div>

      {/* Title Search Section */}
      <div className="form-section">
        <h3 className="section-title">Title Search</h3>
        
        <div className="form-row">
          <div className="form-group full-width">
            <label className="form-label">Have you conducted a title search for the client already?</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="agentTitleSearch"
                  value="Yes"
                  checked={formData.agentTitleSearch === 'Yes'}
                  onChange={(e) => updateFormData({ agentTitleSearch: e.target.value })}
                />
                <span>Yes</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="agentTitleSearch"
                  value="No"
                  checked={formData.agentTitleSearch === 'No'}
                  onChange={(e) => updateFormData({ 
                    agentTitleSearch: e.target.value,
                    agentTitleSearchFile: null
                  })}
                />
                <span>No</span>
              </label>
            </div>
          </div>
        </div>

        {/* File Upload (only show if Yes) */}
        {formData.agentTitleSearch === 'Yes' && (
          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label">Upload Title Search Document</label>
              {!formData.agentTitleSearchFile ? (
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="titleSearchFile"
                    className="file-input"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        updateFormData({ agentTitleSearchFile: file });
                      }
                    }}
                    disabled={uploadingTitleSearch}
                  />
                  <label htmlFor="titleSearchFile" className="file-upload-label">
                    <Upload size={24} />
                    <span className="upload-text">
                      {uploadingTitleSearch ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="upload-hint">PDF, DOC, or DOCX (max 10MB)</span>
                  </label>
                </div>
              ) : (
                <div className="file-uploaded">
                  <FileText size={20} />
                  <span className="file-name">{formData.agentTitleSearchFile.name}</span>
                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={() => updateFormData({ agentTitleSearchFile: null })}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Primary Seller */}
      <div className="form-section">
        <h3 className="section-title">Primary Seller</h3>
        
        <div className="form-row">
          <div className="form-group full-width">
            <label className="form-label required">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Smith"
              value={formData.primarySeller.fullName}
              onChange={(e) => handlePrimarySellerChange('fullName', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="john@example.com"
              value={formData.primarySeller.email}
              onChange={(e) => handlePrimarySellerChange('email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label required">Mobile Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="0412 345 678"
              value={formData.primarySeller.mobile}
              onChange={(e) => handlePrimarySellerChange('mobile', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label className="form-label">Residential Address (Optional)</label>
            <AddressAutocomplete
              className="form-input"
              placeholder="10 Smith Street, Brisbane QLD 4000"
              value={formData.primarySeller.address}
              onChange={(value) => handlePrimarySellerChange('address', value)}
            />
          </div>
        </div>
      </div>

      {/* Additional Sellers */}
      {formData.additionalSellers.map((seller, index) => (
        <div key={index} className="form-section">
          <div className="section-header-with-action">
            <h3 className="section-title">Additional Seller {index + 1}</h3>
            <button
              type="button"
              className="btn-remove"
              onClick={() => handleRemoveAdditionalSeller(index)}
            >
              <Trash2 size={16} />
              <span>Remove</span>
            </button>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label required">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Jane Smith"
                value={seller.fullName}
                onChange={(e) => handleAdditionalSellerChange(index, 'fullName', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="jane@example.com"
                value={seller.email}
                onChange={(e) => handleAdditionalSellerChange(index, 'email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Mobile Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="0412 345 678"
                value={seller.mobile}
                onChange={(e) => handleAdditionalSellerChange(index, 'mobile', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label className="form-label">Residential Address (Optional)</label>
              <AddressAutocomplete
                className="form-input"
                placeholder="20 Jones Street, Brisbane QLD 4000"
                value={seller.address}
                onChange={(value) => handleAdditionalSellerChange(index, 'address', value)}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Help Text */}
      <div className="help-text">
        <p>💡 <strong>Tip:</strong> Make sure all email addresses and mobile numbers are correct. They will be used to send client portal invitations.</p>
      </div>
    </div>
  );
}

