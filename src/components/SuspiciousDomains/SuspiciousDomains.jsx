import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, RefreshCw, Terminal, Filter, Download, Search, CheckCircle, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './SuspiciousDomains.css';
import { api } from '../../utils/api';

const SuspiciousDomains = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPart, setSearchPart] = useState('Domain');

  // Audit Domain Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditDomainInput, setAuditDomainInput] = useState('');
  const [auditing, setAuditing] = useState(false);

  // Detail Modal
  const [selectedReport, setSelectedReport] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/brand-monitoring/suspicious-domains/');
      setReports(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load suspicious domains", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    if (!auditDomainInput.trim()) return;

    setAuditing(true);
    try {
      const res = await api.post('/api/brand-monitoring/suspicious-domains/', {
        domain: auditDomainInput.trim().toLowerCase()
      });
      alert(`Domain audit queued successfully (ID: ${res.report?.id || 'Pending'}).`);
      setAuditDomainInput('');
      setShowAuditModal(false);
      loadReports();
    } catch (err) {
      console.error("Failed to audit domain", err);
      alert(err.message || "Failed to trigger domain audit.");
    } finally {
      setAuditing(false);
    }
  };

  const handleExport = () => {
    if (reports.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Domain,Resolution,Registrar,Name Server,MX Record,WHOIS Created,Status\n"
      + reports.map(r => 
          `"${r.domain}","${r.resolution_status}","${r.registrar}","${r.name_server}","${r.mx_record}","${r.whois_created}","${r.status}"`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "suspicious_domains_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter calculations
  const filteredData = reports.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (searchPart === 'Domain') return (item.domain || '').toLowerCase().includes(q);
    if (searchPart === 'Registrar') return (item.registrar || '').toLowerCase().includes(q);
    if (searchPart === 'Name Server') return (item.name_server || '').toLowerCase().includes(q);
    return true;
  });

  // Stats calculation
  const totalCount = reports.length;
  const activeCount = reports.filter(r => r.resolution_status === 'Active').length;
  const inactiveCount = reports.filter(r => r.resolution_status === 'Inactive').length;
  const unreviewedCount = reports.filter(r => r.status === 'pending' || r.status === 'running').length;
  const maliciousCount = reports.filter(r => r.resolution_status === 'Active' && r.name_server).length;

  let score = 100;
  if (totalCount > 0) {
    score = Math.max(30, 100 - (activeCount * 8));
  }

  let grade = 'A+';
  if (score < 60) grade = 'D';
  else if (score < 80) grade = 'C';
  else if (score < 90) grade = 'B';
  else if (score < 95) grade = 'A';

  return (
    <div className="sd-container">
      
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Suspicious Domains"
        subtitle="Discover and monitor suspicious look-alike domains that could be used for phishing or brand impersonation."
        stats={[
          { label: 'Total Domains',   value: totalCount.toString(), subtext: 'Monitored lookalikes' },
          { label: 'Suspicious / Active', value: activeCount.toString(), subtext: 'Live HTTP/DNS resolution' },
          { label: 'Newly Registered',value: reports.filter(r => r.whois_created).length.toString(), subtext: 'WHOIS verified' },
          { label: 'Confirmed Malicious', value: maliciousCount.toString(), subtext: 'Threat intelligence hit' },
        ]}
        actions={
          <button className="sd-btn-blue" onClick={() => setShowAuditModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={14}/> Audit Domain
          </button>
        }
      />

      {/* Tabs */}
      <div className="sd-tabs-container">
        <div className="sd-tab active">Overall Portfolio</div>
      </div>

      {/* Stats Cards */}
      <div className="sd-stats-grid">
        
        {/* Score Card */}
        <div className="sd-stat-card card-score">
          <div className="sd-stat-left">
            <span className="sd-stat-label">Portfolio Health</span>
            <span className={`sd-stat-value ${score < 70 ? 'text-red' : score < 90 ? 'text-yellow' : 'text-green'}`}>{score}</span>
          </div>
          <div className="sd-score-badge" style={{ background: score < 70 ? '#EF4444' : score < 90 ? '#EAB308' : '#22C55E' }}>{grade}</div>
        </div>

        {/* Overall Card */}
        <div className="sd-stat-card card-overall">
          <span className="sd-stat-label">Total Monitored</span>
          <span className="sd-stat-value text-blue">{totalCount}</span>
        </div>

        {/* Active Card */}
        <div className="sd-stat-card card-active">
          <span className="sd-stat-label">Active / Live</span>
          <span className="sd-stat-value text-green">{activeCount}</span>
        </div>

        {/* Inactive Card */}
        <div className="sd-stat-card card-inactive">
          <span className="sd-stat-label">Inactive</span>
          <span className="sd-stat-value text-red">{inactiveCount}</span>
        </div>

        {/* Unreviewed Card */}
        <div className="sd-stat-card card-unreviewed">
          <span className="sd-stat-label">Auditing Status</span>
          <span className="sd-stat-value text-darkred">{unreviewedCount}</span>
        </div>

        {/* Removed Card */}
        <div className="sd-stat-card card-removed">
          <span className="sd-stat-label">VT Checked</span>
          <span className="sd-stat-value text-orange">{reports.filter(r => r.status === 'completed').length}</span>
        </div>

      </div>

      {/* Search and Filter Bar */}
      <div className="sd-search-bar">
        <div className="sd-search-left">
          <span className="sd-search-label">CHOOSE SEARCH PART</span>
          <select 
            className="sd-search-select"
            value={searchPart}
            onChange={(e) => setSearchPart(e.target.value)}
          >
            <option value="Domain">Domain</option>
            <option value="Registrar">Registrar</option>
            <option value="Name Server">Name Server</option>
          </select>
          <input 
            type="text" 
            className="sd-search-input" 
            placeholder={`Search lookalikes by ${searchPart.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sd-search-right" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="sd-btn-refresh" onClick={loadReports} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="sd-export-btn" onClick={handleExport} disabled={reports.length === 0}>
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      {filteredData.length > 0 ? (
        <div className="global-table-wrapper" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          <table className="cert-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Resolution</th>
                <th>Registrar</th>
                <th>Name Server</th>
                <th>MX Record</th>
                <th>WHOIS Created</th>
                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id}>
                  <td className="font-bold font-mono">{row.domain}</td>
                  <td>
                    <span 
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: row.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)',
                        color: row.status === 'completed' ? '#22C55E' : '#F97316'
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <span className={`cert-pill ${row.resolution_status === 'Active' ? 'pill-open' : 'pill-closed'}`}>
                      {row.resolution_status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.registrar || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.name_server || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.mx_record || '—'}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{row.whois_created || '—'}</td>
                  <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                    <button 
                      className="sw-btn-outline-blue" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => setSelectedReport(row)}
                    >
                      <Eye size={12} /> WHOIS Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sd-empty-state-panel">
          <Terminal size={48} className="sd-terminal-icon" strokeWidth={1.5} />
          <h2 className="sd-empty-title">{loading ? 'Loading domain details...' : 'No Matching Scans Found'}</h2>
          <p className="sd-empty-subtext">
            {loading ? 'Please wait while we connect to the database.' : `There are no lookalike records matching "${searchQuery}" under the selected tab. Expand your search query or run a new scan domain audit.`}
          </p>
        </div>
      )}

      {/* Add Audit Domain Modal */}
      {showAuditModal && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAuditModal(false)}
        >
          <div 
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '2rem',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Audit Suspicious Lookalike Domain
            </h3>
            <form onSubmit={handleAuditSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Domain to Audit
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. goog1e.com"
                  value={auditDomainInput}
                  onChange={(e) => setAuditDomainInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAuditModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={auditing}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {auditing && <Loader size={12} className="animate-spin" />}
                  {auditing ? 'Starting Audit...' : 'Audit Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* WHOIS Detail Modal */}
      {selectedReport && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div 
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                WHOIS & DNS Audit Details: {selectedReport.domain}
              </h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <strong>Registrar:</strong> {selectedReport.registrar || 'N/A'}
              </div>
              <div>
                <strong>WHOIS Created:</strong> {selectedReport.whois_created || 'N/A'}
              </div>
              <div>
                <strong>Name Server:</strong> {selectedReport.name_server || 'N/A'}
              </div>
              <div>
                <strong>MX Record:</strong> {selectedReport.mx_record || 'N/A'}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700' }}>DNS A Records</h4>
              <pre style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {selectedReport.dns_a || 'No records resolved.'}
              </pre>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700' }}>DNS MX Records</h4>
              <pre style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {selectedReport.dns_mx || 'No records resolved.'}
              </pre>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700' }}>Raw WHOIS Text</h4>
              <pre style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {selectedReport.whois_raw || 'No WHOIS record fetched.'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedReport(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem'
                }}
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

export default SuspiciousDomains;
