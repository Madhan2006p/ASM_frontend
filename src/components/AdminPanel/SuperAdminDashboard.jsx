import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import {
  Shield, User, Globe, Building, CheckCircle2, ChevronRight,
  Check, Plus, Trash2, Zap, X, Users, BarChart2
} from 'lucide-react';

const SuperAdminDashboard = ({ currentUser }) => {
  const [users, setUsers]                   = useState([]);
  const [organizations, setOrganizations]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedUser, setSelectedUser]     = useState(null);
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [userFeatures, setUserFeatures]     = useState([]);
  const [userDomains, setUserDomains]       = useState([]);
  const [newDomain, setNewDomain]           = useState('');
  const [scanTarget, setScanTarget]         = useState('');
  const [scanning, setScanning]             = useState(false);
  const [toast, setToast]                   = useState({ show: false, msg: '', type: 'success' });

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateOrg, setShowCreateOrg]   = useState(false);

  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', org_id: '', role: 'admin' });
  const [orgForm, setOrgForm]   = useState({ name: '' });
  const [orgLogoFile, setOrgLogoFile] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, orgsRes, featuresRes] = await Promise.all([
        api.get('/api/auth/admin/users/'),
        api.get('/api/auth/organizations/'),
        api.get('/api/auth/features/')
      ]);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setOrganizations(Array.isArray(orgsRes) ? orgsRes : []);
      // API returns { features: [...] }
      setAvailableFeatures(Array.isArray(featuresRes) ? featuresRes : (featuresRes?.features || []));
    } catch (err) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  const handleSelectUser = async (u) => {
    setSelectedUser(u);
    setScanTarget('');
    try {
      const [featRes, domRes] = await Promise.all([
        api.get(`/api/auth/admin/users/${u.id}/features/`),
        api.get(`/api/auth/admin/users/${u.id}/domains/`)
      ]);
      const featureIds = featRes.feature_ids
        ? featRes.feature_ids.split(',').filter(Boolean)
        : [];
      setUserFeatures(featureIds);
      setUserDomains(domRes.domains || []);
    } catch (err) {
      console.error('Failed to fetch user details', err);
      setUserFeatures([]);
      setUserDomains([]);
    }
  };

  const toggleFeature = async (featureId, hasFeature) => {
    if (!selectedUser) return;
    const action = hasFeature ? 'take' : 'give';
    setUserFeatures(prev =>
      hasFeature ? prev.filter(id => id !== featureId) : [...prev, featureId]
    );
    try {
      await api.post(`/api/auth/admin/users/${selectedUser.id}/features/`, {
        action, feature_id: featureId
      });
      showToast(`Feature ${hasFeature ? 'revoked' : 'granted'} for ${selectedUser.username}`);
    } catch (err) {
      showToast('Failed to update feature', 'error');
      setUserFeatures(prev =>
        hasFeature ? [...prev, featureId] : prev.filter(id => id !== featureId)
      );
    }
  };

  const handleAssignDomain = async () => {
    if (!newDomain.trim() || !selectedUser) return;
    try {
      await api.post(`/api/auth/admin/users/${selectedUser.id}/domains/`, {
        action: 'give', domain: newDomain.trim()
      });
      setUserDomains(prev => [...prev, newDomain.trim()]);
      setNewDomain('');
      showToast(`Domain assigned to ${selectedUser.username}`);
    } catch (err) {
      showToast('Failed to assign domain', 'error');
    }
  };

  const handleRemoveDomain = async (domain) => {
    if (!selectedUser) return;
    try {
      await api.post(`/api/auth/admin/users/${selectedUser.id}/domains/`, {
        action: 'take', domain
      });
      setUserDomains(prev => prev.filter(d => d !== domain));
      showToast('Domain removed');
    } catch (err) {
      showToast('Failed to remove domain', 'error');
    }
  };

  const handleTriggerScan = async () => {
    if (!scanTarget || !selectedUser) return;
    setScanning(true);
    try {
      await api.post('/api/attacksurface/admin-scan/', {
        target: scanTarget,
        org_id: selectedUser.organization_id || '1',
        user_id: selectedUser.id   // backend validates domain is assigned to this user
      });
      showToast(`Scan started for ${scanTarget} under ${selectedUser.organization}`);
      setScanTarget('');
    } catch (err) {
      showToast(err.message || 'Failed to start scan', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/admin/create-user/', userForm);
      showToast('User created successfully');
      setShowCreateUser(false);
      setUserForm({ username: '', email: '', password: '', org_id: organizations[0]?.org_id || '', role: 'admin' });
      fetchData();
    } catch (err) {
      showToast('Failed to create user', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/api/auth/admin/users/${userId}/role/`, { role: newRole });
      showToast(`User role updated to ${newRole}`);
      fetchData(); // refresh user list to get updated role
    } catch (err) {
      showToast('Failed to update user role', 'error');
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', orgForm.name);
      if (orgLogoFile) {
        formData.append('logo', orgLogoFile);
      }
      const response = await api.request('/api/auth/organizations/', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create organization');
      }
      showToast('Organization created');
      setShowCreateOrg(false);
      setOrgForm({ name: '' });
      setOrgLogoFile(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create organization', 'error');
    }
  };

  const adminUsers = users.filter(u => u.role === 'admin');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <Shield size={40} style={{ opacity: 0.3, animation: 'spin 2s linear infinite' }} />
        <p>Loading Super Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>

      {/* Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: toast.type === 'error' ? '#EF4444' : '#10B981',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <CheckCircle2 size={18} />
          {toast.msg}
        </div>
      )}

      {/* Modal Overlay */}
      {(showCreateUser || showCreateOrg) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {showCreateOrg && (
            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', padding: '2rem', width: '420px', border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building size={20} color="#3B82F6" /> New Organization</h3>
                <button onClick={() => setShowCreateOrg(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="text" placeholder="Organization Name" value={orgForm.name}
                  onChange={e => setOrgForm({ name: e.target.value })}
                  style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem' }} required />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Organization Logo (SVG only)</label>
                  <input type="file" accept=".svg"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setOrgLogoFile(e.target.files[0]);
                      }
                    }}
                    style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowCreateOrg(false); setOrgLogoFile(null); }} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#3B82F6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Create</button>
                </div>
              </form>
            </div>
          )}
          {showCreateUser && (
            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', padding: '2rem', width: '420px', border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={20} color="#10B981" /> New User</h3>
                <button onClick={() => setShowCreateUser(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="text" placeholder="Username" value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem' }} required />
                <input type="email" placeholder="Email Address" value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem' }} required />
                <input type="password" placeholder="Password" value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem' }} required />
                <select value={userForm.org_id}
                  onChange={e => setUserForm({ ...userForm, org_id: e.target.value })}
                  style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {organizations.map(o => <option key={o.org_id} value={o.org_id}>{o.name}</option>)}
                </select>
                {/* Role is hardcoded to Admin when created by Super Admin */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowCreateUser(false)} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '0.6rem 1.5rem', background: '#10B981', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Create User</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>Super Admin Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage organizations, users, domains, features &amp; trigger scans
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => { setShowCreateOrg(true); }} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', borderRadius: '10px', cursor: 'pointer', fontWeight: '500'
          }}>
            <Building size={16} /> New Organization
          </button>
          <button onClick={() => { setUserForm({ username: '', email: '', password: '', org_id: organizations[0]?.org_id || '', role: 'admin' }); setShowCreateUser(true); }} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.25rem', background: '#3B82F6', border: 'none',
            color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
          }}>
            <User size={16} /> New User
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Organizations', value: organizations.length, icon: <Building size={22} color="#3B82F6" />, color: '#3B82F6' },
          { label: 'Total Users', value: users.length, icon: <Users size={22} color="#10B981" />, color: '#10B981' },
          { label: 'Available Features', value: availableFeatures.length, icon: <BarChart2 size={22} color="#8B5CF6" />, color: '#8B5CF6' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', background: `${stat.color}15`, borderRadius: '10px' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left: Organization Admins Tab Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '0.25rem 0' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={14} color="#3B82F6" /> Organization Admins
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '620px', overflowY: 'auto' }}>
            {adminUsers.map(u => {
              const isActive = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    border: `1px solid ${isActive ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'}`,
                    background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.04)' : 'none'
                  }}
                >
                  <span style={{ fontWeight: '600', color: isActive ? '#3B82F6' : 'var(--text-primary)', fontSize: '0.92rem' }}>
                    {u.full_name || u.username}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {u.email}
                  </span>
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px',
                    fontSize: '0.72rem', color: '#10B981', fontWeight: '600',
                    background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '12px'
                  }}>
                    <Building size={10} color="#10B981" />
                    {u.organization}
                  </span>
                </button>
              );
            })}
            {adminUsers.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                No admin accounts found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Management Panel */}
        {!selectedUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', background: 'var(--bg-card)', borderRadius: '14px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)' }}>
            <User size={52} style={{ opacity: 0.15, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.05rem', margin: 0 }}>Select a user to manage their access</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* User Info Header */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.2rem', color: '#3B82F6' }}>
                  {(selectedUser.full_name || selectedUser.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedUser.full_name || selectedUser.username}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedUser.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Shield size={13} color="#3B82F6" />
                  <span style={{ fontSize: '0.8rem', color: '#3B82F6', fontWeight: '600' }}>Admin</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Building size={13} color="#10B981" />
                  <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: '600' }}>{selectedUser.organization}</span>
                </div>
              </div>
            </div>

            {/* Trigger Scan */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <Zap size={18} color="#F59E0B" /> Trigger Scan
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                Start an attack surface scan for <b style={{ color: 'var(--text-primary)' }}>{selectedUser.organization}</b>.
                Only domains already assigned to this user can be scanned.
              </p>

              {userDomains.length === 0 ? (
                <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', color: '#F59E0B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ No domains assigned to this user yet. Assign a domain below first, then you can start a scan.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    value={scanTarget}
                    onChange={e => setScanTarget(e.target.value)}
                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                  >
                    <option value="">— Select assigned domain to scan —</option>
                    {userDomains.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <button onClick={handleTriggerScan} disabled={scanning || !scanTarget} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem',
                    background: scanning || !scanTarget ? 'var(--bg-main)' : '#F59E0B',
                    color: scanning || !scanTarget ? 'var(--text-secondary)' : '#000',
                    border: 'none', borderRadius: '8px', cursor: scanning || !scanTarget ? 'not-allowed' : 'pointer',
                    fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap'
                  }}>
                    <Zap size={16} /> {scanning ? 'Starting...' : 'Start Scan'}
                  </button>
                </div>
              )}
            </div>

            {/* Domain Assignment */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <Globe size={18} color="#8B5CF6" /> Assigned Domains
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                Domains {selectedUser.username} is authorized to scan.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="e.g. example.com"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAssignDomain()}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                />
                <button onClick={handleAssignDomain} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem',
                  background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap'
                }}>
                  <Plus size={16} /> Add Domain
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {userDomains.length === 0 ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
                    No domains assigned yet.
                  </div>
                ) : userDomains.map(d => (
                  <div key={d} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe size={14} color="#8B5CF6" />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{d}</span>
                    </div>
                    <button onClick={() => handleRemoveDomain(d)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Organization Logo Management */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <Building size={18} color="#3B82F6" /> Organization Logo
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                Upload or change the logo for <b style={{ color: 'var(--text-primary)' }}>{selectedUser.organization}</b> (SVG format only).
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6px' }}>
                  {selectedUser.logo_url ? (
                    <img src={selectedUser.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Shield size={24} style={{ opacity: 0.3 }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="file"
                    accept=".svg"
                    id="org-logo-upload"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append('logo', file);
                        
                        try {
                          const res = await api.request(`/api/auth/organizations/${selectedUser.organization_id}/`, {
                            method: 'PATCH',
                            body: formData
                          });
                          if (!res.ok) {
                            const errData = await res.ok ? null : await res.json();
                            throw new Error(errData?.error || 'Failed to upload logo');
                          }
                          const updatedOrg = await res.json();
                          showToast('Organization logo updated');
                          setSelectedUser(prev => ({
                            ...prev,
                            logo_url: updatedOrg.logo
                          }));
                          fetchData();
                        } catch (err) {
                          showToast(err.message || 'Failed to update logo', 'error');
                        }
                      }
                    }}
                  />
                  <label htmlFor="org-logo-upload" className="btn-outline-sm" style={{ cursor: 'pointer', display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
                    Choose SVG Logo
                  </label>
                </div>
              </div>
            </div>

            {/* Feature Access Control */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                <Shield size={18} color="#10B981" /> Feature Access Control
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>
                Toggle which modules <b style={{ color: 'var(--text-primary)' }}>{selectedUser.username}</b> can access. Active = enabled.
              </p>

              {availableFeatures.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading features...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {availableFeatures.map(f => {
                    const hasFeature = userFeatures.includes(String(f.id));
                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleFeature(String(f.id), hasFeature)}
                        style={{
                          padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                          transition: 'all 0.2s ease',
                          border: `1px solid ${hasFeature ? 'rgba(16,185,129,0.35)' : 'var(--border-color)'}`,
                          background: hasFeature ? 'rgba(16,185,129,0.06)' : 'var(--bg-main)'
                        }}
                      >
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '5px', flexShrink: 0, marginTop: '1px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: hasFeature ? '#10B981' : 'transparent',
                          border: `2px solid ${hasFeature ? '#10B981' : 'var(--border-color)'}`,
                          transition: 'all 0.2s ease'
                        }}>
                          {hasFeature && <Check size={13} color="#fff" />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: hasFeature ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '3px' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {f.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
