import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, ArrowRight } from 'lucide-react';
import './Certificates.css';

const CertificatesTable = ({ certs = [], loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [issuerFilter, setIssuerFilter] = useState('Issuer: All');
  const [tlsFilter, setTlsFilter] = useState('TLS Version: All');
  const [healthFilter, setHealthFilter] = useState('Health Status: All');

  const [showIssuerMenu, setShowIssuerMenu] = useState(false);
  const [showTlsMenu, setShowTlsMenu] = useState(false);
  const [showHealthMenu, setShowHealthMenu] = useState(false);

  const issuerRef = useRef(null);
  const tlsRef = useRef(null);
  const healthRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (issuerRef.current && !issuerRef.current.contains(event.target)) setShowIssuerMenu(false);
      if (tlsRef.current && !tlsRef.current.contains(event.target)) setShowTlsMenu(false);
      if (healthRef.current && !healthRef.current.contains(event.target)) setShowHealthMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute filters based on actual certificates
  const issuers = ['Issuer: All', ...new Set(certs.map(c => c.issuer).filter(Boolean))];
  const tlsVersions = ['TLS Version: All', ...new Set(certs.map(c => c.tls).filter(Boolean))];
  const healthStatuses = ['Health Status: All', 'Healthy', 'Expiring Soon', 'Expired'];

  const filteredData = certs.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.domain.toLowerCase().includes(q) && 
          !item.issuer.toLowerCase().includes(q) && 
          !item.tls.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (issuerFilter !== 'Issuer: All' && item.issuer !== issuerFilter) return false;
    if (tlsFilter !== 'TLS Version: All' && item.tls !== tlsFilter) return false;
    if (healthFilter !== 'Health Status: All' && item.health !== healthFilter) return false;
    return true;
  });

  return (
    <div className="global-table-wrapper" style={{ marginTop: '1.5rem' }}>
      
      {/* Top Controls */}
      <div className="global-controls-row" style={{ padding: '1.5rem', borderBottom: '1px solid #E2E8F0', margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="global-search-box">
            <Search size={16} color="#94A3B8" />
            <input 
              type="text" 
              placeholder="Search domain, issuer, or TLS version..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          
          {/* Custom Issuer Dropdown */}
          <div className="global-custom-select" ref={issuerRef}>
            <button 
              className="global-custom-select-btn" 
              onClick={() => setShowIssuerMenu(!showIssuerMenu)}
              style={{ minWidth: '130px', justifyContent: 'space-between' }}
            >
              {issuerFilter} <ChevronDown size={16} color="#94A3B8" />
            </button>
            {showIssuerMenu && (
              <div className="global-custom-dropdown-menu">
                {issuers.map(i => (
                  <div 
                    key={i}
                    className={`global-custom-dropdown-item ${issuerFilter === i ? 'active' : ''}`}
                    onClick={() => { setIssuerFilter(i); setShowIssuerMenu(false); }}
                  >
                    {i} {issuerFilter === i && <Check size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom TLS Version Dropdown */}
          <div className="global-custom-select" ref={tlsRef}>
            <button 
              className="global-custom-select-btn" 
              onClick={() => setShowTlsMenu(!showTlsMenu)}
              style={{ minWidth: '150px', justifyContent: 'space-between' }}
            >
              {tlsFilter} <ChevronDown size={16} color="#94A3B8" />
            </button>
            {showTlsMenu && (
              <div className="global-custom-dropdown-menu">
                {tlsVersions.map(t => (
                  <div 
                    key={t}
                    className={`global-custom-dropdown-item ${tlsFilter === t ? 'active' : ''}`}
                    onClick={() => { setTlsFilter(t); setShowTlsMenu(false); }}
                  >
                    {t} {tlsFilter === t && <Check size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Health Dropdown */}
          <div className="global-custom-select" ref={healthRef}>
            <button 
              className="global-custom-select-btn" 
              onClick={() => setShowHealthMenu(!showHealthMenu)}
              style={{ minWidth: '160px', justifyContent: 'space-between' }}
            >
              {healthFilter} <ChevronDown size={16} color="#94A3B8" />
            </button>
            {showHealthMenu && (
              <div className="global-custom-dropdown-menu">
                {healthStatuses.map(status => (
                  <div 
                    key={status}
                    className={`global-custom-dropdown-item ${healthFilter === status ? 'active' : ''}`}
                    onClick={() => { setHealthFilter(status); setShowHealthMenu(false); }}
                  >
                    {status} {healthFilter === status && <Check size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="cert-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Issuer</th>
              <th>Cert Type</th>
              <th>TLS Version</th>
              <th>Cipher Suite</th>
              <th>Expiration Date</th>
              <th>Days Left</th>
              <th>Health Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id}>
                <td className="font-bold font-mono">{row.domain}</td>
                <td className="text-slate-600">{row.issuer}</td>
                <td>
                  <span className={`pill-${row.type === 'Self Signed' ? 'self' : 'dv'}`}>
                    {row.type}
                  </span>
                </td>
                <td className="text-slate-600">{row.tls}</td>
                <td className="text-slate-500 font-mono" style={{ fontSize: '0.8rem' }}>{row.cipher}</td>
                <td className="font-mono text-slate-600">{row.expires}</td>
                <td className={`font-bold ${row.days === null ? 'text-slate-400' : row.days === 0 ? 'text-red' : row.days < 30 ? 'text-orange' : ''}`}>
                  {row.days !== null ? row.days : '—'}
                </td>
                <td>
                  <span className={`cert-pill pill-${row.health.replace(' ', '').toLowerCase()}`}>
                    {row.health}
                  </span>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  {loading ? 'Loading certificates...' : 'No certificates match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CertificatesTable;
