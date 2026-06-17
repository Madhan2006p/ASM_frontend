import React, { useState, useEffect, useRef } from 'react';
import './Directories.css';
import { Search, ArrowRight, Folder, Lock, Database, ShieldAlert, Globe, Filter, ChevronDown, Check, RefreshCw } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const Directories = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPill, setFilterPill] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [riskFilter, setRiskFilter] = useState('All Risks');
  
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showRiskMenu, setShowRiskMenu] = useState(false);
  
  const categoryRef = useRef(null);
  const riskRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryMenu(false);
      }
      if (riskRef.current && !riskRef.current.contains(event.target)) {
        setShowRiskMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch directories
  useEffect(() => {
    const loadDirectories = async () => {
      if (!activeScanId) {
        setDirectories([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/directories/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        setDirectories(list);
      } catch (e) {
        console.error("Failed to load directories", e);
        setDirectories([]);
      } finally {
        setLoading(false);
      }
    };
    loadDirectories();
  }, [activeScanId]);

  const getPathFromUrl = (urlStr) => {
    try {
      if (urlStr.startsWith('/') || !urlStr.includes('://')) {
        return urlStr;
      }
      const urlObj = new URL(urlStr);
      return urlObj.pathname;
    } catch (e) {
      return urlStr;
    }
  };

  const getCategory = (path) => {
    const p = path.toLowerCase();
    if (p.endsWith('.zip') || p.endsWith('.tar.gz') || p.endsWith('.sql') || p.endsWith('.bak') || p.includes('backup')) return 'Backup File';
    if (p.includes('admin') || p.includes('login') || p.includes('wp-admin') || p.includes('panel')) return 'Admin Panel';
    if (p.includes('.git') || p.includes('.env') || p.includes('config') || p.includes('secret') || p.includes('private')) return 'Sensitive';
    if (p.includes('/api/')) return 'Hidden';
    return 'Public';
  };

  const getIcon = (cat) => {
    if (cat === 'Admin Panel') return <Lock size={16} />;
    if (cat === 'Backup File') return <Database size={16} />;
    if (cat === 'Sensitive') return <ShieldAlert size={16} />;
    if (cat === 'Hidden') return <Globe size={16} />;
    return <Folder size={16} />;
  };

  const getRisk = (cat) => {
    if (cat === 'Sensitive' || cat === 'Backup File') return 'CRITICAL';
    if (cat === 'Admin Panel') return 'HIGH';
    if (cat === 'Hidden') return 'MEDIUM';
    return 'LOW';
  };

  const getAccess = (status) => {
    if (status === 401 || status === 403) return 'Hidden';
    if (status === 301 || status === 302) return 'Internal';
    return 'Public';
  };

  const getStatus = (status) => {
    if (status === 200) return 'Exposed';
    if (status === 403) return 'Restricted';
    if (status === 401) return 'Secured';
    return 'Exposed';
  };

  const filteredData = directories.map(item => {
    const path = getPathFromUrl(item.url);
    const category = getCategory(path);
    const risk = getRisk(category);
    const access = getAccess(item.status);
    const status = getStatus(item.status);
    return {
      ...item,
      path,
      category,
      risk,
      access,
      status,
      icon: getIcon(category)
    };
  }).filter(item => {
    // Pill Filter
    if (filterPill === 'Sensitive' && item.category !== 'Sensitive') return false;
    if (filterPill === 'Admin' && item.category !== 'Admin Panel') return false;
    if (filterPill === 'Backup Files' && item.category !== 'Backup File') return false;
    if (filterPill === 'Public' && item.category !== 'Public') return false;
    if (filterPill === 'Hidden' && item.category !== 'Hidden') return false;

    // Search Box
    if (searchQuery && !item.path.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Category Dropdown
    if (categoryFilter !== 'All Categories' && item.category !== categoryFilter) return false;

    // Risk Dropdown
    if (riskFilter !== 'All Risks' && item.risk !== riskFilter.toUpperCase()) return false;

    return true;
  });

  const getStatusClass = (status) => {
    if (status === 'Exposed') return 'st-out';
    if (status === 'Secured' || status === 'Restricted') return 'st-hlt';
    if (status === 'Indexable') return 'st-pat';
    return 'st-upd';
  };

  const getRiskClass = (risk) => {
    if (risk === 'CRITICAL') return 'risk-crit';
    if (risk === 'HIGH') return 'risk-high';
    if (risk === 'MEDIUM') return 'risk-med';
    return 'risk-low';
  };

  const categories = ['All Categories', 'Admin Panel', 'Backup File', 'Sensitive', 'Public', 'Hidden'];
  const risks = ['All Risks', 'Critical', 'High', 'Medium', 'Low'];

  // Stats calculation
  const totalCount = directories.length;
  const sensitiveCount = directories.filter(d => getCategory(getPathFromUrl(d.url)) === 'Sensitive').length;
  const adminPanelsCount = directories.filter(d => getCategory(getPathFromUrl(d.url)) === 'Admin Panel').length;
  const backupFilesCount = directories.filter(d => getCategory(getPathFromUrl(d.url)) === 'Backup File').length;

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        
        <PageHeaderCard 
          badgeText="DISCOVERY"
          title="Directories"
          subtitle="Discover exposed directories, hidden paths, sensitive files, admin panels, and publicly accessible resources across monitored assets."
          actions={
            <button className="dir-btn-primary">
              Export
            </button>
          }
          stats={[
            { label: 'Directories Found', value: totalCount.toString(), subtext: 'Active accessible paths' },
            { label: 'Sensitive Paths', value: sensitiveCount.toString(), subtext: 'Requires review' },
            { label: 'Admin Panels', value: adminPanelsCount.toString(), subtext: 'High exposure risk' },
            { label: 'Backup Files', value: backupFilesCount.toString(), subtext: 'Potential data leaks' }
          ]}
        />

        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        {/* Filter Pills */}
        <div className="global-filter-row">
          {['All', 'Sensitive', 'Admin', 'Backup Files', 'Public', 'Hidden'].map(pill => (
            <div 
              key={pill}
              className={`global-filter-pill ${filterPill === pill ? 'active' : ''}`}
              onClick={() => setFilterPill(pill)}
            >
              {pill}
            </div>
          ))}
        </div>

        {/* Table Controls */}
        <div className="global-controls-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="global-search-box">
              <Search size={16} color="#94A3B8" />
              <input 
                type="text" 
                placeholder="Search directory path, category..." 
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

        {/* Table */}
        <div className="global-table-wrapper">
          <table className="dir-table">
            <thead>
              <tr>
                <th>Directory Path</th>
                <th>Category</th>
                <th>Access</th>
                <th>Subdomain Scope</th>
                <th>Risk Level</th>
                <th>Findings</th>
                <th>Status</th>
                <th>Last Detected</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                    Loading directories from scan database...
                  </td>
                </tr>
              ) : filteredData.map(item => {
                const dateStr = item.created ? new Date(item.created).toLocaleDateString() : 'Recent';
                const findingsCount = item.status === 'Exposed' && (item.category === 'Sensitive' || item.category === 'Backup File') ? 1 : 0;
                return (
                  <tr key={item.id}>
                    <td className="dir-path">{item.path}</td>
                    <td>
                      <div className="dir-category">
                        {item.icon}
                        <span>{item.category}</span>
                      </div>
                    </td>
                    <td><span className="dir-access">{item.access}</span></td>
                    <td>
                      <span className="dir-assets" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item.subdomain_name || 'root domain'}</span>
                    </td>
                    <td>
                      <span className={`dir-risk-pill ${getRiskClass(item.risk)}`}>
                        <div className="dot"></div> {item.risk}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626', fontWeight: 700, fontSize: '0.8125rem' }}>
                        {findingsCount > 0 ? (
                          <>
                            <ShieldAlert size={14} /> {findingsCount}
                          </>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>0</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`dir-status-pill ${getStatusClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="dir-last-seen">{dateStr}</td>
                  </tr>
                );
              })}
              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    No directories found for this scan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Directories;
