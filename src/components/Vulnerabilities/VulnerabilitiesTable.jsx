import React, { useState, useEffect } from 'react';
import { ExternalLink, Bug, RefreshCw, Shield, FileText, Wrench, Link as LinkIcon, X, Globe } from 'lucide-react';

const getSeverityClass = (severity) => (severity || 'low').toLowerCase();
const getStatusClass = (status) => (status || 'open').toLowerCase();

/* OWASP category metadata (mirrors the backend owasp_categories.py) */
const OWASP_NAMES = {
  1: 'Broken Access Control',
  2: 'Cryptographic Failures',
  3: 'Injection',
  4: 'Insecure Design',
  5: 'Security Misconfiguration',
  6: 'Vulnerable and Outdated Components',
  7: 'Identification and Authentication Failures',
  8: 'Software and Data Integrity Failures',
  9: 'Security Logging and Monitoring Failures',
  10: 'Server-Side Request Forgery (SSRF)',
};

const OWASP_COLORS = {
  1: '#F87171', 2: '#FBBF24', 3: '#A78BFA', 4: '#F472B6',
  5: '#60A5FA', 6: '#FB923C', 7: '#34D399', 8: '#22D3EE',
  9: '#94A3B8', 10: '#C084FC',
};

const owaspInfo = (row) => {
  const rank = Number(row.owasp_rank);
  if (!rank || rank < 1 || rank > 10) return null;
  return {
    code: `A${String(rank).padStart(2, '0')}`,
    color: OWASP_COLORS[rank] || '#60A5FA',
    name: row.owasp_category || OWASP_NAMES[rank] || '',
  };
};

/* Small OWASP tag shown right next to the asset inside each vulnerability */
const OWASPBadge = ({ row }) => {
  const info = owaspInfo(row);
  if (!info) return null;
  return (
    <span
      className="owasp-badge"
      style={{ background: `${info.color}1a`, border: `1px solid ${info.color}55`, color: info.color }}
      title={`${info.code}:2021 – ${info.name}`}
    >
      {info.code}
    </span>
  );
};

const VulnerabilitiesTable = ({ data, activeFilter, setActiveFilter, allData, loading, showScanningState, isVulnScanRunning }) => {
  const [selectedVuln, setSelectedVuln] = useState(null);

  /* Close the popup with the Escape key + lock page scroll while it is open */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedVuln(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (selectedVuln) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prevOverflow; };
    }
    return undefined;
  }, [selectedVuln]);

  const getCount = (sev) => {
    if (!allData) return 0;
    return allData.filter(d => (d.severity || '').toUpperCase() === sev.toUpperCase()).length;
  };

  const openVuln = (row) => setSelectedVuln(row);

  const renderReferences = (reference) => {
    if (!reference || reference === '-' || reference === '—') return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {reference.split(',').map((ref, idx) => {
          const rawLink = ref.trim();
          if (!rawLink) return null;
          let linkText = rawLink;
          try {
            linkText = new URL(rawLink).hostname;
          } catch (e) {
            linkText = rawLink.length > 40 ? rawLink.substring(0, 40) + '...' : rawLink;
          }
          return (
            <a key={idx} href={rawLink.startsWith('http') ? rawLink : `https://${rawLink}`} target="_blank" rel="noopener noreferrer"
              className="vuln-modal-link"
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
            >
              <ExternalLink size={14} /> {linkText}
            </a>
          );
        })}
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedVuln) return null;
    const row = selectedVuln;
    const owasp = owaspInfo(row);
    const meta = [
      ['CVSS', row.cvss ? row.cvss.toFixed(1) : '—'],
      ['CVE', row.cve && row.cve !== '—' ? row.cve : '—'],
      ['CWE', row.cwe && row.cwe !== '—' ? row.cwe : '—'],
      ['Status', row.status],
      ['Age', row.age],
      ['Source', row.source_tool],
    ];

    return (
      <div className="vuln-modal-overlay" onClick={() => setSelectedVuln(null)}>
        <div className="vuln-modal" role="dialog" aria-modal="true" aria-label={row.title} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="vuln-modal-header">
            <div className="vuln-modal-title-row">
              <span className={`severity-badge sev-${getSeverityClass(row.severity)}`}>
                <span className="badge-dot"></span> {row.severity}
              </span>
              <OWASPBadge row={row} />
              <h3 className="vuln-modal-title">{row.title}</h3>
            </div>
            <button className="vuln-modal-close" onClick={() => setSelectedVuln(null)} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          {/* OWASP banner */}
          {owasp && (
            <div className="vuln-modal-owasp" style={{ borderLeftColor: owasp.color }}>
              <Shield size={16} style={{ color: owasp.color }} />
              <span style={{ color: owasp.color, fontWeight: 800, fontSize: '0.82rem' }}>{owasp.code}:2021</span>
              <span className="vuln-modal-owasp-name">{owasp.name}</span>
            </div>
          )}

          {/* Asset + meta */}
          <div className="vuln-modal-meta">
            <div className="vuln-modal-meta-item vuln-modal-asset">
              <span className="vuln-modal-meta-label">Asset</span>
              <span className="vuln-modal-meta-value vuln-modal-asset-value">
                <Globe size={13} />
                {(row.affected_assets || [row.asset]).join(', ')}
              </span>
            </div>
            {meta.map(([label, value]) => (
              <div key={label} className="vuln-modal-meta-item">
                <span className="vuln-modal-meta-label">{label}</span>
                <span className="vuln-modal-meta-value">{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="vuln-modal-block">
            <h4 className="vuln-modal-block-title"><FileText size={15} /> Description</h4>
            <p className="vuln-modal-block-text">{row.description || row.title}</p>
          </div>

          {/* Remediation */}
          {(row.remediation && row.remediation !== '-' && row.remediation !== 'No remediation provided.') && (
            <div className="vuln-modal-block vuln-modal-remediation">
              <h4 className="vuln-modal-block-title"><Wrench size={15} /> Remediation</h4>
              <p className="vuln-modal-block-text">{row.remediation}</p>
            </div>
          )}

          {/* References */}
          {(() => {
            const refs = renderReferences(row.reference);
            if (!refs) return null;
            return (
              <div className="vuln-modal-block">
                <h4 className="vuln-modal-block-title"><LinkIcon size={15} /> References</h4>
                {refs}
              </div>
            );
          })()}

          {/* Footer */}
          <div className="vuln-modal-footer">
            <button className="vuln-modal-done" onClick={() => setSelectedVuln(null)}>Done</button>
          </div>
        </div>
      </div>
    );
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
              <th>ASSET / OWASP</th>
              <th>CVE</th>
              <th>SEVERITY</th>
              <th>STATUS</th>
              <th>CVSS</th>
              <th>AGE</th>
            </tr>
          </thead>
          <tbody>
            {(loading && (!data || data.length === 0)) ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  Loading vulnerabilities list...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openVuln(row)}
                  className="vuln-row-click"
                  title="Click to view details"
                >
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>
                    <Shield size={15} className="vuln-row-icon" />
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
                  <td>
                    <div className="vuln-asset-cell">
                      <span className="vuln-asset-text" title={row.asset}>{row.asset}</span>
                      <OWASPBadge row={row} />
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
                  <td className="text-secondary">{row.age}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748B' }}>
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
                            ? "The Python vulnerability scanner is currently assessing your attack surface for security risks in real time."
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

      {renderModal()}
    </div>
  );
};

export default VulnerabilitiesTable;
