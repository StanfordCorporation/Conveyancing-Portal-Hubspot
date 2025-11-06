import React, { useState, useEffect } from 'react';
import { Save, X, User, Mail, Phone, Building2 } from 'lucide-react';
import { LoadingButton } from './SkeletonLoaders';

export default function AgentSettings({ agent, onSave }) {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: ''
  });
  const [isEdited, setIsEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (agent) {
      setFormData({
        firstname: agent.firstname || '',
        lastname: agent.lastname || '',
        email: agent.email || '',
        phone: agent.phone || ''
      });
    }
  }, [agent]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setIsEdited(true);
    setError('');
    setSuccessMessage('');
  };

  const handleCancel = () => {
    setFormData({
      firstname: agent.firstname || '',
      lastname: agent.lastname || '',
      email: agent.email || '',
      phone: agent.phone || ''
    });
    setIsEdited(false);
    setError('');
    setSuccessMessage('');
  };

  const handleSave = async () => {
    // Validation
    if (!formData.firstname || !formData.lastname) {
      setError('First name and last name are required');
      return;
    }

    if (!formData.email) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave(formData);
      setSuccessMessage('Profile updated successfully!');
      setIsEdited(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="agent-settings">
      <div className="content-header">
        <h1 className="content-title">Settings</h1>
        <p className="content-subtitle">Manage your account settings and preferences</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert-success">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Information Section */}
      <div className="settings-section">
        <div className="section-header">
          <User size={20} />
          <h2>Profile Information</h2>
        </div>

        <div className="settings-card">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.firstname}
                onChange={(e) => handleChange('firstname', e.target.value)}
                placeholder="John"
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.lastname}
                onChange={(e) => handleChange('lastname', e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input with-icon"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john.smith@agency.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  className="form-input with-icon"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="0412 345 678"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agency Information Section (Read-only) */}
      <div className="settings-section">
        <div className="section-header">
          <Building2 size={20} />
          <h2>Agency Information</h2>
        </div>

        <div className="settings-card">
          <div className="readonly-field">
            <label className="form-label">Agency Name</label>
            <div className="readonly-value">
              {agent?.agency?.name || 'No agency associated'}
            </div>
          </div>

          {agent?.agency?.phone && (
            <div className="readonly-field">
              <label className="form-label">Agency Phone</label>
              <div className="readonly-value">{agent.agency.phone}</div>
            </div>
          )}

          {agent?.agency?.address && (
            <div className="readonly-field">
              <label className="form-label">Agency Address</label>
              <div className="readonly-value">{agent.agency.address}</div>
            </div>
          )}

          <div className="info-note">
            <AlertCircle size={16} />
            <span>Agency information is managed by your administrator and cannot be edited here.</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEdited && (
        <div className="settings-actions">
          <button
            className="btn-secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X size={18} />
            <span>Cancel</span>
          </button>

          <LoadingButton
            className="btn-primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
          >
            <Save size={18} />
            <span>Save Changes</span>
          </LoadingButton>
        </div>
      )}
    </div>
  );
}

