import React from 'react';
import { Search, Bell, LogOut, Menu } from 'lucide-react';

export default function AgentHeader({ agent, onLogout, onMenuClick }) {
  const getInitials = () => {
    const first = agent?.firstname?.[0] || '';
    const last = agent?.lastname?.[0] || '';
    return (first + last).toUpperCase() || 'A';
  };

  return (
    <header className="header">
      <div className="header-left">
        {/* Hamburger Menu (Mobile Only) */}
        <button className="hamburger-menu" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={24} />
        </button>

        <div className="logo">
          <img
            src="/logo (1).webp"
            alt="Stanford Conveyancing"
            className="logo-image"
          />
        </div>
      </div>

      <div className="header-actions">
        {/* Search Bar */}
        <div className="search-bar">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search deals..." 
          />
        </div>

        {/* Notifications */}
        <button className="notification-btn" title="Notifications">
          <Bell size={20} />
        </button>

        {/* User Menu */}
        <div className="user-menu">
          <div className="user-avatar">
            {getInitials()}
          </div>
          <div className="user-info">
            <h4>{agent?.firstname} {agent?.lastname}</h4>
            <p>{agent?.agency?.name || 'Agent Portal'}</p>
          </div>
        </div>

        {/* Logout */}
        <button className="logout-icon-btn" onClick={onLogout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

