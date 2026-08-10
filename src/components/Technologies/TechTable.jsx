import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, X, Filter, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import './Technologies.css';

const TechTable = ({ onDataFiltered, subdomainTechs = [], loading, selectedDomain = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubdomainModal, setSelectedSubdomainModal] = useState(null);
  const [sortField, setSortField] = useState('subdomain');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredData = (subdomainTechs || []).filter(item => {
    // Domain filter from top dropdown
    if (selectedDomain && selectedDomain !== 'ALL DOMAINS' && selectedDomain !== 'All Domains') {
      const isMatch = item.parentDomain === selectedDomain || item.subdomain.endsWith(selectedDomain);
      if (!isMatch) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchSub = (item.subdomain || '').toLowerCase().includes(query);
      const matchTitle = (item.title || '').toLowerCase().includes(query);
      const matchStatus = (item.status || '').toLowerCase().includes(query);
      const matchTeam = (item.actionTeam || '').toLowerCase().includes(query);
      const matchTech = (item.technologies || []).some(t => t.toLowerCase().includes(query));
      if (!matchSub && !matchTitle && !matchStatus && !matchTeam && !matchTech) return false;
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
  }, [searchQuery, subdomainTechs, selectedDomain, sortField, sortDirection]);

  return (
    <div className="card tech-table-card">
      
      {/* Search & Top Controls */}
      <div className="global-controls-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="global-search-box">
            <Search size={16} color="#94A3B8" />
            <input 
              type="text" 
              placeholder="Search domain, title, or technology..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 8-Column Reference Table */}
      <div className="card global-table-wrapper" style={{ padding: '0', background: '#ffffff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
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
                  <th style={{ width: '5%', textAlign: 'center' }}>
                    S.No
                  </th>
                  <th style={{ width: '18%', cursor: 'pointer' }} onClick={() => handleSort('subdomain')}>
                    <div className="th-content">
                      Domain
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => handleSort('status')}>
                    <div className="th-content">
                      Status
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    <div className="th-content">
                      Title
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '22%', cursor: 'pointer' }} onClick={() => handleSort('technologies')}>
                    <div className="th-content">
                      Technology
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => handleSort('actionTeam')}>
                    <div className="th-content">
                      Action Team
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => handleSort('actionStatus')}>
                    <div className="th-content">
                      Action Status
                      <span className="th-icons">
                        <ArrowUpDown size={12} className="header-icon" />
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => handleSort('createdDate')}>
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
                {sortedData.map((row, index) => {
                  const techs = row.technologies || [];
                  const totalTechs = techs.length;
                  const displayedTechs = techs.slice(0, 3);
                  const remainingCount = totalTechs - 3;

                  return (
                    <tr key={row.id || index} className="tech-table-row">
                      <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {index + 1}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                          {row.subdomain}
                        </span>
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
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {displayedTechs.map((tech, tIdx) => (
                            <span key={tIdx} className="tech-tag-badge">
                              {tech}
                            </span>
                          ))}

                          {remainingCount > 0 && (
                            <button
                              onClick={() => setSelectedSubdomainModal(row)}
                              className="tech-more-btn"
                              title="Click to view all technologies for this domain"
                            >
                              +{remainingCount} more
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="action-team-badge">
                          {row.actionTeam || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <span className="action-status-badge">
                          {row.actionStatus || 'Open'}
                        </span>
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
      </div>

      {/* Modal Popup for Subdomain Technologies */}
      {selectedSubdomainModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setSelectedSubdomainModal(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  Technologies
                </h3>
                <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#2563eb', fontWeight: '600', display: 'block', marginTop: '0.25rem' }}>
                  {selectedSubdomainModal.subdomain}
                </span>
              </div>
              <button 
                onClick={() => setSelectedSubdomainModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                All Detected Technologies ({selectedSubdomainModal.technologies?.length || 0})
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {(selectedSubdomainModal.technologies || []).map((tech, idx) => (
                  <div key={idx} style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#1e293b',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                    {tech}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setSelectedSubdomainModal(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechTable;
