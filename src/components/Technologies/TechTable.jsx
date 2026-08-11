import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Check, ArrowRight, RefreshCw } from 'lucide-react';
import './Technologies.css';

const TechTable = ({ onDataFiltered, technologies = [], loading, selectedDomain = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [eolFilter, setEolFilter] = useState('EOL Status: All');
  const [riskFilter, setRiskFilter] = useState('All Risks');
  const [expandedRows, setExpandedRows] = useState({});

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredData = (technologies || []).filter(item => {
    // Filter subdomains matching selectedDomain if active
    const targetDomain = (selectedDomain || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const subs = (item.subdomains || []).filter(sub => {
      if (!targetDomain) return true;
      const sName = (sub.subdomain || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const pName = (sub.parentDomain || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return sName === targetDomain || sName.endsWith('.' + targetDomain) || sName.includes(targetDomain) || pName === targetDomain;
    });

    if (selectedDomain && subs.length === 0) return false;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(query);
      const matchSub = subs.some(s => s.subdomain.toLowerCase().includes(query) || s.version.toLowerCase().includes(query));
      if (!matchName && !matchSub) return false;
    }

    // Category
    if (categoryFilter !== 'All Categories' && item.category !== categoryFilter) return false;

    // Risk
    if (riskFilter !== 'All Risks' && item.risk !== riskFilter.toUpperCase()) return false;

    // EOL Status
    if (eolFilter !== 'EOL Status: All') {
      const isReached = item.eol !== 'Supported';
      if (eolFilter === 'EOL Reached' && !isReached) return false;
      if (eolFilter === 'Supported' && isReached) return false;
    }

    return true;
  });

  useEffect(() => {
    if (onDataFiltered) {
      onDataFiltered(filteredData);
    }
  }, [searchQuery, categoryFilter, eolFilter, riskFilter, technologies, selectedDomain]);

  return (
    <div className="card tech-table-card">
      
      {/* Top Controls */}
      <div className="global-controls-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="global-search-box">
            <Search size={16} color="#94A3B8" />
            <input 
              type="text" 
              placeholder="Search technology, version, subdomain..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grouped Category Tables */}
      <div className="card global-table-wrapper" style={{ padding: '1.5rem', background: 'var(--bg-main)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
            Loading stack inventory from database...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No technologies found for this scan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '0.5rem' }}>
            {Object.entries(
              filteredData.reduce((acc, tech) => {
                if (!acc[tech.category]) acc[tech.category] = [];
                acc[tech.category].push(tech);
                return acc;
              }, {})
            ).map(([category, techs]) => (
              <div key={category}>
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)', 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.65rem' 
                }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6' }}></div>
                  {category}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.15rem 0.6rem', borderRadius: '12px', marginLeft: 'auto', fontWeight: '600' }}>
                    {techs.length} technology{techs.length !== 1 ? 'ies' : ''}
                  </span>
                </h3>

                <div className="tech-table-responsive-wrapper">
                  <table className="tech-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Technology</th>
                        <th style={{ width: '18%' }}>Category</th>
                        <th style={{ width: '18%' }}>Version</th>
                        <th style={{ width: '16%' }}>Status</th>
                        <th style={{ width: '20%' }}>Subdomains</th>
                      </tr>
                    </thead>
                    <tbody>
                      {techs.map((tech) => {
                        const filteredSubdomains = (tech.subdomains || []).filter(sub => {
                          if (!selectedDomain) return true;
                          return sub.parentDomain === selectedDomain || sub.subdomain.endsWith(selectedDomain);
                        });

                        const isExpanded = !!expandedRows[tech.id];
                        const count = filteredSubdomains.length;

                        // Calculate overall version display
                        const versions = Array.from(new Set(filteredSubdomains.map(s => s.version).filter(v => v && v !== 'Unknown')));
                        let versionDisplay = 'Unknown';
                        if (versions.length === 1) {
                          versionDisplay = `v${versions[0]}`;
                        } else if (versions.length > 1) {
                          versionDisplay = 'Multiple Versions';
                        }

                        // Calculate overall status display
                        const hasEol = filteredSubdomains.some(s => s.status === 'EOL');

                        return (
                          <React.Fragment key={tech.id}>
                            <tr style={{ background: isExpanded ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  {count > 1 ? (
                                    <button
                                      onClick={() => toggleExpand(tech.id)}
                                      style={{
                                        background: 'rgba(59, 130, 246, 0.08)',
                                        border: '1px solid rgba(59, 130, 246, 0.25)',
                                        borderRadius: '4px',
                                        color: '#3b82f6',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: '0',
                                        flexShrink: 0
                                      }}
                                      title={isExpanded ? 'Collapse subdomains' : 'Expand subdomains'}
                                    >
                                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                    </button>
                                  ) : (
                                    <div style={{ width: '24px', flexShrink: 0 }}></div>
                                  )}

                                  <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#3b82f6', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0
                                  }}>
                                    {tech.name ? tech.name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                    {tech.name}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="tech-pill pill-category">{category}</span>
                              </td>
                              <td>
                                {versionDisplay !== 'Unknown' ? (
                                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', background: 'var(--bg-main)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                    {versionDisplay}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    Unknown
                                  </span>
                                )}
                              </td>
                              <td>
                                {!hasEol ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.75rem', fontWeight: '700' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                                    Active
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.75rem', fontWeight: '700' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                                    EOL
                                  </span>
                                )}
                              </td>
                              <td>
                                <span 
                                  onClick={() => count > 1 && toggleExpand(tech.id)}
                                  style={{
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    color: count > 1 ? '#3b82f6' : 'var(--text-secondary)',
                                    background: count > 1 ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    cursor: count > 1 ? 'pointer' : 'default'
                                  }}
                                >
                                  {count} {count === 1 ? 'subdomain' : 'subdomains'}
                                </span>
                              </td>
                            </tr>

                            {/* Expanded Subdomain Breakdown */}
                            {isExpanded && count > 1 && (
                              <tr className="tech-expanded-row">
                                <td colSpan="5" style={{ padding: '0', background: 'var(--bg-main)' }}>
                                  <div style={{
                                    padding: '0.85rem 1.25rem 1.1rem 3rem',
                                    background: 'rgba(59, 130, 246, 0.025)',
                                    borderTop: '1px solid var(--border-color)',
                                    borderBottom: '1px solid var(--border-color)'
                                  }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span>Subdomain Breakdown ({count})</span>
                                    </div>
                                    <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                          <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                                            {!selectedDomain && (
                                              <th style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '0.5rem 0.85rem', fontWeight: '700' }}>Domain</th>
                                            )}
                                            <th style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '0.5rem 0.85rem', fontWeight: '700' }}>Subdomain</th>
                                            <th style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '0.5rem 0.85rem', fontWeight: '700' }}>Version</th>
                                            <th style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '0.5rem 0.85rem', fontWeight: '700' }}>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {filteredSubdomains.map((sub, sIdx) => (
                                            <tr key={sIdx} style={{ borderBottom: sIdx === filteredSubdomains.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                              {!selectedDomain && (
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem 0.85rem', fontFamily: 'monospace' }}>
                                                  {sub.parentDomain || '—'}
                                                </td>
                                              )}
                                              <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600', padding: '0.5rem 0.85rem', fontFamily: 'monospace' }}>
                                                {sub.subdomain}
                                              </td>
                                              <td style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}>
                                                {sub.version && sub.version !== 'Unknown' ? (
                                                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', background: 'var(--bg-main)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                    v{sub.version}
                                                  </span>
                                                ) : (
                                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                    Unknown
                                                  </span>
                                                )}
                                              </td>
                                              <td style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}>
                                                {sub.status === 'Active' ? (
                                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.72rem', fontWeight: '700' }}>
                                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}></span>
                                                    Active
                                                  </span>
                                                ) : (
                                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.72rem', fontWeight: '700' }}>
                                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }}></span>
                                                    EOL
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechTable;
