import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, ArrowRight, RefreshCw } from 'lucide-react';
import './Technologies.css';

const TechTable = ({ onDataFiltered, technologies = [], loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [eolFilter, setEolFilter] = useState('EOL Status: All');
  const [riskFilter, setRiskFilter] = useState('All Risks');

  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showEolMenu, setShowEolMenu] = useState(false);
  const [showRiskMenu, setShowRiskMenu] = useState(false);

  const categoryRef = useRef(null);
  const eolRef = useRef(null);
  const riskRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryMenu(false);
      }
      if (eolRef.current && !eolRef.current.contains(event.target)) {
        setShowEolMenu(false);
      }
      if (riskRef.current && !riskRef.current.contains(event.target)) {
        setShowRiskMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = ['All Categories', 'Analytics', 'Programming languages', 'JavaScript libraries', 'Security', 'CDN', 'Font scripts', 'PaaS', 'Web servers', 'Miscellaneous'];
  const eolStatuses = ['EOL Status: All', 'EOL Reached', 'Supported'];
  const risks = ['All Risks', 'Critical', 'High', 'Medium', 'Low'];

  const filteredData = (technologies || []).filter(item => {
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(query) && !item.version.toLowerCase().includes(query)) {
        return false;
      }
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
  }, [searchQuery, categoryFilter, eolFilter, riskFilter, technologies]);

  return (
    <div className="card tech-table-card">
      
      {/* Top Controls */}
      <div className="global-controls-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="global-search-box">
            <Search size={16} color="#94A3B8" />
            <input 
              type="text" 
              placeholder="Search technology, version..." 
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
                    {techs.length} item{techs.length !== 1 ? 's' : ''}
                  </span>
                </h3>

                <div className="tech-table-responsive-wrapper">
                  <table className="tech-table">
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>Technology</th>
                        <th style={{ width: '20%' }}>Category</th>
                        <th style={{ width: '18%' }}>Version</th>
                        <th style={{ width: '17%' }}>Status</th>
                        <th style={{ width: '20%' }}>Domain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {techs.flatMap((tech) => {
                        const domainHosts = (Array.isArray(tech.hosts) && tech.hosts.length > 0)
                          ? tech.hosts
                          : ['—'];
                        
                        return domainHosts.map((host, hostIdx) => (
                          <tr key={`${tech.id}-${hostIdx}`}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                              {tech.version && tech.version !== '—' ? (
                                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', background: 'var(--bg-main)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                  v{tech.version}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                  Unknown
                                </span>
                              )}
                            </td>
                            <td>
                              {tech.eol === 'Supported' ? (
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
                              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                {host}
                              </span>
                            </td>
                          </tr>
                        ));
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
