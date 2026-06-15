import React, { useState, useEffect } from 'react';
import { Plus, Users, RefreshCw, Search, ArrowRight, Eye, ShieldAlert, CheckCircle, Trash2, ExternalLink } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './ImpersonatingAccount.css';
import { api } from '../../utils/api';

const ImpersonatingAccount = () => {
  const [scans, setScans] = useState([]);
  const [activeScanId, setActiveScanId] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load Maigret/Sherlock Scans
  const loadScans = async (selectLatest = false) => {
    setLoadingScans(true);
    try {
      const data = await api.get('/api/brand-monitoring/impersonation-scans/');
      const list = Array.isArray(data) ? data : (data.results || []);
      setScans(list);
      if (list.length > 0) {
        if (selectLatest || !activeScanId) {
          setActiveScanId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load impersonation scans", err);
    } finally {
      setLoadingScans(false);
    }
  };

  // Load Results for selected scan
  const loadResults = async () => {
    if (!activeScanId) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const data = await api.get(`/api/brand-monitoring/impersonation-results/?scan=${activeScanId}`);
      setResults(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load results", err);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadScans();
  }, []);

  useEffect(() => {
    loadResults();
  }, [activeScanId]);

  // Update action status on a result
  const handleUpdateStatus = async (resultId, newStatus) => {
    try {
      const res = await api.request(`/api/brand-monitoring/impersonation-results/${resultId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ action_status: newStatus })
      });
      const data = await res.json();
      setResults(prev => prev.map(item => item.id === resultId ? { ...item, action_status: data.action_status } : item));
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update action status.");
    }
  };

  const totalScans = scans.length;
  const totalFindings = results.length;
  const platformsChecked = new Set(results.map(r => r.platform)).size;
  const activeThreats = results.filter(r => r.action_status !== 'Closed').length;

  const activeScan = scans.find(s => s.id === Number(activeScanId));

  return (
    <div className="ia-container">
      
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Impersonating Accounts"
        subtitle="Discover real, live fake social media profiles targeting your brand using Maigret & Sherlock OSINT scanners. Scans are triggered automatically from the Dashboard Quick Scan."
        stats={[
          { label: 'Scans Run', value: totalScans.toString(), subtext: 'Total username checks' },
          { label: 'Profiles Found', value: totalFindings.toString(), subtext: 'Verified profiles' },
          { label: 'Platforms Detected', value: platformsChecked.toString(), subtext: 'Unique social sites' },
          { label: 'Active Alerts', value: activeThreats.toString(), subtext: 'Pending resolution' },
        ]}
      />

      {/* Select Scan & Info Row */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
            SELECT USERNAME AUDIT
          </span>
          <select 
            value={activeScanId || ''} 
            onChange={(e) => setActiveScanId(Number(e.target.value))}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
          >
            {scans.map(s => (
              <option key={s.id} value={s.id}>
                @{s.username} ({s.org_name || s.brand_domain})
              </option>
            ))}
            {scans.length === 0 && <option value="">No audits run</option>}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {activeScan && (
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Scan Status: <strong>{activeScan.status}</strong>
            </span>
          )}
          <button onClick={() => loadScans()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={14} className={loadingScans ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      {results.length > 0 ? (
        <div className="global-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="cert-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Followers</th>
                <th>Following</th>
                <th>Visibility</th>
                <th>Action Status</th>
                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <td className="font-bold" style={{ textTransform: 'capitalize' }}>
                    {row.platform_label}
                  </td>
                  <td className="font-mono">@{row.username}</td>
                  <td>{row.full_name || '—'}</td>
                  <td className="font-mono">{row.followers || 0}</td>
                  <td className="font-mono">{row.following || 0}</td>
                  <td>
                    <span 
                      style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        background: row.is_private ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: row.is_private ? '#EF4444' : '#22C55E'
                      }}
                    >
                      {row.is_private ? 'Private' : 'Public'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={row.action_status}
                      onChange={(e) => handleUpdateStatus(row.id, e.target.value)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <option value="Unreviewed">Unreviewed</option>
                      <option value="Take Down">Take Down</option>
                      <option value="Monitor">Monitor</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                    <a 
                      href={row.profile_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="action-link"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Open Profile <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ia-empty-panel" style={{ padding: '4.5rem 1rem' }}>
          <Users size={56} className="ia-empty-icon" strokeWidth={1.5} />
          <h2 className="ia-empty-title">{loadingResults ? 'Loading imposter profiles...' : 'No Fake Profiles Found'}</h2>
          <p className="ia-empty-subtext">
            {loadingResults ? 'Please wait while Maigret scan runs.' : 'There are no lookalike accounts recorded for this username check yet.'}
          </p>
          {!loadingResults && (
            <p className="ia-empty-subtext" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              Scans are automatically triggered from the Dashboard Quick Scan.
            </p>
          )}
        </div>
      )}



    </div>
  );
};

export default ImpersonatingAccount;
