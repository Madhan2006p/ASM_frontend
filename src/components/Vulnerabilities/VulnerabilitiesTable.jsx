import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Bug, RefreshCw, Shield, X, FileText, Wrench, Link as LinkIcon, Eye } from 'lucide-react';

const getSeverityClass = (severity) => (severity || 'low').toLowerCase();

const VulnerabilitiesTable = ({ data, loading, showScanningState, isVulnScanRunning }) => {
  // Store the row id, not a snapshot: the parent re-polls every ~5s during a
  // scan, so the modal re-derives the row from `data` at render time (always
  // current — and auto-closes if the finding disappears from the data).
  const [selectedId, setSelectedId] = useState(null);
  const closeButtonRef = useRef(null);

  const selectedRow = selectedId != null
    ? (data || []).find(r => r.id === selectedId) || null
    : null;

  const openModal = (row) => setSelectedId(row.id);
  const closeModal = () => setSelectedId(null);

  // Auto-close if the open finding disappears during the parent's live
  // polling (row deleted by cleanup) — the modal must not stay locked invisible.
  useEffect(() => {
    if (selectedId != null && !selectedRow) setSelectedId(null);
  }, [selectedId, selectedRow]);

  // Close on Escape + move focus into the dialog + lock background scroll
  useEffect(() => {
    if (selectedId == null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { closeModal(); return; }
      // Block keyboard page-scrolling behind the popup (arrow keys / Space /
      // PageUp / PageDown can still scroll the background when focus leaves the
      // modal) — only let typing/selection keys through.
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        if (!e.target.closest('.vuln-modal-body')) e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    if (closeButtonRef.current) closeButtonRef.current.focus();

    // This app scrolls inside a child container (.main-content with
    // overflow-y:auto), NOT on <body> — and the layout CSS explicitly avoids
    // overflow:hidden on containers (it clips the position:fixed modal). So
    // the reliable way to stop the page scrolling behind the popup is to
    // intercept wheel/touch scroll events at the document level and only let
    // them through when the cursor is over the modal's scrollable body.
    const preventBackgroundScroll = (e) => {
      if (!e.target.closest('.vuln-modal-body')) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('wheel', preventBackgroundScroll);
      document.removeEventListener('touchmove', preventBackgroundScroll);
    };
  }, [selectedId]);

  return (
    <div className="global-page-container page-animate" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
      <div className="card global-table-wrapper">
        <table className="vuln-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>OWASP</th>
              <th>TITLE</th>
              <th>CVE</th>
              <th>SEVERITY</th>
              <th>CVSS</th>
            </tr>
          </thead>
          <tbody>
            {(loading && (!data || data.length === 0)) ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  Loading vulnerabilities list...
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openModal(row)}
                  style={{ cursor: 'pointer' }}
                  className="vuln-row-clickable"
                  title="Click for details"
                >
                  <td style={{ textAlign: 'center', color: '#94A3B8' }}>
                    <Eye size={15} title="View details" />
                  </td>
                  <td>
                    {row.owasp_id ? (
                      <span className="owasp-code-badge" title={row.owasp_category || ''}>{row.owasp_id}</span>
                    ) : (
                      <span className="text-secondary" style={{ fontSize: '0.75rem' }}>—</span>
                    )}
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
                  <td className="font-mono">
                    {row.cve && row.cve !== '—' && row.cve !== '-' ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {String(row.cve).split(',').map((c, idx) => {
                          const cveId = c.trim();
                          if (!cveId || !/^CVE-\d{4}-\d{4,}$/i.test(cveId)) return null;
                          return (
                            <a
                              key={idx}
                              href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cve-link"
                              title={`Open ${cveId} on NVD`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {cveId}
                              <ExternalLink size={10} />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-secondary">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`severity-badge sev-${getSeverityClass(row.severity)}`}>
                      <span className="badge-dot"></span> {row.severity}
                    </span>
                  </td>
                  <td>
                    <div className="cvss-cell">
                      <div className={`cvss-bar cvss-${getSeverityClass(row.severity)}`}></div>
                      <span className="cvss-score">{row.cvss.toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748B' }}>
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

      {/* ── Finding detail modal ── */}
      {/* Portal into document.body: the page container (.page-animate) keeps a
          retained transform from its slide-in animation, which would otherwise
          become the containing block for this position:fixed backdrop and clip
          it to the content area. Mounting on <body> makes the popup overlay the
          entire page (sidebar + header included). */}
      {selectedRow && createPortal(
        <div className="vuln-modal-backdrop" onClick={closeModal}>
          <div
            className="vuln-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedRow.title}
          >
            {/* Modal header */}
            <div className="vuln-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <span className={`severity-badge sev-${getSeverityClass(selectedRow.severity)}`} style={{ flexShrink: 0 }}>
                  <span className="badge-dot"></span> {selectedRow.severity}
                </span>
                <span className="vuln-modal-title">{selectedRow.title}</span>
              </div>
              <button ref={closeButtonRef} className="vuln-modal-close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Modal meta strip */}
            <div className="vuln-modal-meta">
              {selectedRow.owasp_id && (
                <span className="owasp-code-badge" title={selectedRow.owasp_category || ''}>
                  {selectedRow.owasp_id}
                  {selectedRow.owasp_category ? ` · ${selectedRow.owasp_category.split('–')[1] || ''}`.trim() : ''}
                </span>
              )}
              <span className="vuln-modal-meta-item"><strong>CVSS:</strong> {selectedRow.cvss.toFixed(1)}</span>
              <span className="vuln-modal-meta-item"><strong>CVE:</strong> {selectedRow.cve && selectedRow.cve !== '—' ? selectedRow.cve : '—'}</span>
              {selectedRow.source_tool && (
                <span className="vuln-modal-meta-item"><strong>Source:</strong> {selectedRow.source_tool}</span>
              )}
            </div>

            <div className="vuln-modal-body">
              {/* Confidence + Finding Status + Evidence Block (VulnMap) */}
              {(selectedRow.confidence != null || selectedRow.finding_status || selectedRow.evidence) && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', borderLeft: '4px solid #3B82F6' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#3B82F6', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={16} /> Confidence & Evidence
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: selectedRow.evidence ? '1rem' : 0 }}>
                    {(selectedRow.confidence != null) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Confidence</span>
                        <div style={{ width: '120px', height: '8px', borderRadius: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((selectedRow.confidence || 0) * 100)}%`, height: '100%', background: selectedRow.confidence >= 0.8 ? '#10B981' : selectedRow.confidence >= 0.5 ? '#F59E0B' : '#EF4444', borderRadius: '4px' }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{Math.round((selectedRow.confidence || 0) * 100)}%</span>
                      </div>
                    )}
                    {selectedRow.finding_status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Validation</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 10px', borderRadius: '20px', background: selectedRow.finding_status === 'confirmed' ? 'rgba(16,185,129,0.12)' : selectedRow.finding_status === 'potential' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)', color: selectedRow.finding_status === 'confirmed' ? '#10B981' : selectedRow.finding_status === 'potential' ? '#F59E0B' : '#94A3B8', border: `1px solid ${selectedRow.finding_status === 'confirmed' ? 'rgba(16,185,129,0.3)' : selectedRow.finding_status === 'potential' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.3)'}` }}>
                          {selectedRow.finding_status.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedRow.evidence && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', fontFamily: 'monospace' }}>
                      {selectedRow.evidence}
                    </p>
                  )}
                </div>
              )}

              {/* Description Block */}
              <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} /> Description
                </h4>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {selectedRow.description || selectedRow.title}
                </p>
              </div>

              {/* Remediation Block */}
              {(selectedRow.remediation && selectedRow.remediation !== '-' && selectedRow.remediation !== 'No remediation provided.') && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', borderLeft: '4px solid #10b981' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wrench size={16} /> Remediation
                  </h4>
                  <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {selectedRow.remediation}
                  </p>
                </div>
              )}

              {/* References Block */}
              {(selectedRow.reference && selectedRow.reference !== '-' && selectedRow.reference !== '—') && (
                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LinkIcon size={16} /> References
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {selectedRow.reference.split(',').map((ref, idx) => {
                      const rawLink = ref.trim();
                      if (!rawLink) return null;
                      let linkText = rawLink;
                      try {
                        linkText = new URL(rawLink).hostname;
                      } catch (e) {
                        linkText = rawLink.length > 40 ? rawLink.substring(0, 40) + '...' : rawLink;
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

              {/* Affected Assets Block */}
              {selectedRow.affected_assets && selectedRow.affected_assets.length > 0 && (
                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={16} /> Affected Assets
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {selectedRow.affected_assets.map((asset, idx) => (
                      <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-main)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', border: '1px solid var(--border-color)' }}>
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VulnerabilitiesTable;
