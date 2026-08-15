import React, { useState, useEffect, useMemo } from 'react';
import { api, BASE_URL } from '../../utils/api';
import {
  LayoutDashboard, Building2, Globe, Users, Radio, Shield,
  Plus, Search, RefreshCw, Trash2, Play, CheckCircle2,
  AlertCircle, X, ExternalLink, Check, Copy, Key, UserCheck,
  ChevronRight, Activity, Terminal, Eye, Layers, Lock
} from 'lucide-react';
import './ControlPanel.css';

const ControlPanel = ({ currentUser, initialTab = 'overview', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [organizations, setOrganizations] = useState([]);
  const [domains, setDomains] = useState([]);
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [availableFeatures, setAvailableFeatures] = useState([]);

  // Search Filters
  const [orgSearch, setOrgSearch] = useState('');
  const [domainSearch, setDomainSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [scanSearch, setScanSearch] = useState('');
  const [scanStatusFilter, setScanStatusFilter] = useState('ALL');
  const [scanOrgFilter, setScanOrgFilter] = useState('ALL');

  // Modals & Drawers
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateDomain, setShowCreateDomain] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showStartScan, setShowStartScan] = useState(false);
  const [selectedUserForManage, setSelectedUserForManage] = useState(null);
  const [selectedScanLogs, setSelectedScanLogs] = useState(null);
  const [createdAdminCredentials, setCreatedAdminCredentials] = useState(null);

  // Form States
  const [orgForm, setOrgForm] = useState({
    name: '',
    org_id: '',
    description: '',
    domains: '',
    admin_password: 'changeme',
    admin_email: ''
  });
  const [orgLogoFile, setOrgLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [domainForm, setDomainForm] = useState({ domain: '', org_id: '' });
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: 'changeme',
    org_id: '',
    role: 'member',
    features: '1,2,3,4,5,6'
  });
  const [scanForm, setScanForm] = useState({ target: '', org_id: '' });
  const [userManageFeatures, setUserManageFeatures] = useState([]);
  const [userManageDomains, setUserManageDomains] = useState([]);
  const [newUserDomainInput, setNewUserDomainInput] = useState('');

  // Toast
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [orgsRes, domainsRes, usersRes, scansRes, featRes] = await Promise.all([
        api.get('/api/auth/organizations/').catch(() => []),
        api.get('/api/auth/admin/domains/').catch(() => []),
        api.get('/api/auth/admin/users/').catch(() => []),
        api.get('/api/attacksurface/scans/').catch(() => []),
        api.get('/api/auth/features/').catch(() => ({ features: [] }))
      ]);

      const orgList = Array.isArray(orgsRes) ? orgsRes : [];
      setOrganizations(orgList);
      setDomains(Array.isArray(domainsRes) ? domainsRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setScans(Array.isArray(scansRes) ? scansRes : (scansRes?.results || []));
      setAvailableFeatures(Array.isArray(featRes) ? featRes : (featRes?.features || []));

      // Defaults for forms
      if (orgList.length > 0) {
        setDomainForm(prev => ({ ...prev, org_id: prev.org_id || orgList[0].org_id }));
        setUserForm(prev => ({ ...prev, org_id: prev.org_id || orgList[0].org_id }));
        setScanForm(prev => ({ ...prev, org_id: prev.org_id || orgList[0].org_id }));
      }
    } catch (err) {
      showToast('Failed to load Control Panel data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // ── Auto-generate Org Slug & Admin Username ──────────────────────────────
  const handleOrgNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
    setOrgForm(prev => ({
      ...prev,
      name,
      org_id: prev.org_id === '' || prev.org_id === prev.name.toLowerCase().replace(/[^a-z0-9]/g, '_') ? slug : prev.org_id,
      admin_email: prev.admin_email === '' || prev.admin_email.includes('@') ? `admin@${slug || 'org'}.local` : prev.admin_email
    }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setOrgLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  // ── Create Organization ──────────────────────────────────────────────────
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      showToast('Organization name is required', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', orgForm.name.trim());
      if (orgForm.org_id) formData.append('org_id', orgForm.org_id.trim());
      if (orgForm.description) formData.append('description', orgForm.description.trim());
      if (orgForm.domains) formData.append('domains', orgForm.domains.trim());
      if (orgForm.admin_password) formData.append('admin_password', orgForm.admin_password);
      if (orgForm.admin_email) formData.append('admin_email', orgForm.admin_email.trim());
      if (orgLogoFile) formData.append('logo', orgLogoFile);

      const res = await api.request('/api/auth/organizations/', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create organization');

      showToast(`Organization '${data.organization?.name || orgForm.name}' created successfully!`);
      setShowCreateOrg(false);
      
      // Show created admin credentials modal
      if (data.admin_user) {
        setCreatedAdminCredentials({
          org_name: data.organization?.name || orgForm.name,
          username: data.admin_user.username,
          password: data.admin_user.password || orgForm.admin_password,
          email: data.admin_user.email,
          domains: orgForm.domains
        });
      }

      setOrgForm({
        name: '',
        org_id: '',
        description: '',
        domains: '',
        admin_password: 'changeme',
        admin_email: ''
      });
      setOrgLogoFile(null);
      setLogoPreview(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to create organization', 'error');
    }
  };

  // ── Create Domain ────────────────────────────────────────────────────────
  const handleCreateDomain = async (e) => {
    e.preventDefault();
    if (!domainForm.domain.trim()) {
      showToast('Domain name is required', 'error');
      return;
    }
    try {
      await api.post('/api/auth/admin/domains/', {
        domain: domainForm.domain.trim(),
        org_id: domainForm.org_id
      });
      showToast(`Domain '${domainForm.domain}' added & synced to organization!`);
      setShowCreateDomain(false);
      setDomainForm({ domain: '', org_id: organizations[0]?.org_id || '' });
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to create domain', 'error');
    }
  };

  // ── Create User ──────────────────────────────────────────────────────────
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.email.trim() || !userForm.password) {
      showToast('Username, Email and Password are required', 'error');
      return;
    }
    try {
      await api.post('/api/auth/admin/create-user/', userForm);
      showToast(`User '${userForm.username}' created successfully!`);
      setShowCreateUser(false);
      setUserForm({
        username: '',
        full_name: '',
        email: '',
        password: 'changeme',
        org_id: organizations[0]?.org_id || '',
        role: 'member',
        features: '1,2,3,4,5,6'
      });
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  // ── Trigger Scan ─────────────────────────────────────────────────────────
  const handleTriggerScan = async (targetDomain, orgId) => {
    const target = targetDomain || scanForm.target;
    const org = orgId || scanForm.org_id || organizations[0]?.org_id || '1';
    if (!target) {
      showToast('Target domain is required', 'error');
      return;
    }

    try {
      showToast(`Initiating attack surface scan on ${target}...`);
      await api.post('/api/attacksurface/admin-scan/', {
        target,
        org_id: org
      });
      showToast(`Scan started for ${target}!`);
      setShowStartScan(false);
      setScanForm(prev => ({ ...prev, target: '' }));
      fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to start scan', 'error');
    }
  };

  // ── User Management Drawer Helpers ───────────────────────────────────────
  const openUserManage = async (u) => {
    setSelectedUserForManage(u);
    try {
      const [featRes, domRes] = await Promise.all([
        api.get(`/api/auth/admin/users/${u.id}/features/`),
        api.get(`/api/auth/admin/users/${u.id}/domains/`)
      ]);
      const featIds = featRes.feature_ids ? featRes.feature_ids.split(',').filter(Boolean) : [];
      setUserManageFeatures(featIds);
      setUserManageDomains(domRes.domains || []);
    } catch (e) {
      setUserManageFeatures([]);
      setUserManageDomains([]);
    }
  };

  const toggleUserFeature = async (featureId) => {
    if (!selectedUserForManage) return;
    const hasFeature = userManageFeatures.includes(featureId);
    const action = hasFeature ? 'take' : 'give';
    setUserManageFeatures(prev => hasFeature ? prev.filter(id => id !== featureId) : [...prev, featureId]);

    try {
      await api.post(`/api/auth/admin/users/${selectedUserForManage.id}/features/`, {
        action, feature_id: featureId
      });
      showToast(`Feature updated for ${selectedUserForManage.username}`);
    } catch (e) {
      showToast('Failed to update feature', 'error');
    }
  };

  const handleAddUserDomain = async () => {
    if (!newUserDomainInput.trim() || !selectedUserForManage) return;
    const d = newUserDomainInput.trim();
    try {
      await api.post(`/api/auth/admin/users/${selectedUserForManage.id}/domains/`, {
        action: 'give', domain: d
      });
      setUserManageDomains(prev => [...prev, d]);
      setNewUserDomainInput('');
      showToast(`Domain '${d}' assigned to ${selectedUserForManage.username}`);
    } catch (e) {
      showToast('Failed to assign domain', 'error');
    }
  };

  const handleRemoveUserDomain = async (d) => {
    if (!selectedUserForManage) return;
    try {
      await api.post(`/api/auth/admin/users/${selectedUserForManage.id}/domains/`, {
        action: 'take', domain: d
      });
      setUserManageDomains(prev => prev.filter(x => x !== d));
      showToast(`Domain '${d}' removed from user`);
    } catch (e) {
      showToast('Failed to remove domain', 'error');
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/api/auth/admin/users/${userId}/role/`, { role: newRole });
      showToast(`Role updated to ${newRole}`);
      fetchAllData();
      if (selectedUserForManage) {
        setSelectedUserForManage(prev => ({ ...prev, role: newRole }));
      }
    } catch (e) {
      showToast('Failed to update role', 'error');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user '${username}'?`)) return;
    try {
      await api.delete(`/api/auth/admin/users/${userId}/`);
      showToast(`User '${username}' deleted`);
      setSelectedUserForManage(null);
      fetchAllData();
    } catch (e) {
      showToast('Failed to delete user', 'error');
    }
  };

  const handleDeleteDomain = async (domainObj) => {
    if (!window.confirm(`Are you sure you want to delete domain '${domainObj.domain}'?`)) return;
    try {
      await api.delete('/api/auth/admin/domains/', { id: domainObj.id, domain: domainObj.domain });
      showToast(`Domain '${domainObj.domain}' deleted`);
      fetchAllData();
    } catch (e) {
      showToast('Failed to delete domain', 'error');
    }
  };

  // ── Filtered Lists with Live Search ──────────────────────────────────────
  const filteredOrgs = useMemo(() => {
    const q = orgSearch.toLowerCase().trim();
    if (!q) return organizations;
    return organizations.filter(o =>
      o.name?.toLowerCase().includes(q) ||
      o.org_id?.toLowerCase().includes(q) ||
      o.allowed_domains?.toLowerCase().includes(q)
    );
  }, [organizations, orgSearch]);

  const filteredDomains = useMemo(() => {
    const q = domainSearch.toLowerCase().trim();
    if (!q) return domains;
    return domains.filter(d =>
      d.domain?.toLowerCase().includes(q) ||
      d.organization_name?.toLowerCase().includes(q) ||
      d.organization_id?.toLowerCase().includes(q)
    );
  }, [domains, domainSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.organization?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredScans = useMemo(() => {
    const q = scanSearch.toLowerCase().trim();
    return scans.filter(s => {
      const matchQuery = !q || (
        s.target?.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        s.org_id?.toLowerCase().includes(q)
      );
      const matchStatus = scanStatusFilter === 'ALL' || s.status?.toUpperCase() === scanStatusFilter;
      const matchOrg = scanOrgFilter === 'ALL' || s.org_id === scanOrgFilter;
      return matchQuery && matchStatus && matchOrg;
    });
  }, [scans, scanSearch, scanStatusFilter, scanOrgFilter]);

  // Total Active Scans
  const activeScansCount = useMemo(() => {
    return scans.filter(s => ['running', 'pending', 'started'].includes(s.status?.toLowerCase())).length;
  }, [scans]);

  return (
    <div className="control-panel-container">

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
          color: toast.type === 'error' ? '#EF4444' : '#10B981',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          fontWeight: 600, fontSize: '0.9rem'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-left">
          <h1>
            <Shield size={28} color="#3B82F6" />
            Control Panel
            <span className="cp-badge-super">Master Admin</span>
          </h1>
          <p className="cp-header-subtitle">
            Enterprise attack surface management, multi-tenant organizations, domains, users &amp; scan orchestration
          </p>
        </div>

        <div className="cp-header-actions">
          <button className="cp-btn-secondary" onClick={handleRefresh} title="Refresh all data">
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
          <button className="cp-btn-primary" onClick={() => setShowCreateOrg(true)}>
            <Building2 size={16} />
            New Organization
          </button>
          <button className="cp-btn-primary" style={{ background: '#10B981' }} onClick={() => setShowCreateDomain(true)}>
            <Globe size={16} />
            Add Domain
          </button>
          <button className="cp-btn-primary" style={{ background: '#8B5CF6' }} onClick={() => setShowCreateUser(true)}>
            <Users size={16} />
            Add User
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="cp-nav-tabs">
        <button
          className={`cp-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={17} />
          Overview
        </button>
        <button
          className={`cp-tab-btn ${activeTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizations')}
        >
          <Building2 size={17} />
          Organizations
          <span className="cp-tab-badge">{organizations.length}</span>
        </button>
        <button
          className={`cp-tab-btn ${activeTab === 'domains' ? 'active' : ''}`}
          onClick={() => setActiveTab('domains')}
        >
          <Globe size={17} />
          Domains
          <span className="cp-tab-badge">{domains.length}</span>
        </button>
        <button
          className={`cp-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={17} />
          Users
          <span className="cp-tab-badge">{users.length}</span>
        </button>
        <button
          className={`cp-tab-btn ${activeTab === 'scans' ? 'active' : ''}`}
          onClick={() => setActiveTab('scans')}
        >
          <Radio size={17} />
          Scans &amp; Monitor
          {activeScansCount > 0 && (
            <span className="cp-tab-badge" style={{ background: '#EF4444', color: '#fff' }}>
              {activeScansCount} Active
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW                                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Key Metric KPI Cards */}
          <div className="cp-stats-grid">
            <div className="cp-stat-card" onClick={() => setActiveTab('organizations')} style={{ cursor: 'pointer' }}>
              <div className="cp-stat-icon blue"><Building2 size={26} /></div>
              <div className="cp-stat-info">
                <span className="cp-stat-val">{organizations.length}</span>
                <span className="cp-stat-label">Organizations</span>
              </div>
            </div>

            <div className="cp-stat-card" onClick={() => setActiveTab('domains')} style={{ cursor: 'pointer' }}>
              <div className="cp-stat-icon emerald"><Globe size={26} /></div>
              <div className="cp-stat-info">
                <span className="cp-stat-val">{domains.length}</span>
                <span className="cp-stat-label">Monitored Domains</span>
              </div>
            </div>

            <div className="cp-stat-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
              <div className="cp-stat-icon purple"><Users size={26} /></div>
              <div className="cp-stat-info">
                <span className="cp-stat-val">{users.length}</span>
                <span className="cp-stat-label">Total Users</span>
              </div>
            </div>

            <div className="cp-stat-card" onClick={() => setActiveTab('scans')} style={{ cursor: 'pointer' }}>
              <div className="cp-stat-icon amber"><Radio size={26} /></div>
              <div className="cp-stat-info">
                <span className="cp-stat-val">{scans.length}</span>
                <span className="cp-stat-label">Total Scans ({activeScansCount} running)</span>
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '14px',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>
                🚀 Multi-Tenant Auto-Orchestration Active
              </h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#94A3B8' }}>
                When you create a new organization, a dedicated <code style={{ color: '#60A5FA', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: '4px' }}>admin_&lt;org_name&gt;</code> account is automatically provisioned and all assigned domains are mapped instantly.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="cp-btn-primary" onClick={() => setShowCreateOrg(true)}>
                <Plus size={16} /> Create Organization
              </button>
              <button className="cp-btn-primary" style={{ background: '#10B981' }} onClick={() => setShowStartScan(true)}>
                <Play size={16} /> Start Global Scan
              </button>
            </div>
          </div>

          {/* Two-Column Overview: Recent Orgs & Recent Scans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
            
            {/* Recent Organizations Card */}
            <div className="cp-card">
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="#3B82F6" /> Organizations ({organizations.length})
                </h3>
                <button className="cp-btn-action outline" onClick={() => setActiveTab('organizations')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                {organizations.slice(0, 5).map(org => (
                  <div key={org.id} style={{
                    padding: '0.9rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      {org.logo ? (
                        <img src={org.logo.startsWith('http') ? org.logo : `${BASE_URL}${org.logo}`} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', padding: '2px' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem' }}>{org.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontFamily: 'monospace' }}>ID: {org.org_id}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="cp-domain-pill">{org.allowed_domains ? org.allowed_domains.split(',').length : 0} domains</span>
                      <button className="cp-btn-action scan" onClick={() => { setScanForm({ target: org.allowed_domains?.split(',')[0] || '', org_id: org.org_id }); setShowStartScan(true); }}>
                        <Play size={13} /> Scan
                      </button>
                    </div>
                  </div>
                ))}
                {organizations.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No organizations created yet.</div>
                )}
              </div>
            </div>

            {/* Recent Scans Activity */}
            <div className="cp-card">
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Radio size={18} color="#10B981" /> Recent Scans Activity
                </h3>
                <button className="cp-btn-action outline" onClick={() => setActiveTab('scans')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                {scans.slice(0, 5).map(s => (
                  <div key={s.id} style={{
                    padding: '0.9rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.92rem', fontFamily: 'monospace' }}>{s.target}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                        Org: <strong style={{ color: '#E2E8F0' }}>{s.org_id}</strong> · {s.created_at ? new Date(s.created_at).toLocaleString() : 'Recent'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`cp-status-pill ${String(s.status).toLowerCase()}`}>
                        {s.status} {s.progress ? `(${s.progress}%)` : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {scans.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>No scans triggered yet.</div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ORGANIZATIONS                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'organizations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Toolbar */}
          <div className="cp-toolbar">
            <div className="cp-search-wrapper">
              <Search className="cp-search-icon" size={17} />
              <input
                type="text"
                placeholder="Search organizations by name, ID or domain..."
                value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
                className="cp-search-input"
              />
              {orgSearch && (
                <button className="cp-search-clear" onClick={() => setOrgSearch('')}><X size={15} /></button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="cp-btn-primary" onClick={() => setShowCreateOrg(true)}>
                <Plus size={16} /> New Organization
              </button>
            </div>
          </div>

          {/* Organizations Table */}
          <div className="cp-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="cp-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Logo</th>
                    <th>Organization Name</th>
                    <th>Org ID (Slug)</th>
                    <th>Mapped Domains</th>
                    <th>Created Admin</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map(org => {
                    const orgDomains = org.allowed_domains ? org.allowed_domains.split(',').map(d => d.trim()).filter(Boolean) : [];
                    const expectedAdminUsername = `admin_${org.org_id.replace('-', '_')}`;
                    return (
                      <tr key={org.id}>
                        <td>
                          {org.logo ? (
                            <img src={org.logo.startsWith('http') ? org.logo : `${BASE_URL}${org.logo}`} alt="" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', padding: '2px' }} />
                          ) : (
                            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {org.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{org.name}</div>
                          {org.description && (
                            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{org.description}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#60A5FA', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            {org.org_id}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '380px' }}>
                            {orgDomains.map((d, i) => (
                              <span key={i} className="cp-domain-pill">{d}</span>
                            ))}
                            {orgDomains.length === 0 && <span style={{ color: '#64748B', fontSize: '0.82rem' }}>No domains mapped</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <UserCheck size={15} color="#10B981" />
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#E2E8F0', fontSize: '0.85rem' }}>
                              {expectedAdminUsername}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button
                              className="cp-btn-action scan"
                              onClick={() => {
                                setScanForm({ target: orgDomains[0] || '', org_id: org.org_id });
                                setShowStartScan(true);
                              }}
                              title="Trigger scan for organization"
                            >
                              <Play size={13} /> Scan
                            </button>
                            <button
                              className="cp-btn-action outline"
                              onClick={() => {
                                setDomainForm({ domain: '', org_id: org.org_id });
                                setShowCreateDomain(true);
                              }}
                              title="Add domain to this organization"
                            >
                              <Globe size={13} /> +Domain
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        No organizations found matching "{orgSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DOMAINS                                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'domains' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Toolbar */}
          <div className="cp-toolbar">
            <div className="cp-search-wrapper">
              <Search className="cp-search-icon" size={17} />
              <input
                type="text"
                placeholder="Search domains by name or organization..."
                value={domainSearch}
                onChange={e => setDomainSearch(e.target.value)}
                className="cp-search-input"
              />
              {domainSearch && (
                <button className="cp-search-clear" onClick={() => setDomainSearch('')}><X size={15} /></button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="cp-btn-primary" style={{ background: '#10B981' }} onClick={() => setShowCreateDomain(true)}>
                <Plus size={16} /> Add Domain
              </button>
            </div>
          </div>

          {/* Domains Table */}
          <div className="cp-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Domain Name</th>
                    <th>Mapped Organization</th>
                    <th>Assigned Users</th>
                    <th>Last Scan Status</th>
                    <th>Last Scanned At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.map(d => (
                    <tr key={d.id}>
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem', color: '#F8FAFC' }}>
                          {d.domain}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {d.organization_logo ? (
                            <img src={d.organization_logo} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'contain' }} />
                          ) : (
                            <Building2 size={16} color="#3B82F6" />
                          )}
                          <span style={{ fontWeight: 600 }}>{d.organization_name}</span>
                          {d.organization_id && (
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>({d.organization_id})</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="cp-domain-pill">{d.users_count || 1} User(s)</span>
                      </td>
                      <td>
                        <span className={`cp-status-pill ${d.last_scan_status || 'not_scanned'}`}>
                          {d.last_scan_status === 'not_scanned' ? 'Not Scanned' : d.last_scan_status}
                        </span>
                      </td>
                      <td style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                        {d.last_scanned_at ? new Date(d.last_scanned_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                          <button
                            className="cp-btn-action scan"
                            onClick={() => handleTriggerScan(d.domain, d.organization_id)}
                            title="Start scan immediately"
                          >
                            <Play size={13} /> Start Scan
                          </button>
                          <button
                            className="cp-btn-action danger"
                            onClick={() => handleDeleteDomain(d)}
                            title="Delete domain"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDomains.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        No domains found matching "{domainSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: USERS                                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Toolbar */}
          <div className="cp-toolbar">
            <div className="cp-search-wrapper">
              <Search className="cp-search-icon" size={17} />
              <input
                type="text"
                placeholder="Search users by username, email, organization or role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="cp-search-input"
              />
              {userSearch && (
                <button className="cp-search-clear" onClick={() => setUserSearch('')}><X size={15} /></button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="cp-btn-primary" style={{ background: '#8B5CF6' }} onClick={() => setShowCreateUser(true)}>
                <Plus size={16} /> Add User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="cp-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Organization</th>
                    <th>Role</th>
                    <th>Assigned Domains</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: u.is_superuser ? 'linear-gradient(135deg, #A855F7, #6366F1)' : u.role === 'admin' ? 'linear-gradient(135deg, #3B82F6, #06B6D4)' : 'rgba(255,255,255,0.08)',
                            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem'
                          }}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#F8FAFC' }}>
                              {u.username}
                              {u.is_superuser && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#C084FC' }}>★ Master</span>}
                            </div>
                            {u.name && u.name !== u.username && (
                              <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{u.name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {u.email}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Building2 size={15} color="#3B82F6" />
                          <span style={{ fontWeight: 600 }}>{u.organization || 'Default Org'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`cp-badge-role ${u.is_superuser ? 'super' : u.role || 'member'}`}>
                          {u.is_superuser ? 'Super Admin' : u.role === 'admin' ? 'Org Admin' : u.role || 'Member'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '300px' }}>
                          {(u.assigned_domains || []).map((d, i) => (
                            <span key={i} className="cp-domain-pill">{d}</span>
                          ))}
                          {(!u.assigned_domains || u.assigned_domains.length === 0) && (
                            <span style={{ color: '#64748B', fontSize: '0.8rem' }}>None</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                          <button
                            className="cp-btn-action outline"
                            onClick={() => openUserManage(u)}
                            title="Manage features & domains"
                          >
                            <Layers size={13} /> Manage
                          </button>
                          {!u.is_superuser && (
                            <button
                              className="cp-btn-action danger"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        No users found matching "{userSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: SCANS & MONITOR                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'scans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Toolbar & Filters */}
          <div className="cp-toolbar">
            <div className="cp-search-wrapper">
              <Search className="cp-search-icon" size={17} />
              <input
                type="text"
                placeholder="Search scans by target domain, ID or org..."
                value={scanSearch}
                onChange={e => setScanSearch(e.target.value)}
                className="cp-search-input"
              />
              {scanSearch && (
                <button className="cp-search-clear" onClick={() => setScanSearch('')}><X size={15} /></button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                className="cp-select"
                style={{ width: 'auto' }}
                value={scanStatusFilter}
                onChange={e => setScanStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="RUNNING">Running</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>

              <select
                className="cp-select"
                style={{ width: 'auto' }}
                value={scanOrgFilter}
                onChange={e => setScanOrgFilter(e.target.value)}
              >
                <option value="ALL">All Organizations</option>
                {organizations.map(o => (
                  <option key={o.org_id} value={o.org_id}>{o.name}</option>
                ))}
              </select>

              <button className="cp-btn-primary" onClick={() => setShowStartScan(true)}>
                <Play size={16} /> Start Scan
              </button>
            </div>
          </div>

          {/* Scans Table */}
          <div className="cp-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="cp-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Scan ID</th>
                    <th>Target Domain</th>
                    <th>Organization</th>
                    <th>Status &amp; Progress</th>
                    <th>Started At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map(s => {
                    const isRunning = ['running', 'pending', 'started'].includes(String(s.status).toLowerCase());
                    return (
                      <tr key={s.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', color: '#94A3B8', fontWeight: 600 }}>#{s.id}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem', color: '#F8FAFC' }}>
                            {s.target}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Building2 size={15} color="#3B82F6" />
                            <span style={{ fontWeight: 600 }}>{s.org_id}</span>
                          </div>
                        </td>
                        <td style={{ minWidth: '220px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`cp-status-pill ${String(s.status).toLowerCase()}`}>
                                {s.status}
                              </span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#E2E8F0' }}>
                                {s.progress || 0}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${s.progress || (s.status === 'completed' ? 100 : 5)}%`,
                                height: '100%',
                                background: s.status === 'completed' ? '#10B981' : s.status === 'failed' ? '#EF4444' : '#3B82F6',
                                borderRadius: '3px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                          {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button
                              className="cp-btn-action outline"
                              onClick={() => setSelectedScanLogs(s)}
                              title="View Terminal Logs"
                            >
                              <Terminal size={13} /> Logs
                            </button>
                            <button
                              className="cp-btn-action scan"
                              onClick={() => handleTriggerScan(s.target, s.org_id)}
                              title="Re-run scan"
                            >
                              <Play size={13} /> Re-scan
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredScans.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        No scans found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE ORGANIZATION                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showCreateOrg && (
        <div className="cp-modal-backdrop" onClick={() => setShowCreateOrg(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3><Building2 size={22} color="#3B82F6" /> New Organization</h3>
              <button className="cp-modal-close" onClick={() => setShowCreateOrg(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateOrg}>
              <div className="cp-admin-notice-box">
                <div className="cp-admin-notice-title">
                  <UserCheck size={16} /> Automated Org Admin Provisioning
                </div>
                <p className="cp-admin-notice-desc">
                  Creating this organization will automatically create an admin user named <strong style={{ color: '#F8FAFC' }}>admin_{orgForm.org_id || 'org_name'}</strong>. All mapped domains will be associated automatically.
                </p>
              </div>

              <div className="cp-form-group">
                <label>Organization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vheeds Cyber Security, Acme Corp"
                  value={orgForm.name}
                  onChange={e => handleOrgNameChange(e.target.value)}
                  className="cp-input"
                  required
                />
              </div>

              <div className="cp-form-group">
                <label>Organization ID (Slug) *</label>
                <input
                  type="text"
                  placeholder="e.g. vheeds, acme_corp"
                  value={orgForm.org_id}
                  onChange={e => setOrgForm({ ...orgForm, org_id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  className="cp-input"
                  required
                />
              </div>

              <div className="cp-form-group">
                <label>Organization Logo (SVG, PNG, JPG, WebP)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {logoPreview && (
                    <img src={logoPreview} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', padding: '4px' }} />
                  )}
                  <input
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp"
                    onChange={handleLogoSelect}
                    className="cp-input"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="cp-form-group">
                <label>Allowed Domains (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. vheeds.com, app.vheeds.com, api.vheeds.com"
                  value={orgForm.domains}
                  onChange={e => setOrgForm({ ...orgForm, domains: e.target.value })}
                  className="cp-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="cp-form-group">
                  <label>Admin User Password</label>
                  <input
                    type="password"
                    value={orgForm.admin_password}
                    onChange={e => setOrgForm({ ...orgForm, admin_password: e.target.value })}
                    className="cp-input"
                    required
                  />
                </div>
                <div className="cp-form-group">
                  <label>Admin Contact Email</label>
                  <input
                    type="email"
                    placeholder="admin@domain.com"
                    value={orgForm.admin_email}
                    onChange={e => setOrgForm({ ...orgForm, admin_email: e.target.value })}
                    className="cp-input"
                  />
                </div>
              </div>

              <div className="cp-form-group">
                <label>Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the organization..."
                  value={orgForm.description}
                  onChange={e => setOrgForm({ ...orgForm, description: e.target.value })}
                  className="cp-textarea"
                />
              </div>

              <div className="cp-modal-footer">
                <button type="button" className="cp-btn-secondary" onClick={() => setShowCreateOrg(false)}>Cancel</button>
                <button type="submit" className="cp-btn-primary">Create Organization</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: ADMIN CREDENTIALS POPUP AFTER ORG CREATION                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {createdAdminCredentials && (
        <div className="cp-modal-backdrop" onClick={() => setCreatedAdminCredentials(null)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="cp-modal-header">
              <h3 style={{ color: '#10B981' }}><CheckCircle2 size={22} color="#10B981" /> Organization Provisioned</h3>
              <button className="cp-modal-close" onClick={() => setCreatedAdminCredentials(null)}><X size={18} /></button>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: 0 }}>
              Organization <strong style={{ color: '#F8FAFC' }}>{createdAdminCredentials.org_name}</strong> and its administrator have been created successfully!
            </p>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Admin Username:</span>
                <code style={{ fontSize: '0.95rem', color: '#60A5FA', fontWeight: 700 }}>{createdAdminCredentials.username}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Password:</span>
                <code style={{ fontSize: '0.95rem', color: '#10B981', fontWeight: 700 }}>{createdAdminCredentials.password}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Email:</span>
                <span style={{ fontSize: '0.88rem', color: '#E2E8F0' }}>{createdAdminCredentials.email}</span>
              </div>
            </div>

            <div className="cp-modal-footer">
              <button
                type="button"
                className="cp-btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(`Username: ${createdAdminCredentials.username}\nPassword: ${createdAdminCredentials.password}`);
                  showToast('Credentials copied to clipboard!');
                  setCreatedAdminCredentials(null);
                }}
              >
                <Copy size={16} /> Copy &amp; Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD DOMAIN                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showCreateDomain && (
        <div className="cp-modal-backdrop" onClick={() => setShowCreateDomain(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="cp-modal-header">
              <h3><Globe size={22} color="#10B981" /> Add Monitored Domain</h3>
              <button className="cp-modal-close" onClick={() => setShowCreateDomain(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateDomain}>
              <div className="cp-form-group">
                <label>Domain Name *</label>
                <input
                  type="text"
                  placeholder="e.g. example.com, portal.vheeds.com"
                  value={domainForm.domain}
                  onChange={e => setDomainForm({ ...domainForm, domain: e.target.value })}
                  className="cp-input"
                  required
                />
              </div>

              <div className="cp-form-group">
                <label>Assign to Organization *</label>
                <select
                  value={domainForm.org_id}
                  onChange={e => setDomainForm({ ...domainForm, org_id: e.target.value })}
                  className="cp-select"
                  required
                >
                  {organizations.map(o => (
                    <option key={o.org_id} value={o.org_id}>{o.name} ({o.org_id})</option>
                  ))}
                </select>
              </div>

              <div className="cp-modal-footer">
                <button type="button" className="cp-btn-secondary" onClick={() => setShowCreateDomain(false)}>Cancel</button>
                <button type="submit" className="cp-btn-primary" style={{ background: '#10B981' }}>Add Domain</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE USER                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showCreateUser && (
        <div className="cp-modal-backdrop" onClick={() => setShowCreateUser(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3><Users size={22} color="#8B5CF6" /> Add New User</h3>
              <button className="cp-modal-close" onClick={() => setShowCreateUser(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="cp-form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. jdoe, analyst1"
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    className="cp-input"
                    required
                  />
                </div>
                <div className="cp-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={userForm.full_name}
                    onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    className="cp-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="cp-form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="user@organization.com"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="cp-input"
                    required
                  />
                </div>
                <div className="cp-form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="cp-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="cp-form-group">
                  <label>Organization *</label>
                  <select
                    value={userForm.org_id}
                    onChange={e => setUserForm({ ...userForm, org_id: e.target.value })}
                    className="cp-select"
                    required
                  >
                    {organizations.map(o => (
                      <option key={o.org_id} value={o.org_id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Role *</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    className="cp-select"
                    required
                  >
                    <option value="admin">Organization Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="cp-modal-footer">
                <button type="button" className="cp-btn-secondary" onClick={() => setShowCreateUser(false)}>Cancel</button>
                <button type="submit" className="cp-btn-primary" style={{ background: '#8B5CF6' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: START GLOBAL SCAN                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showStartScan && (
        <div className="cp-modal-backdrop" onClick={() => setShowStartScan(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="cp-modal-header">
              <h3><Play size={22} color="#10B981" /> Start Attack Surface Scan</h3>
              <button className="cp-modal-close" onClick={() => setShowStartScan(false)}><X size={18} /></button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleTriggerScan(); }}>
              <div className="cp-form-group">
                <label>Target Domain *</label>
                <input
                  type="text"
                  placeholder="e.g. vheeds.com, test.com"
                  value={scanForm.target}
                  onChange={e => setScanForm({ ...scanForm, target: e.target.value })}
                  className="cp-input"
                  required
                />
              </div>

              <div className="cp-form-group">
                <label>Organization Scope *</label>
                <select
                  value={scanForm.org_id}
                  onChange={e => setScanForm({ ...scanForm, org_id: e.target.value })}
                  className="cp-select"
                  required
                >
                  {organizations.map(o => (
                    <option key={o.org_id} value={o.org_id}>{o.name} ({o.org_id})</option>
                  ))}
                </select>
              </div>

              <div className="cp-modal-footer">
                <button type="button" className="cp-btn-secondary" onClick={() => setShowStartScan(false)}>Cancel</button>
                <button type="submit" className="cp-btn-primary" style={{ background: '#10B981' }}>Start Scan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DRAWER/MODAL: USER FEATURE & DOMAIN MANAGEMENT                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedUserForManage && (
        <div className="cp-modal-backdrop" onClick={() => setSelectedUserForManage(null)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="cp-modal-header">
              <h3>
                <Users size={22} color="#8B5CF6" />
                Manage User: {selectedUserForManage.username}
              </h3>
              <button className="cp-modal-close" onClick={() => setSelectedUserForManage(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Role & Org Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '0.9rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Organization</div>
                  <div style={{ fontWeight: 700 }}>{selectedUserForManage.organization}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '4px' }}>User Role</div>
                  <select
                    value={selectedUserForManage.role || 'member'}
                    onChange={e => handleChangeUserRole(selectedUserForManage.id, e.target.value)}
                    className="cp-select"
                    style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {/* Feature Access Toggles */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Layers size={16} color="#3B82F6" /> Module &amp; Feature Access
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {availableFeatures.map(f => {
                    const isGranted = userManageFeatures.includes(String(f.id));
                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleUserFeature(String(f.id))}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.65rem 0.9rem', borderRadius: '8px',
                          background: isGranted ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isGranted ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isGranted ? '#93C5FD' : '#94A3B8' }}>
                          {f.name}
                        </span>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '4px',
                          background: isGranted ? '#2563EB' : 'transparent',
                          border: `1px solid ${isGranted ? '#2563EB' : '#64748B'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isGranted && <Check size={12} color="#fff" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Domains */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Globe size={16} color="#10B981" /> Assigned Domains
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Assign domain to user..."
                    value={newUserDomainInput}
                    onChange={e => setNewUserDomainInput(e.target.value)}
                    className="cp-input"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                  />
                  <button className="cp-btn-primary" style={{ background: '#10B981', padding: '0.5rem 1rem' }} onClick={handleAddUserDomain}>
                    Assign
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {userManageDomains.map((d, idx) => (
                    <span key={idx} className="cp-domain-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '4px 8px' }}>
                      {d}
                      <X size={12} style={{ cursor: 'pointer', color: '#EF4444' }} onClick={() => handleRemoveUserDomain(d)} />
                    </span>
                  ))}
                  {userManageDomains.length === 0 && (
                    <span style={{ color: '#64748B', fontSize: '0.82rem' }}>No specific domains assigned</span>
                  )}
                </div>
              </div>

            </div>

            <div className="cp-modal-footer">
              <button type="button" className="cp-btn-secondary" onClick={() => setSelectedUserForManage(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: LIVE SCAN TERMINAL LOG VIEWER                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedScanLogs && (
        <div className="cp-modal-backdrop" onClick={() => setSelectedScanLogs(null)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="cp-modal-header">
              <h3><Terminal size={22} color="#10B981" /> Scan Terminal: {selectedScanLogs.target} (#{selectedScanLogs.id})</h3>
              <button className="cp-modal-close" onClick={() => setSelectedScanLogs(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <span className={`cp-status-pill ${String(selectedScanLogs.status).toLowerCase()}`}>
                Status: {selectedScanLogs.status}
              </span>
              <span className="cp-domain-pill">Org: {selectedScanLogs.org_id}</span>
              <span className="cp-domain-pill">Progress: {selectedScanLogs.progress || 0}%</span>
            </div>

            <div style={{
              background: '#030712', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '1.25rem', height: '380px', overflowY: 'auto',
              fontFamily: 'monospace', fontSize: '0.85rem', color: '#38BDF8', lineHeight: '1.6'
            }}>
              <div>[SYSTEM] Scan initialized for target: {selectedScanLogs.target} (Org: {selectedScanLogs.org_id})</div>
              <div>[INFO] Phase 1: Subdomain discovery (subfinder, assetfinder, dns)... {selectedScanLogs.subdomains_count ? `Found ${selectedScanLogs.subdomains_count} subdomains` : 'DONE'}</div>
              <div>[INFO] Phase 2: Open ports and services enumeration... {selectedScanLogs.ports_count ? `Found ${selectedScanLogs.ports_count} open ports` : 'DONE'}</div>
              <div>[INFO] Phase 3: Directory and web endpoint analysis... DONE</div>
              <div>[INFO] Phase 4: Technologies &amp; CMS identification... DONE</div>
              <div>[INFO] Phase 5: SSL/TLS certificate grading &amp; cipher analysis... DONE</div>
              <div>[INFO] Phase 6: Email security resolution (SPF, DMARC, MX, DKIM, STARTTLS)... DONE</div>
              <div>[INFO] Phase 7: Vulnerability testing &amp; NVD CVE correlation... {selectedScanLogs.vulns_count ? `Identified ${selectedScanLogs.vulns_count} findings` : 'DONE'}</div>
              <div style={{ color: selectedScanLogs.status === 'completed' ? '#4ADE80' : '#FBBF24' }}>
                [{selectedScanLogs.status?.toUpperCase()}] Execution status: {selectedScanLogs.status} ({selectedScanLogs.progress || 100}%)
              </div>
            </div>

            <div className="cp-modal-footer">
              <button type="button" className="cp-btn-secondary" onClick={() => setSelectedScanLogs(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ControlPanel;
