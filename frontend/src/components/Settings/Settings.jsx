import React, { useState, useEffect } from 'react';
import {
  Database, Trash2, Bell, Sliders, Shield, RefreshCw,
  CheckCircle2, AlertCircle, Clock, Check, User, Lock,
  Key, Mail, Monitor, Zap, Globe, ChevronRight, Eye, EyeOff, Save
} from 'lucide-react';
import './Settings.css';
import { api } from '../../utils/api';
import UserManagement from './UserManagement';

const Settings = ({ user, setUser }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const currentUser = user || {
    name: 'Demo User',
    email: 'demo@infotechsentinel.com',
    organization: 'Infotech Sentinel',
    role: 'member'
  };

  const [localUser, setLocalUser] = useState({
    name: currentUser.name,
    email: currentUser.email,
    organization: currentUser.organization,
    username: currentUser.email.split('@')[0],
    profile_photo_url: currentUser.profile_photo_url
  });

  // Sync profile edits with global App state
  useEffect(() => {
    if (user) {
      setLocalUser({
        name: user.name,
        email: user.email,
        organization: user.organization,
        username: user.email.split('@')[0],
        profile_photo_url: user.profile_photo_url
      });
    }
  }, [user]);

  const tabs = [
    { id: 'profile',       label: 'Profile',        icon: <User size={16} /> },
    { id: 'users',         label: 'User Management', icon: <Shield size={16} /> },
    { id: 'database',      label: 'Database',       icon: <Database size={16} /> },
  ];

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('name', localUser.name);
      formData.append('email', localUser.email);
      // Not updating organization from profile view usually, but we can send it if needed
      
      if (localUser.profile_photo_file) {
        formData.append('profile_photo', localUser.profile_photo_file);
      }

      const response = await api.request('/api/auth/profile/', {
        method: 'PUT',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();

      if (setUser) {
        setUser({
          ...user,
          name: updatedUser.name || localUser.name,
          email: updatedUser.email || localUser.email,
          profile_photo_url: updatedUser.profile_photo_url
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Profile update error", err);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to permanently clear all data? This cannot be undone.')) {
      setClearing(true);
      try {
        const res = await api.delete('/api/attacksurface/clear-db/');
        alert(res.message || 'Database cleared successfully.');
      } catch (err) {
        console.error("Failed to clear database", err);
        alert(err.message || 'Failed to clear database.');
      } finally {
        setClearing(false);
      }
    }
  };

  return (
    <div className="settings-container">

      {/* ── Header ── */}
      <div className="settings-page-header">
        <div>
          <div className="settings-page-badge"><Zap size={12} /> Configuration</div>
          <h1 className="settings-page-title">Settings</h1>
          <p className="settings-page-subtitle">Manage your account, preferences and organization users</p>
        </div>
        <button className="btn-save-changes" onClick={handleSave}>
          {saveSuccess
            ? <><Check size={16} /> Saved!</>
            : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      <div className="settings-layout">

        {/* ── Sidebar Nav ── */}
        <nav className="settings-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="snav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              <ChevronRight size={14} className="snav-chevron" />
            </button>
          ))}
        </nav>

        {/* ── Content Panel ── */}
        <div className="settings-content">

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="settings-panel">
              <div className="panel-header">
                <Shield size={20} className="panel-icon blue" />
                <div>
                  <h2 className="panel-title">User Management</h2>
                  <p className="panel-desc">View organization users and manage features</p>
                </div>
              </div>
              <UserManagement currentUser={currentUser} />
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="settings-panel">
              <div className="panel-header">
                <User size={20} className="panel-icon blue" />
                <div>
                  <h2 className="panel-title">Profile Information</h2>
                  <p className="panel-desc">Update your personal details and display preferences</p>
                </div>
              </div>

              <div className="profile-top-card">
                <div className="profile-avatar-large">
                  {localUser.profile_photo_url ? (
                    <img src={localUser.profile_photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    (localUser.name || 'D').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="profile-meta">
                  <h3 className="profile-display-name">{localUser.name}</h3>
                  <p className="profile-display-email">{localUser.email}</p>
                  <span className="profile-role-badge">
                    <Shield size={11} /> {currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Member'}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="profile-photo-upload"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setLocalUser({
                          ...localUser,
                          profile_photo_file: file,
                          profile_photo_url: URL.createObjectURL(file) // temporary preview
                        });
                      }
                    }}
                  />
                  <label htmlFor="profile-photo-upload" className="btn-outline-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    Change Photo
                  </label>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={localUser.name} onChange={(e) => setLocalUser({ ...localUser, name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={localUser.username} disabled className="input-disabled" placeholder="Username" />
                </div>
                <div className="form-group full-width">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={15} className="input-icon" />
                    <input type="email" value={localUser.email} disabled className="input-disabled" placeholder="Email" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <div className="input-with-icon">
                    <Globe size={15} className="input-icon" />
                    <input type="text" value={localUser.organization} disabled className="input-disabled" placeholder="Organization" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input type="text" value={currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Member'} disabled className="input-disabled" />
                </div>
              </div>
            </div>
          )}

          {/* DATABASE TAB */}
          {activeTab === 'database' && (
            <div className="settings-panel">
              <div className="panel-header">
                <Database size={20} className="panel-icon blue" />
                <div>
                  <h2 className="panel-title">Database Intelligence</h2>
                  <p className="panel-desc">Monitor your database connection and manage stored data</p>
                </div>
              </div>

              <div className="danger-zone">
                <div className="danger-zone-header"><Trash2 size={16} /><span>Clear All Data</span></div>
                <p className="danger-zone-desc">
                  Permanently delete all scan results, subdomains, endpoints, vulnerabilities,
                  SSL certificates and other discovered data. This action cannot be undone.
                </p>
                <button className="btn-danger" onClick={handleClearDatabase} disabled={clearing}>
                  <Trash2 size={15} />
                  {clearing ? 'Clearing...' : 'Clear All Data'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
