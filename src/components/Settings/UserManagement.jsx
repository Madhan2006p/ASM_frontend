import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../utils/api';
import { Shield, User, Monitor, Key, Zap, CheckCircle2, ChevronRight, Check, Plus, X, Copy } from 'lucide-react';
import './Settings.css'; // Uses existing styles

const UserManagement = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [userFeatures, setUserFeatures] = useState([]);
  
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'member' });
  const [createdCredentials, setCreatedCredentials] = useState(null);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const url = currentUser.is_superuser 
          ? '/api/auth/admin/users/' 
          : `/api/auth/admin/organizations/${currentUser.organization_id}/users/`;
        const res = await api.get(url);
        const filteredUsers = res.filter(u => !u.is_superuser);
        setUsers(filteredUsers);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    const fetchAllFeatures = async () => {
      try {
        const res = await api.get('/api/auth/features/');
        setAvailableFeatures(res.features || []);
      } catch (err) {
        console.error("Failed to fetch features", err);
      }
    };

    if (currentUser?.organization_id) {
      fetchUsers();
      fetchAllFeatures();
      setLoading(false);
    }
  }, [currentUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        username: userForm.username.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        org_id: currentUser.organization_id || '1',
        role: userForm.role
      };
      
      const res = await api.post('/api/auth/admin/create-user/', payload);
      
      setCreatedCredentials({
        username: userForm.username.trim(),
        password: userForm.password,
        email: userForm.email.trim()
      });
      
      setShowCreateUser(false);
      
      const url = currentUser.is_superuser 
        ? '/api/auth/admin/users/' 
        : `/api/auth/admin/organizations/${currentUser.organization_id}/users/`;
      const freshUsers = await api.get(url);
      const filtered = freshUsers.filter(u => !u.is_superuser);
      setUsers(filtered);
    } catch (err) {
      console.error("Failed to create user", err);
      alert(err.message || "Failed to create user");
    }
  };

  const handleSelectUser = async (u) => {
    setSelectedUser(u);
    try {
      const res = await api.get(`/api/auth/admin/users/${u.id}/features/`);
      const featureIds = res.feature_ids ? res.feature_ids.split(',').filter(Boolean) : [];
      setUserFeatures(featureIds);
    } catch (err) {
      console.error("Failed to fetch user features", err);
      setUserFeatures([]);
    }
  };

  const handleToggleFeature = async (featureId, hasFeature) => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.id) {
      alert("You cannot modify your own features.");
      return;
    }
    if (currentUser.role !== 'admin' && !currentUser.is_superuser) {
      alert("Only organization administrators can modify user features.");
      return;
    }
    const action = hasFeature ? 'take' : 'give';
    try {
      const res = await api.post(`/api/auth/admin/users/${selectedUser.id}/features/`, {
        action,
        feature_id: String(featureId)
      });
      const featureIds = res.feature_ids ? res.feature_ids.split(',').filter(Boolean) : [];
      setUserFeatures(featureIds);
    } catch (err) {
      console.error("Failed to toggle feature", err);
      alert(err.message || "Failed to update feature access");
    }
  };

  if (loading) return <div>Loading user management...</div>;

  const filteredFeatures = (currentUser.is_superuser || !currentUser.features || currentUser.features.length === 0)
    ? availableFeatures
    : availableFeatures.filter(f => currentUser.features.includes(String(f.id)));

  return (
    <div className="user-management-container" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
      {/* Users List Panel */}
      <div className="users-list-panel" style={{ flex: '1', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} /> Organization Users
          </h3>
          {(currentUser.role === 'admin' || currentUser.is_superuser) && (
            <button 
              onClick={() => {
                setUserForm({ username: '', email: '', password: '', role: 'member' });
                setShowCreateUser(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                background: '#3B82F6',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              <Plus size={14} /> New User
            </button>
          )}
        </div>
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {users.map(u => (
            <div 
              key={u.id} 
              onClick={() => handleSelectUser(u)}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: selectedUser?.id === u.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', color: '#3B82F6', flexShrink: 0, overflow: 'hidden' }}>
                {u.profile_photo_url ? (
                  <img src={u.profile_photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (u.full_name || u.username || 'U')[0].toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {u.full_name || u.username}
                  {u.id === currentUser.id && (
                    <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontWeight: '500' }}>You</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{u.role}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>•</span>
                  <span style={{ fontSize: '0.7rem', color: '#10B981' }}>{u.organization}</span>
                </div>
              </div>
              <ChevronRight size={14} color="var(--text-secondary)" />
            </div>
          ))}
          {users.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found.</div>}
        </div>
      </div>

      {/* User Details & Feature Control Panel */}
      <div className="user-details-panel" style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Removed Toast */}

        {!selectedUser ? (
          <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
            <User size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>
              {(currentUser.role === 'admin' || currentUser.is_superuser)
                ? "Select a user to manage their features."
                : "Select a user to see their roles."}
            </p>
          </div>
        ) : (
          <>
            {/* User Profile Card */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.35rem', color: '#3B82F6', overflow: 'hidden', flexShrink: 0 }}>
                {selectedUser.profile_photo_url ? (
                  <img src={selectedUser.profile_photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (selectedUser.full_name || selectedUser.username || 'U')[0].toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedUser.full_name || selectedUser.username}
                  {selectedUser.id === currentUser.id && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontWeight: '600' }}>You</span>
                  )}
                </h3>
                <p style={{ margin: '2px 0 6px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedUser.email}</p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={10} /> {selectedUser.role || 'Member'}
                  </span>
                  {selectedUser.organization && (
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '2px 8px', borderRadius: '12px' }}>
                      {selectedUser.organization}
                    </span>
                  )}
                </div>
              </div>
            </div>            {/* Feature Access Card (Admin Only) or Active Features Card (Non-Admin View) */}
            {(currentUser.role === 'admin' || currentUser.is_superuser) ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="#10B981" /> Feature Access Control
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  {selectedUser.id === currentUser.id
                    ? "Your active features (assigned by Super Admin). You cannot modify your own features."
                    : `Select which modules ${selectedUser.username} is allowed to access in the application.`}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {filteredFeatures.map(f => {
                    const hasFeature = userFeatures.includes(String(f.id));
                    const isSelf = selectedUser.id === currentUser.id;
                    return (
                      <div 
                        key={f.id}
                        onClick={() => {
                          if (isSelf) return;
                          handleToggleFeature(f.id, hasFeature);
                        }}
                        style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: `1px solid ${hasFeature ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`,
                          background: hasFeature ? 'rgba(16,185,129,0.05)' : 'var(--bg-main)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: isSelf ? 'default' : 'pointer',
                          opacity: isSelf ? 0.75 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ 
                          width: '20px', height: '20px', borderRadius: '4px', 
                          background: hasFeature ? '#10B981' : 'transparent',
                          border: `2px solid ${hasFeature ? '#10B981' : 'var(--border-color)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: '2px'
                        }}>
                          {hasFeature && <Check size={14} color="#fff" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: hasFeature ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '4px' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {f.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="#10B981" /> Active Features
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Features assigned to this user:
                </p>
                {userFeatures.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>No active features assigned to this user.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {availableFeatures.filter(f => userFeatures.includes(String(f.id))).map(f => (
                      <div 
                        key={f.id}
                        style={{
                          padding: '0.6rem 1.25rem',
                          borderRadius: '30px',
                          border: '1px solid rgba(16,185,129,0.25)',
                          background: 'rgba(16,185,129,0.06)',
                          color: '#10B981',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          flex: '1 1 200px',
                          minWidth: '200px'
                        }}
                      >
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{f.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal', lineHeight: '1.3' }}>{f.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUser && createPortal(
        <div className="um-modal-backdrop">
          <div className="um-modal-card">
            <div className="um-modal-header">
              <h3 className="um-modal-title">
                <User size={20} color="#10B981" /> New Organization User
              </h3>
              <button className="um-modal-close" onClick={() => setShowCreateUser(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="um-modal-form">
              <div className="um-form-group">
                <label className="um-label">Username</label>
                <input type="text" placeholder="Username" value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  className="um-input" required />
              </div>
              <div className="um-form-group">
                <label className="um-label">Email Address</label>
                <input type="email" placeholder="Email Address" value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  className="um-input" required />
              </div>
              <div className="um-form-group">
                <label className="um-label">Password</label>
                <input type="text" placeholder="Password" value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="um-input" required />
              </div>
              <div className="um-form-group">
                <label className="um-label">Role</label>
                <select value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  className="um-select">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="um-btn-group">
                <button type="button" onClick={() => setShowCreateUser(false)} className="um-btn um-btn-secondary">Cancel</button>
                <button type="submit" className="um-btn um-btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Share Credentials Modal */}
      {createdCredentials && createPortal(
        <div className="um-modal-backdrop">
          <div className="um-modal-card">
            <div className="um-modal-header">
              <h3 className="um-modal-title" style={{ color: '#10B981' }}>
                <CheckCircle2 size={20} /> Credentials Created
              </h3>
              <button className="um-modal-close" onClick={() => setCreatedCredentials(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#9ca3af', margin: '0 0 1.25rem 0', lineHeight: '1.4' }}>
              User has been successfully created. Copy and share these credentials securely:
            </p>
            <div className="um-credentials-box">
              <div className="um-cred-row">
                <span className="um-cred-label">Username:</span>
                <span className="um-cred-value">{createdCredentials.username}</span>
              </div>
              <div className="um-cred-row">
                <span className="um-cred-label">Email:</span>
                <span className="um-cred-value">{createdCredentials.email}</span>
              </div>
              <div className="um-cred-row">
                <span className="um-cred-label">Password:</span>
                <span className="um-cred-value monospace">{createdCredentials.password}</span>
              </div>
            </div>
            <div className="um-btn-group">
              <button 
                onClick={() => {
                  const text = `Username: ${createdCredentials.username}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  alert("Credentials copied to clipboard!");
                }}
                className="um-btn um-btn-copy"
              >
                <Copy size={16} /> Copy Credentials
              </button>
              <button 
                onClick={() => setCreatedCredentials(null)} 
                className="um-btn um-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default UserManagement;
