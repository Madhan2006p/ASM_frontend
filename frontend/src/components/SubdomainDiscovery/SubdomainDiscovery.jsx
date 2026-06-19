import React, { useState, useEffect } from 'react';
import './SubdomainDiscovery.css';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Globe2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const SubdomainDiscovery = ({ activeScanId, activeTarget, scansList, handleSelectScan, fetchScans, assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [subdomains, setSubdomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  // Load subdomains when activeScanId changes
  useEffect(() => {
    const loadSubdomains = async () => {
      if (!activeScanId) {
        setSubdomains([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/subdomains/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        setSubdomains(list);
      } catch (e) {
        console.error("Failed to load subdomains", e);
        setSubdomains([]);
      } finally {
        setLoading(false);
      }
    };
    loadSubdomains();
  }, [activeScanId]);



  const filteredData = subdomains.filter(item =>
    item.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(item.ip) ? item.ip.join(', ') : item.ip || '').includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };

  const getScanStatus = (item) => {
    const s = (item.status || 'active').toLowerCase();
    if (s === 'live' || s === 'active' || s === 'up') return { label: 'Active', color: '#22C55E', icon: <CheckCircle2 size={13}/> };
    if (s === 'down' || s === 'inactive') return { label: 'Down', color: '#EF4444', icon: <XCircle size={13}/> };
    return { label: 'Unknown', color: '#94A3B8', icon: <AlertCircle size={13}/> };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        
        {/* Banner Area */}
        <PageHeaderCard 
          badgeText="DISCOVERY"
          title="Attack Surface Discovery"
          subtitle="Monitor and enumerate every external-facing asset across your perimeter."
          stats={[
            { label: 'DISCOVERED ASSETS', value: subdomains.length.toString() },
            { label: 'ACTIVE SCANS', value: scansList.filter(s => s.status === 'running' || s.status === 'pending').length.toString() },
            { label: 'NEW THIS WEEK', value: '+18' },
            { label: 'AVG. SCAN TIME', value: '42s' }
          ]}
        />

        {/* Active Scan Selector */}
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        {/* Table Container */}
        <div className="global-table-wrapper" style={{ marginTop: '1.5rem' }}>
          <div className="global-controls-row" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            <div>
              <div className="t-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Discovered Subdomains</div>
              <div className="t-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {loading ? "Loading from backend..." : `Showing ${currentData.length} of ${filteredData.length} assets`}
              </div>
            </div>
            <div className="global-search-box">
              <Search size={16} color="#94A3B8" />
              <input 
                type="text" 
                placeholder="Filter domains or IPs..." 
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <table className="sub-table">
            <thead>
              <tr>
                <th>DOMAIN / ASSET</th>
                <th>SCAN STATUS</th>
                <th>HOSTED</th>
                <th>UPDATED AT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                    Fetching subdomain intelligence...
                  </td>
                </tr>
              ) : currentData.map(item => {
                const statusCfg = getScanStatus(item);
                const hosted = (Array.isArray(item.ip) && item.ip.length > 0) 
                  ? item.ip[0] 
                  : (item.ip && item.ip !== '—' ? item.ip : '-');
                return (
                  <tr key={item.id}>
                    <td className="td-domain">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.domain}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: statusCfg.color, fontWeight: 600, fontSize: '0.8rem' }}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {hosted}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {formatDate(item.updated_at || item.created_at)}
                    </td>
                  </tr>
                );
              })}

              {!loading && currentData.length === 0 && (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                    No subdomains found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer Area */}
          <div className="table-footer">
            <div className="footer-sync">
              <RefreshCw size={14} color="#94A3B8" /> Realtime sync enabled
            </div>
            <div className="footer-pagination">
              <button 
                className="page-btn" 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                style={{opacity: currentPage === 1 ? 0.3 : 1}}
              >
                <ChevronLeft size={16} />
              </button>
              <span>Page {totalPages === 0 ? 0 : currentPage} of {totalPages}</span>
              <button 
                className="page-btn" 
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{opacity: (currentPage === totalPages || totalPages === 0) ? 0.3 : 1}}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SubdomainDiscovery;
