import React, { useState, useEffect } from 'react';
import {
  Database, Trash2, Bell, Sliders, Shield, RefreshCw,
  CheckCircle2, AlertCircle, Clock, Check, User, Lock,
  Key, Mail, Monitor, Zap, Globe, ChevronRight, Eye, EyeOff, Save
} from 'lucide-react';
import './Settings.css';
import { api } from '../../utils/api';

const Settings = ({ user, setUser }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({ emailScans: true, marketing: false, weeklyReport: true, criticalAlerts: true });
  const [scanning, setScanning]   = useState({ autoScan: true, nightScan: false, deepScan: false });

  const currentUser = user || {
    name: 'Demo User',
    email: 'demo@infotechsentinel.com',
    organization: 'Infotech Sentinel'
  };

  const [localUser, setLocalUser] = useState({
    name: currentUser.name,
    email: currentUser.email,
    organization: currentUser.organization,
    username: currentUser.email.split('@')[0]
  });

  const [scanners, setScanners] = useState([]);

  // Sync profile edits with global App state
  useEffect(() => {
    if (user) {
      setLocalUser({
        name: user.name,
        email: user.email,
        organization: user.organization,
        username: user.email.split('@')[0]
      });
    }
  }, [user]);

  // Load diagnostics & backend health on mount
  const runDiagnostics = async () => {
    setLoadingTools(true);
    try {
      const data = await api.get('/api/attacksurface/tools-health/');
      
      // Map API scanner response format into visual cards format
      const mappedTools = (data.tools || []).map(t => ({
        name: t.name,
        path: t.path || 'System Path',
        cat: t.category || 'Reconnaissance',
        time: t.estimate || '15s',
        status: t.status === 'AVAILABLE' ? 'Active' : 'Missing'
      }));
      setScanners(mappedTools);
    } catch (err) {
      console.error("Failed to run diagnostics", err);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const tabs = [
    { id: 'profile',       label: 'Profile',        icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications',  icon: <Bell size={16} /> },
    { id: 'scanning',      label: 'Scanning',       icon: <Sliders size={16} /> },
    { id: 'security',      label: 'Security',       icon: <Shield size={16} /> },
    { id: 'scanners',      label: 'Scanners',       icon: <Monitor size={16} /> },
    { id: 'database',      label: 'Database',       icon: <Database size={16} /> },
  ];

  const handleSave = () => {
    if (setUser) {
      setUser({
        name: localUser.name,
        email: localUser.email,
        organization: localUser.organization
      });
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to permanently clear all data? This cannot be undone.')) {
      setClearing(true);
      try {
        const res = await api.delete('/api/attacksurface/clear-db/');
        alert(res.message || 'Database cleared successfully.');
        runDiagnostics();
      } catch (err) {
        console.error("Failed to clear database", err);
        alert(err.message || 'Failed to clear database.');
      } finally {
        setClearing(false);
      }
    }
  };

  const activeCount  = scanners.filter(s => s.status === 'Active').length;
  const missingCount = scanners.filter(s => s.status === 'Missing').length;

  return (
    <div className="settings-container">

      {/* ── Header ── */}
      <div className="settings-page-header">
        <div>
          <div className="settings-page-badge"><Zap size={12} /> Configuration</div>
          <h1 className="settings-page-title">Settings</h1>
          <p className="settings-page-subtitle">Manage your account, preferences and scanner integrations</p>
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
                <div className="profile-avatar-large">{(localUser.name || 'D').charAt(0).toUpperCase()}</div>
                <div className="profile-meta">
                  <h3 className="profile-display-name">{localUser.name}</h3>
                  <p className="profile-display-email">{localUser.email}</p>
                  <span className="profile-role-badge"><Shield size={11} /> Administrator</span>
                </div>
                <button className="btn-outline-sm">Change Photo</button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={localUser.name} onChange={(e) => setLocalUser({ ...localUser, name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={localUser.username} onChange={(e) => setLocalUser({ ...localUser, username: e.target.value })} placeholder="Username" />
                </div>
                <div className="form-group full-width">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={15} className="input-icon" />
                    <input type="email" value={localUser.email} onChange={(e) => setLocalUser({ ...localUser, email: e.target.value })} placeholder="Email" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <div className="input-with-icon">
                    <Globe size={15} className="input-icon" />
                    <input type="text" value={localUser.organization} onChange={(e) => setLocalUser({ ...localUser, organization: e.target.value })} placeholder="Organization" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input type="text" defaultValue="Administrator" disabled className="input-disabled" />
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="settings-panel">
              <div className="panel-header">
                <Bell size={20} className="panel-icon blue" />
                <div>
                  <h2 className="panel-title">Notification Preferences</h2>
                  <p className="panel-desc">Control which alerts and emails you receive</p>
                </div>
              </div>
              <div className="toggle-list">
                {[
                  { key: 'emailScans',     title: 'Email Scan Alerts',    desc: 'Notify me when subdomain scans complete' },
                  { key: 'criticalAlerts', title: 'Critical Vulnerability Alerts', desc: 'Immediate alerts for critical findings' },
                  { key: 'weeklyReport',   title: 'Weekly Report',        desc: 'Receive a weekly security summary email' },
                  { key: 'marketing',      title: 'Marketing Emails',     desc: 'Product news, tips and feature updates' },
                ].map(item => (
                  <div key={item.key} className="toggle-row">
                    <div className="toggle-info">
                      <h3 className="toggle-title">{item.title}</h3>
                      <p className="toggle-desc">{item.desc}</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCANNING TAB */}
          {activeTab === 'scanning' && (
            <div className="settings-panel">
              <div className="panel-header">
                <Sliders size={20} className="panel-icon green" />
                <div>
                  <h2 className="panel-title">Scanning Configuration</h2>
                  <p className="panel-desc">Configure automated scanning schedules and behavior</p>
                </div>
              </div>
              <div className="toggle-list">
                {[
                  { key: 'autoScan',  title: 'Auto-Scan Added Domains', desc: 'Automatically trigger analysis when a domain is added' },
                  { key: 'nightScan', title: 'Nightly Deep Scan',       desc: 'Run comprehensive scans overnight (12 AM – 5 AM)' },
                  { key: 'deepScan',  title: 'Enable Deep Port Scan',   desc: 'Scan all 65,535 ports instead of top 1,000' },
                ].map(item => (
                  <div key={item.key} className="toggle-row">
                    <div className="toggle-info">
                      <h3 className="toggle-title">{item.title}</h3>
                      <p className="toggle-desc">{item.desc}</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={scanning[item.key]}
                        onChange={() => setScanning(s => ({ ...s, [item.key]: !s[item.key] }))}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="info-box">
                <Zap size={14} />
                <span>Scanning schedules run in the background and won't affect your dashboard performance.</span>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="settings-panel">
              <div className="panel-header">
                <Shield size={20} className="panel-icon red" />
                <div>
                  <h2 className="panel-title">Security & Account</h2>
                  <p className="panel-desc">Manage your password, sessions and account access</p>
                </div>
              </div>
              <div className="form-section-title"><Key size={14} /> Change Password</div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Current Password</label>
                  <div className="input-with-icon">
                    <Lock size={15} className="input-icon" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Enter current password" />
                    <button className="input-toggle" onClick={() => setShowPassword(p => !p)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" placeholder="New password" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" placeholder="Confirm new password" />
                </div>
              </div>
              <div className="password-rules">
                {['At least 8 characters', 'One uppercase letter', 'One number', 'One special character'].map(r => (
                  <span key={r} className="password-rule"><Check size={11} /> {r}</span>
                ))}
              </div>
              <div className="danger-zone">
                <div className="danger-zone-header">
                  <AlertCircle size={16} />
                  <span>Danger Zone</span>
                </div>
                <p className="danger-zone-desc">Deleting your account is permanent and cannot be undone. All your data will be erased.</p>
                <button className="btn-danger">Delete Account</button>
              </div>
            </div>
          )}

          {/* SCANNERS TAB */}
          {activeTab === 'scanners' && (
            <div className="settings-panel">
              <div className="panel-header">
                <Monitor size={20} className="panel-icon blue" />
                <div>
                  <h2 className="panel-title">Core Security Scanners</h2>
                  <p className="panel-desc">Diagnostic health mapping of all backend scanning tools</p>
                </div>
                <button className="btn-diagnostics ml-auto" onClick={() => { setLoadingTools(true); setTimeout(() => setLoadingTools(false), 1500); }} disabled={loadingTools}>
                  <RefreshCw size={14} className={loadingTools ? 'spin' : ''} />
                  {loadingTools ? 'Checking...' : 'Run Diagnostics'}
                </button>
              </div>

              <div className="scanner-summary-row">
                <div className="scanner-summary-card green">
                  <CheckCircle2 size={20} /> <span>{activeCount} Active</span>
                </div>
                <div className="scanner-summary-card red">
                  <AlertCircle size={20} /> <span>{missingCount} Missing</span>
                </div>
                <div className="scanner-summary-card blue">
                  <Monitor size={20} /> <span>{scanners.length} Total Tools</span>
                </div>
              </div>

              <div className="scanners-table-wrap">
                <table className="scanners-table">
                  <thead>
                    <tr>
                      <th>SCANNER TOOL</th>
                      <th>INTEL CATEGORY</th>
                      <th className="center-col">EST. RUNTIME</th>
                      <th className="center-col">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanners.map((scanner, idx) => (
                      <tr key={idx}>
                        <td className="tool-cell">
                          <div className="tool-name">{scanner.name}</div>
                          <div className="tool-path">{scanner.path}</div>
                        </td>
                        <td className="cat-cell">{scanner.cat}</td>
                        <td className="center-col">
                          <span className="time-badge"><Clock size={12} /> {scanner.time}</span>
                        </td>
                        <td className="center-col">
                          {scanner.status === 'Active' ? (
                            <span className="status-badge active"><CheckCircle2 size={12} /> Active</span>
                          ) : (
                            <span className="status-badge missing"><AlertCircle size={12} /> Missing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
