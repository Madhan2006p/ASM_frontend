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
    <div className="tech-table-card">
      
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

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          
          {/* Custom Category Dropdown */}
          <div className="global-custom-select" ref={categoryRef}>
            <button 
              className="global-custom-select-btn" 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            >
              {categoryFilter} <ChevronDown size={16} color="#94A3B8" />
            </button>
            {showCategoryMenu && (
              <div className="global-custom-dropdown-menu">
                {categories.map(cat => (
                  <div 
                    key={cat}
                    className={`global-custom-dropdown-item ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => { setCategoryFilter(cat); setShowCategoryMenu(false); }}
                  >
                    {cat} {categoryFilter === cat && <Check size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom EOL Dropdown */}
          <div className="global-custom-select" ref={eolRef}>
            <button 
              className="global-custom-select-btn" 
              onClick={() => setShowEolMenu(!showEolMenu)}
              style={{ minWidth: '150px', justifyContent: 'space-between' }}
            >
              {eolFilter} <ChevronDown size={16} color="#94A3B8" />
            </button>
            {showEolMenu && (
              <div className="global-custom-dropdown-menu">
                {eolStatuses.map(status => (
                  <div 
                    key={status}
                    className={`global-custom-dropdown-item ${eolFilter === status ? 'active' : ''}`}
                    onClick={() => { setEolFilter(status); setShowEolMenu(false); }}
                  >
                    {status} {eolFilter === status && <Check size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Risk Dropdown */}
          <div className="global-custom-select" ref={riskRef}>
            <button 
              className="global-custom-select-btn" 
              onClick={() => setShowRiskMenu(!showRiskMenu)}
              style={{ minWidth: '130px', justifyContent: 'space-between' }}
            >
              {riskFilter} <ChevronDown size={16} color="#94A3B8" />
            </button>
            {showRiskMenu && (
              <div className="global-custom-dropdown-menu">
                {risks.map(r => (
                  <div 
                    key={r}
                    className={`global-custom-dropdown-item ${riskFilter === r ? 'active' : ''}`}
                    onClick={() => { setRiskFilter(r); setShowRiskMenu(false); }}
                  >
                    {r} {riskFilter === r && <Check size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Grouped Category Boxes */}
      <div className="global-table-wrapper" style={{ padding: '1.5rem', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
            Loading stack inventory from database...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
            No technologies found for this scan.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(
              filteredData.reduce((acc, tech) => {
                if (!acc[tech.category]) acc[tech.category] = [];
                acc[tech.category].push(tech);
                return acc;
              }, {})
            ).map(([category, techs]) => (
              <div key={category} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                  {category}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {techs.map(tech => (
                    <li key={tech.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.95rem' }}>{tech.name}</span>
                        {tech.version && (
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '400' }}>
                            {tech.version}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechTable;
