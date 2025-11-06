import React from 'react';
import { Home, FileText, Upload, Settings, ChevronRight, X } from 'lucide-react';

export default function AgentSidebar({ activeSection, onSectionChange, isOpen, onClose }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Overview & metrics',
      icon: Home
    },
    {
      id: 'leads',
      label: 'Leads',
      description: 'Manage your deals',
      icon: FileText
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Upload & track files',
      icon: Upload
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Account preferences',
      icon: Settings
    }
  ];

  const handleNavClick = (sectionId) => {
    onSectionChange(sectionId);
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          {/* Mobile Close Button */}
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={24} />
          </button>
        {/* Navigation Header */}
        <div className="navigation-header">
          <h2>Agent Portal</h2>
          <p>Manage your conveyancing deals</p>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-navigation">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <div className="nav-icon">
                  <Icon size={18} />
                </div>
                <div className="nav-content">
                  <h4>{item.label}</h4>
                  <p>{item.description}</p>
                </div>
                <div className="nav-indicator">
                  <ChevronRight size={18} />
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
    </>
  );
}

