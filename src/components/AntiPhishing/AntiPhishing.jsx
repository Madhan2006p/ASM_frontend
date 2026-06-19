import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, RefreshCw, Plus, Search, HelpCircle, CheckCircle, AlertTriangle, Eye, ShieldAlert, Image } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './AntiPhishing.css';
import { api } from '../../utils/api';

const AntiPhishing = ({ activeTarget }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');



  // Detail Modal
  const [selectedReport, setSelectedReport] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/brand-monitoring/phishing-domains/');
      setReports(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to load phishing reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExport = () => {
    if (reports.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Domain,Type,Active,Page Title,URLScan Score,URLScan Reputation,Technologies\n"
      + reports.map(r => 
          `"${r.domain}","${r.variation_type}",${r.is_active},"${r.page_title}",${r.urlscan_score},"${r.urlscan_status}","${(r.technologies || []).join(', ')}"`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "phishing_domains_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = reports.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (item.domain || '').toLowerCase().includes(q) || 
           (item.variation_type || '').toLowerCase().includes(q) ||
           (item.page_title || '').toLowerCase().includes(q);
  });

  const totalCount = reports.length;
  const phishingCount = reports.filter(r => r.urlscan_status === 'suspicious' || r.urlscan_status === 'malicious').length;
  const activeCount = reports.filter(r => r.is_active).length;

  return (
    <div className="ap-container">
      
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Phishing Domains"
        subtitle="Monitor look-alike domain registrations, typosquats, URLScan security reputations, and web technology profiles."
        stats={[
          { label: 'Monitored Lookalikes', value: totalCount.toString(), subtext: 'Typosquats registered' },
          { label: 'Phishing Flagged', value: phishingCount.toString(), subtext: 'High URLScan threat score' },
          { label: 'Live Resolution',  value: activeCount.toString(), subtext: 'A/MX records active' },
          { label: 'Clean / Inactive',  value: (totalCount - phishingCount).toString(), subtext: 'No risk detected' },
        ]}
      />

      {/* Controls */}
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
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
          <div className="global-search-box" style={{ width: '100%', maxWidth: '400px' }}>
            <Search size={16} color="#94A3B8" />
            <input 
              type="text" 
              placeholder="Search typosquats or page titles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      {filteredData.length > 0 ? (
        <div className="global-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="cert-table">
            <thead>
              <tr>
                <th>Typosquat Domain</th>
                <th>Variation Type</th>
                <th>Status</th>
                <th>Live</th>
                <th>Page Title</th>
                <th>URLScan Score</th>
                <th>Reputation</th>
                <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id}>
                  <td className="font-bold font-mono">{row.domain}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {row.variation_type || 'Unknown'}
                  </td>
                  <td>
                    <span 
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.65rem',
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
                    <span 
                      style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        background: row.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                        color: row.is_active ? '#22C55E' : '#64748B'
                      }}
                    >
                      {row.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.page_title}>
                    {row.page_title || '—'}
                  </td>
                  <td className="font-mono" style={{ fontWeight: '700' }}>
                    {row.urlscan_score || 0}
                  </td>
                  <td>
                    <span 
                      className={`cert-pill pill-${(row.urlscan_status || 'unreviewed').toLowerCase()}`}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {row.urlscan_status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '2rem' }}>
                    <button 
                      className="sw-btn-outline-blue" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => setSelectedReport(row)}
                    >
                      <Eye size={12} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ap-empty-panel" style={{ padding: '4rem 1rem' }}>
          <Shield size={56} className="ap-empty-icon" strokeWidth={1.5} />
          <h2 className="ap-empty-title">{loading ? 'Loading phishing data...' : 'No Phishing Threats Found'}</h2>
          <p className="ap-empty-subtext">
            {loading ? 'Please wait while we sync threat records.' : 'No lookalike registrations verified.'}
          </p>
        </div>
      )}



      {/* Details Dialog */}
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
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>
                Phishing Intel: {selectedReport.domain}
              </h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            {/* Split layout: Info & Screenshot */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedReport.screenshot_url ? '1.2fr 0.8fr' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '0.9rem' }}>Typosquat Breakdown</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <div><strong>Apex Domain:</strong> {selectedReport.apex_domain}</div>
                  <div><strong>Typosquat Type:</strong> {selectedReport.variation_type}</div>
                  <div><strong>URLScan Score:</strong> {selectedReport.urlscan_score || 0} / 100</div>
                  <div><strong>URLScan Verdict:</strong> {selectedReport.urlscan_status}</div>
                  <div><strong>HTTP Server:</strong> {selectedReport.server_header || '—'}</div>
                  <div><strong>Page Title:</strong> {selectedReport.page_title || '—'}</div>
                </div>

                <h4 style={{ margin: '1rem 0 0.5rem 0', fontWeight: '700', fontSize: '0.9rem' }}>Technologies Detected</h4>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {selectedReport.technologies && selectedReport.technologies.length > 0 ? (
                    selectedReport.technologies.map((t, idx) => (
                      <span key={idx} style={{ padding: '0.2rem 0.5rem', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {t}
                      </span>
                    ))
                  ) : 'None detected.'}
                </div>

                <h4 style={{ margin: '1rem 0 0.5rem 0', fontWeight: '700', fontSize: '0.9rem' }}>DNS Resolution</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div><strong>A Records:</strong> {selectedReport.dns_a || '—'}</div>
                  <div><strong>NS Records:</strong> {selectedReport.dns_ns || '—'}</div>
                  <div><strong>MX Records:</strong> {selectedReport.dns_mx || '—'}</div>
                </div>
              </div>

              {selectedReport.screenshot_url && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Image size={14} /> Screen Capture
                  </h4>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', background: '#F8FAFC' }}>
                    <img 
                      src={selectedReport.screenshot_url} 
                      alt="Threat page capture" 
                      style={{ width: '100%', height: 'auto', display: 'block' }} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}
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

export default AntiPhishing;
