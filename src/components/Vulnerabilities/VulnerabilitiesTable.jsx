import React, { useState } from 'react';
import { ExternalLink, Bug, RefreshCw, Shield, ChevronDown, ChevronRight, FileText, Wrench, Link as LinkIcon } from 'lucide-react';

const getSeverityClass = (severity) => (severity || 'low').toLowerCase();
const getStatusClass = (status) => (status || 'open').toLowerCase();

const VulnerabilitiesTable = ({ data, activeFilter, setActiveFilter, allData, loading, showScanningState, isVulnScanRunning }) => {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getCount = (sev) => {
    if (!allData) return 0;
    return allData.filter(d => (d.severity || '').toUpperCase() === sev.toUpperCase()).length;
  };

  return (
    <div className="global-page-container page-animate" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
      <div className="global-filter-row">
        <div 
          className={`global-filter-pill ${activeFilter === 'All' ? 'active' : ''}`}
          onClick={() => setActiveFilter('All')}
        >
          All ({allData?.length || 0})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'Critical' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Critical')}
        >
          Critical ({getCount('Critical')})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'High' ? 'active' : ''}`}
          onClick={() => setActiveFilter('High')}
        >
          High ({getCount('High')})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'Medium' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Medium')}
        >
          Medium ({getCount('Medium')})
        </div>
        <div 
          className={`global-filter-pill ${activeFilter === 'Low' ? 'active' : ''}`}
          onClick={() => setActiveFilter('Low')}
        >
          Low ({getCount('Low')})
        </div>
      </div>

      <div className="card global-table-wrapper">
        <table className="vuln-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>TITLE</th>
              <th>CVE</th>
              <th>SEVERITY</th>
              <th>STATUS</th>
              <th>CVSS</th>
              <th>ASSET</th>
              <th>SOURCE</th>
              <th>AGE</th>
            </tr>
          </thead>
          <tbody>
            {(loading && (!data || data.length === 0)) ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  Loading vulnerabilities list...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row) => (
                <React.Fragment key={row.id}>
                  <tr 
                    onClick={() => toggleRow(row.id)} 
                    style={{ cursor: 'pointer', borderBottom: expandedRows[row.id] ? 'none' : '' }}
                    className={expandedRows[row.id] ? 'active-row' : ''}
                  >
                    <td style={{ textAlign: 'center', color: '#94A3B8' }}>
                      {expandedRows[row.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </td>
                    <td>
                      <div className="vuln-title-cell">
                        <span className="vuln-title-text">{row.title}</span>
                        {row.exploit && (
                          <span className="exploit-badge">
                            <Bug size={10} className="exploit-icon" /> Exploit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-secondary">{row.cve}</td>
                    <td>
                      <span className={`severity-badge sev-${getSeverityClass(row.severity)}`}>
                        <span className="badge-dot"></span> {row.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge stat-${getStatusClass(row.status)}`}>
                        <span className="badge-dot"></span> {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="cvss-cell">
                        <div className={`cvss-bar cvss-${getSeverityClass(row.severity)}`}></div>
                        <span className="cvss-score">{row.cvss.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="font-mono text-secondary">{row.asset}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: '#f1f5f9', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'uppercase'
                      }}>
                        {row.source_tool}
                      </span>
                    </td>
                    <td className="text-secondary">{row.age}</td>
                  </tr>
                  
                  {expandedRows[row.id] && (
                    <tr className="vuln-expanded-row">
                      <td colSpan="9" style={{ padding: 0, borderTop: 'none', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.1)' }}>
                          
                          {/* Description Block */}
                          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent)' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={16} /> Description
                            </h4>
                            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                              {row.description || row.title}
                            </p>
                          </div>
                          
                          {/* Remediation Block */}
                          {(row.remediation && row.remediation !== '-' && row.remediation !== 'No remediation provided.') && (
                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', borderLeft: '4px solid #10b981' }}>
                              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Wrench size={16} /> Remediation
                              </h4>
                              <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                {row.remediation}
                              </p>
                            </div>
                          )}

                          {/* References Block */}
                          {(row.reference && row.reference !== '-' && row.reference !== '—') && (
                            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <LinkIcon size={16} /> References
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {row.reference.split(',').map((ref, idx) => {
                                  const rawLink = ref.trim();
                                  if(!rawLink) return null;
                                  let linkText = rawLink;
                                  try {
                                    linkText = new URL(rawLink).hostname;
                                  } catch (e) {
                                    linkText = rawLink.length > 40 ? rawLink.substring(0,40) + '...' : rawLink;
                                  }
                                  
                                  return (
                                    <a key={idx} href={rawLink.startsWith('http') ? rawLink : `https://${rawLink}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-main)', color: 'var(--accent)', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
                                    >
                                      <ExternalLink size={14} /> {linkText}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748B' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: showScanningState ? 'rgba(34, 211, 238, 0.1)' : 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                      {showScanningState ? (
                        <RefreshCw size={48} color="#22D3EE" strokeWidth={1.5} className="spin" />
                      ) : (
                        <Shield size={48} color="#22C55E" strokeWidth={1.5} />
                      )}
                    </div>
                    <h3 style={{ margin: 0, color: '#0F172A', fontSize: '1.25rem', fontWeight: '600' }}>
                      {showScanningState ? "Scanning in progress..." : "Your website is secure now"}
                    </h3>
                    <p style={{ margin: 0, maxWidth: '400px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {showScanningState 
                        ? (isVulnScanRunning 
                            ? "The Python vulnerability scanner found 0 results. Nuclei is currently running deep scans in the background to uncover complex vulnerabilities."
                            : "The scan is still in its early discovery phases (like subdomains and ports). Vulnerability payload testing has not started yet. Please wait.")
                        : "No vulnerabilities were found during the scan. Great job keeping your attack surface secure!"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VulnerabilitiesTable;
