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

      {/* Grouped Category Boxes */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', padding: '0.5rem' }}>
            {Object.entries(
              filteredData.reduce((acc, tech) => {
                if (!acc[tech.category]) acc[tech.category] = [];
                acc[tech.category].push(tech);
                return acc;
              }, {})
            ).map(([category, techs]) => (
              <div key={category}>
                <h3 style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)', 
                  marginBottom: '1.5rem', 
                  paddingBottom: '0.75rem', 
                  borderBottom: '2px solid var(--border-color)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem' 
                }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#3b82f6' }}></div>
                  {category}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '20px', marginLeft: 'auto', fontWeight: '600' }}>
                    {techs.length} item{techs.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {techs.map((tech, idx) => {
                    const char = tech.name ? tech.name.charAt(0).toUpperCase() : '?';
                    const hues = [210, 280, 150, 320, 40, 190];
                    const hue = hues[idx % hues.length];
                    
                    return (
                      <div key={tech.id} style={{ 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '16px', 
                        padding: '1.25rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1.2rem',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = `hsl(${hue}, 80%, 50%)`; e.currentTarget.style.boxShadow = `0 8px 24px hsla(${hue}, 80%, 50%, 0.15)`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{ 
                              width: '44px', height: '44px', 
                              borderRadius: '12px', 
                              background: `linear-gradient(135deg, hsla(${hue}, 80%, 60%, 0.15) 0%, hsla(${hue}, 80%, 60%, 0.05) 100%)`,
                              border: `1px solid hsla(${hue}, 80%, 60%, 0.2)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: `hsl(${hue}, 80%, 60%)`, fontWeight: '800', fontSize: '1.3rem'
                            }}>
                              {char}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>{tech.name}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{tech.category}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Version:</span>
                            {tech.version && tech.version !== '—' ? (
                               <span style={{ background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                                 v{tech.version}
                               </span>
                            ) : (
                               <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Unknown</span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: tech.eol !== 'Supported' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', background: tech.eol !== 'Supported' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {tech.eol === 'Supported' ? 'Active' : 'EOL'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
