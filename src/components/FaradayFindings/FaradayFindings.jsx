import React, { useState, useEffect } from 'react';
import { Shield, SearchX, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './FaradayFindings.css';
import { api } from '../../utils/api';

const FaradayFindings = ({ activeScanId }) => {
  const [findings, setFindings] = useState([]);
  const [connected, setConnected] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // 'success', 'error'
  const [syncMsg, setSyncMsg] = useState('');

  const loadFaradayData = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/attacksurface/faraday-findings/');
      if (data.connected === false) {
        setConnected(false);
        setErrorMsg(data.error || 'Could not connect to Faraday server.');
        setFindings([]);
      } else {
        setConnected(true);
        setErrorMsg('');
        setFindings(data.findings || []);
      }
    } catch (err) {
      console.error("Failed to fetch Faraday findings", err);
      setConnected(false);
      setErrorMsg("Failed to reach the Faraday integration endpoint.");
      setFindings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaradayData();
  }, []);

  const handleSyncToFaraday = async () => {
    if (!activeScanId) {
      setSyncStatus('error');
      setSyncMsg('No active scan selected to sync.');
      return;
    }
    setSyncing(true);
    setSyncStatus(null);
    setSyncMsg('');
    try {
      const res = await api.post('/api/attacksurface/vulnerabilities/send-to-faraday/', {
        scan_id: activeScanId
      });
      if (res.status === 'completed') {
        setSyncStatus('success');
        setSyncMsg(`Successfully synced ${res.created} findings to Faraday!`);
        // Reload findings after short delay
        setTimeout(loadFaradayData, 1500);
      } else {
        setSyncStatus('error');
        setSyncMsg(res.error || 'Failed to complete Faraday sync.');
      }
    } catch (err) {
      console.error("Failed to sync vulnerabilities to Faraday", err);
      setSyncStatus('error');
      setSyncMsg('Failed to sync. Ensure connection settings are correct.');
    } finally {
      setSyncing(false);
    }
  };

  // 1. Significant Findings (Critical, High, or has CVE)
  const significantFindings = findings.filter(f => {
    const sev = (f.severity || '').toLowerCase();
    return sev === 'critical' || sev === 'high' || (f.cve && f.cve !== '—');
  });

  // 2. Full Findings (filtered and searched)
  const filteredFindings = findings.filter(f => {
    // Severity filter
    if (severityFilter !== 'all') {
      if ((f.severity || '').toLowerCase() !== severityFilter) return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = (f.title || '').toLowerCase();
      const desc = (f.description || '').toLowerCase();
      const cve = (f.cve || '').toLowerCase();
      const endpoint = (f.endpoint || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !cve.includes(q) && !endpoint.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Pagination calculations
  const totalItems = filteredFindings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFindings = filteredFindings.slice(startIndex, startIndex + itemsPerPage);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, severityFilter]);

  return (
    <div className="faraday-container">
      
      <PageHeaderCard
        badgeText="VULNERABILITY INTEGRATION"
        title="Faraday Findings"
        subtitle="Manage and analyze vulnerabilities imported from external testing tools into Faraday's environment."
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className={`faraday-sync-btn ${syncing ? 'syncing' : ''}`}
              onClick={handleSyncToFaraday}
              disabled={syncing || !activeScanId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Current Scan'}
            </button>
          </div>
        }
      />

      {/* Sync Status Banner */}
      {syncMsg && (
        <div 
          className={`sync-status-banner ${syncStatus}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '9px',
            marginBottom: '1.5rem',
            border: '1px solid',
            background: syncStatus === 'success' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            borderColor: syncStatus === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: syncStatus === 'success' ? '#10B981' : '#EF4444',
            fontSize: '0.85rem'
          }}
        >
          {syncStatus === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Offline Alert */}
      {!connected && (
        <div 
          className="faraday-offline-banner"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            padding: '1.25rem',
            borderRadius: '9px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: '#D97706',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}
        >
          <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Faraday Workspace Offline</h4>
            <p>{errorMsg}</p>
            <p style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '0.25rem' }}>
              Ensure your local Faraday service is running on port 5985, or verify settings.py settings.
            </p>
          </div>
        </div>
      )}

      {/* Significant Findings Panel */}
      <div className="ff-panel">
        <div className="ff-panel-header">
          <h2 className="ff-panel-title">Significant Findings</h2>
          <p className="ff-panel-subtitle">Critical, high, and CVE-linked findings from Faraday.</p>
        </div>

        <div className="ff-table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="ff-table">
              <thead>
                <tr>
                  <th>SEVERITY</th>
                  <th>TITLE</th>
                  <th>CVE</th>
                  <th>ENDPOINT</th>
                  <th>DESCRIPTION</th>
                  <th>RECOMMENDED FIX</th>
                </tr>
              </thead>
              <tbody>
                {significantFindings.length > 0 ? (
                  significantFindings.map((row) => (
                    <tr key={row.finding_id}>
                      <td>
                        <span className={`cert-pill uppercase pill-${(row.severity || 'info').toLowerCase()}`}>
                          {row.severity}
                        </span>
                      </td>
                      <td className="font-bold">{row.title}</td>
                      <td className="font-mono">{row.cve || '—'}</td>
                      <td className="font-mono text-secondary">{row.endpoint || '—'}</td>
                      <td>
                        <div className="line-clamp-2" title={row.description}>
                          {row.description}
                        </div>
                      </td>
                      <td>
                        <div className="line-clamp-2" title={row.mitigation}>
                          {row.mitigation || '—'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="ff-empty-state-container" style={{ padding: '3rem 0', background: 'transparent', border: 'none' }}>
                        <div className="empty-state-content">
                          <SearchX size={32} strokeWidth={1} className="empty-state-icon" />
                          <span>No significant findings available.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Full Findings Panel */}
      <div className="ff-panel" style={{ marginTop: '1.5rem' }}>
        <div className="ff-panel-header with-controls">
          <div>
            <h2 className="ff-panel-title">Full Findings</h2>
            <p className="ff-panel-subtitle">Sorted by severity, with search, filtering, and pagination.</p>
          </div>
          <div className="ff-controls">
            <input 
              type="text" 
              placeholder="Search findings..." 
              className="ff-search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select 
              className="ff-filter-select" 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        <div className="ff-table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="ff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>SEVERITY</th>
                  <th>TITLE</th>
                  <th>CVE</th>
                  <th>CWE</th>
                  <th>ENDPOINT</th>
                  <th>ACTIVE</th>
                  <th>DATE FOUND</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFindings.length > 0 ? (
                  paginatedFindings.map((row) => (
                    <tr key={row.finding_id}>
                      <td className="font-mono text-secondary">#{row.finding_id}</td>
                      <td>
                        <span className={`cert-pill uppercase pill-${(row.severity || 'info').toLowerCase()}`}>
                          {row.severity}
                        </span>
                      </td>
                      <td className="font-bold">{row.title}</td>
                      <td className="font-mono">{row.cve || '—'}</td>
                      <td className="font-mono">{row.cwe || '—'}</td>
                      <td className="font-mono text-secondary">{row.endpoint || '—'}</td>
                      <td>
                        <span className={`cert-pill ${row.active ? 'pill-open' : 'pill-closed'}`}>
                          {row.active ? 'Active' : 'Mitigated'}
                        </span>
                      </td>
                      <td className="font-mono text-secondary">
                        {row.date_found ? new Date(row.date_found).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">
                      <div className="ff-empty-state-container" style={{ padding: '3rem 0', background: 'transparent', border: 'none' }}>
                        <div className="empty-state-content">
                          <SearchX size={32} strokeWidth={1} className="empty-state-icon" />
                          <span>No findings match the current filters.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalItems > 0 && (
          <div className="ff-pagination-footer">
            <span className="ff-total-count">{totalItems} findings found</span>
            <div className="ff-pagination-controls">
              <button 
                className={`page-btn ${currentPage === 1 ? 'disabled' : ''}`}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="page-info">Page {currentPage} of {totalPages}</span>
              <button 
                className={`page-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default FaradayFindings;
