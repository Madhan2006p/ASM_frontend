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

  const categories = ['All Categories', 'Frontend', 'Backend', 'Database', 'Web Server', 'CDN', 'Utility'];
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

      {/* Main Table */}
      <div className="global-table-wrapper">
        <table className="tech-table">
          <thead>
            <tr>
              <th>Technology Name</th>
              <th>Version</th>
              <th>Category</th>
              <th>End of Life (EOL)</th>
              <th>Risk Level</th>
              <th>Used By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  Loading stack inventory from database...
                </td>
              </tr>
            ) : filteredData.map((row) => (
              <tr key={row.id}>
                <td className="font-bold">{row.name}</td>
                <td className="font-bold font-mono text-slate-600">{row.version}</td>
                <td>
                  <span className="pill-category">
                    {row.category}
                  </span>
                </td>
                <td className="font-mono text-slate-600">{row.eol}</td>
                <td>
                  <span className={`tech-pill uppercase pill-${row.risk.toLowerCase()}`}>
                    <span className="dot"></span>
                    {row.risk}
                  </span>
                </td>
                <td className="font-bold text-slate-600">{row.assets} Assets</td>
              </tr>
            ))}
            {!loading && filteredData.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  No technologies found for this scan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TechTable;
