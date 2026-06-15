import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, User, LogOut, Shield, CreditCard, Bell, AlertTriangle, Search, Building2 } from 'lucide-react';
import './Header.css';

const Header = ({ activePage, setActivePage, onLogout, user, assignedDomains = [], selectedDomain, setSelectedDomain }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const getParentLabel = () => {
    if (['Subdomain Discovery', 'Endpoints', 'Open Ports', 'Directories', 'Technologies'].includes(activePage)) return 'ASSET DISCOVERY';
    if (['Email Security'].includes(activePage)) return 'EMAIL SECURITY';
    if (['Mobile VAPT'].includes(activePage)) return 'MOBILE APP MONITORING';
    if (['Vulnerabilities', 'SSL Certificates'].includes(activePage)) return 'VULNERABILITIES MANAGEMENT';
    if (['Surface Web', 'Suspicious Domain', 'Phishing Domain', 'Impersonating Account', 'Anti Malware'].includes(activePage)) return 'BRAND MONITORING';
    if (['Marketplace', 'Settings'].includes(activePage)) return 'MANAGE';
    return 'DASHBOARD';
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentUser = user || {
    name: 'Demo User',
    email: 'demo@infotechsentinel.com',
    organization: 'Infotech Sentinel'
  };

  const initialLetter = (currentUser.name || 'D').charAt(0).toUpperCase();

  return (
    <div className="header">
      <div className="header-breadcrumbs">
        {activePage === 'Overview' ? (
          <div className="header-page-title">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Overview</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>A high-level summary of your attack surface and recent assets.</p>
          </div>
        ) : (
          <>
            <span className="breadcrumb-link">{getParentLabel()}</span>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{activePage}</span>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {currentUser && currentUser.organization && (
          <div className="header-org-badge">
            <Building2 size={14} />
            {currentUser.organization}
          </div>
        )}
      </div>

      <div className="header-right">
        {/* Subscription badge */}
        <div className="header-subscription-badge">
          <span className="badge-dot"></span>
          Enterprise Plan
        </div>

        {/* Notifications bar */}
        <div className="header-notifications-wrapper" ref={notificationsRef}>
          <button className="header-notification-btn" onClick={() => setShowNotifications(v => !v)}>
            <Bell size={16} />
            <span className="notification-badge">3</span>
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
                <h3>Notifications</h3>
                <span className="mark-all-read">Mark all read</span>
              </div>
              <div className="notifications-list">
                <div className="notification-item unread">
                  <div className="notification-icon-wrap scan"><Search size={12} /></div>
                  <div className="notification-item-content">
                    <p className="notification-text">Subdomain scan completed for <strong>infotech.com</strong></p>
                    <span className="notification-time">2 min ago</span>
                  </div>
                </div>
                <div className="notification-item unread">
                  <div className="notification-icon-wrap alert"><AlertTriangle size={12} /></div>
                  <div className="notification-item-content">
                    <p className="notification-text">Critical vulnerability found on <strong>api.infotech.com</strong></p>
                    <span className="notification-time">15 min ago</span>
                  </div>
                </div>
                <div className="notification-item">
                  <div className="notification-icon-wrap security"><Shield size={12} /></div>
                  <div className="notification-item-content">
                    <p className="notification-text">SSL certificate for <strong>shop.infotech.com</strong> renewed successfully</p>
                    <span className="notification-time">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile with dropdown */}
        <div className="header-profile-wrapper" ref={profileRef}>
          <div className="header-profile" onClick={() => setShowProfile(v => !v)}>
            <div className="header-avatar">{initialLetter}</div>
          </div>

          {showProfile && (
            <div className="profile-dropdown">
              {/* User info */}
              <div className="profile-dropdown-top">
                <div className="profile-dropdown-avatar">{initialLetter}</div>
                <div className="profile-dropdown-info">
                  <div className="profile-dropdown-name">{currentUser.name}</div>
                  <div className="profile-dropdown-email">{currentUser.email}</div>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              {/* Subscription */}
              <div className="profile-dropdown-section">
                <div className="profile-dropdown-section-label">Subscription</div>
                <div className="profile-dropdown-subscription">
                  <div className="profile-sub-badge">
                    <CreditCard size={13} />
                    Enterprise Plan
                  </div>
                  <span className="profile-sub-status">Active</span>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              {/* Actions */}
              <div className="profile-dropdown-actions">
                <button
                  className="profile-action-btn"
                  onClick={() => { setActivePage('Settings'); setShowProfile(false); }}
                >
                  <User size={14} />
                  My Profile
                </button>
                <button
                  className="profile-action-btn profile-action-danger"
                  onClick={() => { setShowProfile(false); if (typeof onLogout === 'function') onLogout(); }}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
