import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function CreateLeadStep1({ formData, updateFormData }) {
  const handlePrimarySellerChange = (field, value) => {
    updateFormData({
      primarySeller: {
        ...formData.primarySeller,
        [field]: value
      }
    });
  };

  const handleAddAdditionalSeller = () => {
    updateFormData({
      additionalSellers: [
        ...formData.additionalSellers,
        { fullName: '', email: '', mobile: '', address: '' }
      ]
    });
  };

  const handleRemoveAdditionalSeller = (index) => {
    const updated = formData.additionalSellers.filter((_, i) => i !== index);
    updateFormData({ additionalSellers: updated });
  };

  const handleAdditionalSellerChange = (index, field, value) => {
    const updated = [...formData.additionalSellers];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData({ additionalSellers: updated });
  };

  const handleNumberOfOwnersChange = (value) => {
    const numOwners = parseInt(value);
    updateFormData({ numberOfOwners: value });
    
    // Adjust additional sellers array
    const currentAdditional = formData.additionalSellers.length;
    const neededAdditional = numOwners - 1;
    
    if (neededAdditional > currentAdditional) {
      // Add more sellers
      const toAdd = neededAdditional - currentAdditional;
      const newSellers = Array(toAdd).fill(null).map(() => ({
        fullName: '', email: '', mobile: '', address: ''
      }));
      updateFormData({
        additionalSellers: [...formData.additionalSellers, ...newSellers]
      });
    } else if (neededAdditional < currentAdditional) {
      // Remove extra sellers
      updateFormData({
        additionalSellers: formData.additionalSellers.slice(0, neededAdditional)
      });
    }
  };

  return (
    <div className="step-content">
      {/* Property Information */}
      <div className="form-section">
        <h3 className="section-title">Property Information</h3>
        
        <div className="form-row">
          <div className="form-group full-width">
            <label className="form-label required">Property Address</label>
            <input
              type="text"
              className="form-input"
              placeholder="123 Main Street, Brisbane QLD 4000"
              value={formData.propertyAddress}
              onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
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
            <input
              type="text"
              className="form-input"
              placeholder="10 Smith Street, Brisbane QLD 4000"
              value={formData.primarySeller.address}
              onChange={(e) => handlePrimarySellerChange('address', e.target.value)}
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
              <input
                type="text"
                className="form-input"
                placeholder="20 Jones Street, Brisbane QLD 4000"
                value={seller.address}
                onChange={(e) => handleAdditionalSellerChange(index, 'address', e.target.value)}
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

