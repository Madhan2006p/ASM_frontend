import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import './Technologies.css';

const TechTable = ({ onDataFiltered, subdomainTechs = [], loading, selectedDomain = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubdomainModal, setSelectedSubdomainModal] = useState(null);

  const filteredData = (subdomainTechs || []).filter(item => {
    // Domain filter
    if (selectedDomain) {
      const isMatch = item.parentDomain === selectedDomain || item.subdomain.endsWith(selectedDomain);
      if (!isMatch) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchSub = item.subdomain.toLowerCase().includes(query);
      const matchTech = (item.technologies || []).some(t => t.toLowerCase().includes(query));
      if (!matchSub && !matchTech) return false;
    }

    return true;
  });

  useEffect(() => {
    if (onDataFiltered) {
      onDataFiltered(filteredData);
    }
  }, [searchQuery, subdomainTechs, selectedDomain]);

  return (
    <div className="card tech-table-card">
      
      {/* Top Controls */}
      <div className="global-controls-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="global-search-box">
            <Search size={16} color="#94A3B8" />
            <input 
              type="text" 
              placeholder="Search subdomain or technology..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Subdomain-Centric Table */}
      <div className="card global-table-wrapper" style={{ padding: '0', background: 'var(--bg-card)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
            Loading technologies inventory from database...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No subdomains found matching the criteria.
          </div>
        ) : (
          <div className="tech-table-responsive-wrapper" style={{ border: 'none', margin: '0', borderRadius: '0' }}>
            <table className="tech-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Subdomain</th>
                  <th style={{ width: '60%' }}>Technologies</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  const techs = row.technologies || [];
                  const total = techs.length;
                  const displayedTechs = techs.slice(0, 3);
                  const remainingCount = total - 3;

                  return (
                    <tr key={row.id}>
                      <td>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {row.subdomain}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {displayedTechs.map((tech, tIdx) => (
                            <span key={tIdx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.08)',
                              color: '#3b82f6',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              fontSize: '0.8rem',
                              fontWeight: '600'
                            }}>
                              {tech}
                            </span>
                          ))}

                          {remainingCount > 0 && (
                            <button
                              onClick={() => setSelectedSubdomainModal(row)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                background: 'var(--bg-main)',
                                color: '#2563eb',
                                border: '1px solid #93c5fd',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="Click to view all technologies"
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                            >
                              +{remainingCount} more
                            </button>
                          )}
                        </div>
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
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'var(--bg-main)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Technologies
                </h3>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600', display: 'block', marginTop: '0.25rem' }}>
                  {selectedSubdomainModal.subdomain}
                </span>
              </div>
              <button 
                onClick={() => setSelectedSubdomainModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
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
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                All Detected Technologies ({selectedSubdomainModal.technologies?.length || 0})
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {(selectedSubdomainModal.technologies || []).map((tech, idx) => (
                  <div key={idx} style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.06)',
                    border: '1px solid rgba(59, 130, 246, 0.18)',
                    color: 'var(--text-primary)',
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
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-main)'
            }}>
              <button
                onClick={() => setSelectedSubdomainModal(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  background: '#3b82f6',
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
