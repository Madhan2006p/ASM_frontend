import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X, ArrowUpDown, Eye, AlertTriangle, Boxes, CheckCircle2, Globe, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import TechBadge from './TechBadge';
import { parseTechEntry, getEolInfo, techCategoryIcon } from '../../utils/techUtils';
import './Technologies.css';

// Max technology badges shown inline per row before the "+N more" button.
const INLINE_BADGE_LIMIT = 3;

const TechTable = ({ onDataFiltered, subdomainTechs = [], loading, selectedDomain = '', techFilter = 'ALL', setTechFilter }) => {
  const [selectedSubdomainModal, setSelectedSubdomainModal] = useState(null);
  const [sortField, setSortField] = useState('subdomain');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const closeModal = () => setSelectedSubdomainModal(null);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Escape key + body scroll lock while the modal is open
  useEffect(() => {
    if (!selectedSubdomainModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selectedSubdomainModal]);

  const filteredData = (subdomainTechs || []).filter(item => {
    // Stat Card interactive filter
    if (techFilter === 'ACTIVE') {
      const s = (item.status || 'active').toLowerCase();
      const isActive = s === 'live' || s === 'active' || s === 'up';
      if (!isActive) return false;
    } else if (techFilter === 'INACTIVE') {
      const s = (item.status || '').toLowerCase();
      const isInactive = s === 'inactive' || s === 'down';
      if (!isInactive) return false;
    } else if (techFilter === 'OTHER') {
      const s = (item.status || '').toLowerCase();
      const isStandard = s === 'live' || s === 'active' || s === 'up' || s === 'inactive' || s === 'down';
      if (isStandard) return false;
    }

    // Domain filter from top dropdown
    if (selectedDomain && selectedDomain !== 'ALL DOMAINS' && selectedDomain !== 'All Domains' && selectedDomain !== 'Overall') {
      const isMatch = item.parentDomain === selectedDomain || item.subdomain.endsWith(selectedDomain);
      if (!isMatch) return false;
    }

    return true;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'technologies') {
      aVal = (a.technologies || []).length;
      bVal = (b.technologies || []).length;
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    if (onDataFiltered) {
      onDataFiltered(sortedData);
    }
  }, [subdomainTechs, selectedDomain, sortField, sortDirection, techFilter]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [techFilter, selectedDomain, sortField, sortDirection, subdomainTechs]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const validPage = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const startIndex = (validPage - 1) * itemsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  /* ── Modal summary stats ─────────────────────────────── */
  const modalTechs = selectedSubdomainModal?.technologies || [];
  const modalParsed = modalTechs.map(t => {
    const { name, version, category } = parseTechEntry(t);
    const eol = getEolInfo(name, version);
    return { name, version, category, outdated: eol.outdated, eolNote: eol.note };
  });
  const modalWithVersion = modalParsed.filter(t => t.version).length;
  const modalOutdated = modalParsed.filter(t => t.outdated).length;

  return (
    <div className="card tech-table-card">

      {/* 8-Column Reference Table */}
      <div className="card global-table-wrapper" style={{ padding: '0', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
            Loading technologies inventory...
          </div>
        ) : sortedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No records found matching the criteria.
          </div>
        ) : (
          <div className="tech-table-responsive-wrapper" style={{ border: 'none', margin: '0', borderRadius: '0' }}>
            <table className="tech-table">
              <thead>
                <tr className="light-blue-header">
                  <th style={{ width: '4%', textAlign: 'center' }}>
                    S.No
                  </th>
                  <th style={{ width: '16%', cursor: 'pointer' }} onClick={() => handleSort('subdomain')}>
                    <div className="th-content">
                      Domain
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '8%', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                    <div className="th-content">
                      Status
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '11%', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    <div className="th-content">
                      Title
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '34%', cursor: 'pointer' }} onClick={() => handleSort('technologies')}>
                    <div className="th-content">
                      Technology ({sortedData.reduce((s, r) => s + (r.technologies || []).length, 0)})
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '8%', cursor: 'pointer' }} onClick={() => handleSort('createdDate')}>
                    <div className="th-content">
                      Created Date
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, index) => {
                  const techs = row.technologies || [];

                  return (
                    <tr
                      key={row.id || index}
                      className="tech-table-row"
                      onClick={() => setSelectedSubdomainModal(row)}
                      title="Click row to view all detected technologies"
                    >
                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {startIndex + index + 1}
                      </td>
                      {/* Clickable domain */}
                      <td>
                        <span className="tech-subdomain-text">{row.subdomain}</span>
                      </td>
                      <td>
                        <span className="tech-status-badge active">
                          <span className="status-dot"></span>
                          {row.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }} title={row.title}>
                        {row.title && row.title.length > 25 ? row.title.substring(0, 25) + '...' : (row.title || '-')}
                      </td>
                      <td>
                        {/* Inline badges (capped) + "+N more" button → full popup */}
                        <div className="tech-badges-wrap">
                          {techs.slice(0, INLINE_BADGE_LIMIT).map((tech, tIdx) => (
                            <TechBadge key={tIdx} raw={tech} />
                          ))}
                          {techs.length === 0 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No technologies</span>
                          )}
                          {techs.length > INLINE_BADGE_LIMIT && (
                            <button
                              className="tech-more-btn"
                              onClick={() => setSelectedSubdomainModal(row)}
                              title="Click to view all technologies with versions"
                            >
                              +{techs.length - INLINE_BADGE_LIMIT} more
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {row.createdDate || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="table-footer">
          <div className="footer-info">
            Showing {sortedData.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="footer-pagination">
            <button 
              className="page-btn" 
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              style={{opacity: currentPage <= 1 ? 0.3 : 1}}
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {totalPages === 0 ? 0 : validPage} of {totalPages}</span>
            <button 
              className="page-btn" 
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || totalPages === 0}
              style={{opacity: (currentPage >= totalPages || totalPages === 0) ? 0.3 : 1}}
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Full-screen overlapping modal popup ──
           Rendered through a portal to document.body so it covers the WHOLE
           viewport (sidebar + header included). The page container applies a
           persistent transform animation which would otherwise trap a
           position:fixed overlay to the table area only. */}
      {selectedSubdomainModal && createPortal(
        <div className="tech-modal-overlay" onClick={closeModal}>
          <div className="tech-modal-panel" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="tech-modal-header">
              <div className="tech-modal-title-block">
                <span className="tech-modal-kicker">
                  <Boxes size={12} /> TECHNOLOGY INVENTORY
                </span>
                <h3 className="tech-modal-title">{selectedSubdomainModal.subdomain}</h3>
                <div className="tech-modal-meta">
                  <span className="tech-modal-status">
                    <span className="status-dot"></span>
                    {selectedSubdomainModal.status || 'Active'}
                  </span>
                  <span className="tech-modal-meta-item">
                    <Globe size={11} /> https://{selectedSubdomainModal.subdomain}
                  </span>
                  <span className="tech-modal-meta-item">
                    {modalTechs.length} technologies detected
                  </span>
                  {selectedSubdomainModal.createdDate && (
                    <span className="tech-modal-meta-item">
                      <Calendar size={11} /> Scanned {selectedSubdomainModal.createdDate}
                    </span>
                  )}
                  {selectedSubdomainModal.title && selectedSubdomainModal.title !== '-' && (
                    <span className="tech-modal-meta-item">{selectedSubdomainModal.title}</span>
                  )}
                </div>
              </div>
              <button className="tech-modal-close" onClick={closeModal} title="Close (Esc)">
                <X size={20} />
              </button>
            </div>

            {/* Summary strip */}
            <div className="tech-modal-summary">
              <div className="tech-modal-summary-item">
                <span className="tech-modal-summary-num">{modalTechs.length}</span>
                <span className="tech-modal-summary-lbl">Total Technologies</span>
              </div>
              <div className="tech-modal-summary-item">
                <span className="tech-modal-summary-num">{modalWithVersion}</span>
                <span className="tech-modal-summary-lbl">With Version</span>
              </div>
              <div className={`tech-modal-summary-item ${modalOutdated > 0 ? 'warn' : 'ok'}`}>
                <span className="tech-modal-summary-num">{modalOutdated}</span>
                <span className="tech-modal-summary-lbl">{modalOutdated > 0 ? 'Outdated / EOL' : 'All Supported'}</span>
              </div>
            </div>

            {/* Body — every technology for this domain */}
            <div className="tech-modal-body">
              {modalParsed.length === 0 ? (
                <div className="tech-modal-empty">
                  <CheckCircle2 size={30} style={{ color: '#22C55E', opacity: 0.5 }} />
                  <span>No technologies detected for this domain.</span>
                </div>
              ) : (
                <>
                  <div className="tech-modal-grid-head">
                    <span>All technologies detected on this subdomain</span>
                    <span className="tech-modal-grid-count">
                      {modalParsed.filter(t => t.version).length} with version · {modalParsed.length} total
                    </span>
                  </div>
                  <div className="tech-modal-grid">
                    {modalParsed.map((t, idx) => (
                      <div key={idx} className={`tech-modal-card ${t.outdated ? 'outdated' : ''}`}>
                        <div className="tech-modal-card-top">
                          <span
                            className="tech-modal-card-icon"
                            style={{ background: `${techCategoryIcon(t.category)}22`, borderColor: `${techCategoryIcon(t.category)}55` }}
                          >
                            <span
                              className="tech-cat-dot"
                              style={{ background: techCategoryIcon(t.category) }}
                            />
                          </span>
                          <span className="tech-modal-card-name">{t.name}</span>
                        </div>
                        <div className="tech-modal-card-details">
                          <div className={`tech-modal-card-version-row ${t.version ? (t.outdated ? 'outdated' : '') : 'unknown'}`}>
                            <span className="tech-modal-card-detail-label">Version</span>
                            <span className="tech-modal-card-detail-value">
                              {t.version || 'Not disclosed'}
                            </span>
                          </div>
                          <div className="tech-modal-card-cat">
                            <span className="tech-modal-card-detail-label">Category</span>
                            <span className="tech-modal-card-detail-value">{t.category || 'Uncategorized'}</span>
                          </div>
                        </div>
                        <div className={`tech-modal-card-status ${t.outdated ? 'eol' : 'ok'}`}>
                          {t.outdated ? (
                            <><AlertTriangle size={12} /> {t.eolNote || 'Version reached end-of-life'}</>
                          ) : (
                            <><CheckCircle2 size={12} /> {t.version ? 'Supported version' : 'No version / no EOL concerns'}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="tech-modal-footer">
              <span className="tech-modal-footer-hint">
                Press <kbd>Esc</kbd> or click outside to close
              </span>
              <button className="tech-modal-footer-btn" onClick={closeModal}>
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

export default TechTable;
