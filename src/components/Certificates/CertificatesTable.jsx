import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck
} from 'lucide-react';
import './CertDashboard.css';

const CertificatesTable = ({
  certs = [],
  loading = false,
  onSelectCert
}) => {
  // State variables
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('All');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');
  const [tableViewMode, setTableViewMode] = useState('domain'); // 'domain' | 'details'
  
  // Sorting state
  const [sortField, setSortField] = useState('sNo');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter Popover state
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Dynamic unique domain options for dropdown
  const domainOptions = useMemo(() => {
    const set = new Set(certs.map((c) => c.domain).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [certs]);

  // Dynamic unique grade options for dropdown
  const gradeOptions = useMemo(() => {
    const set = new Set(certs.map((c) => c.sslGrade).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [certs]);

  // Filter logic
  const filteredCerts = useMemo(() => {
    return certs.filter((item) => {
      // 1. Domain Dropdown Filter
      if (selectedDomainFilter !== 'All' && item.domain !== selectedDomainFilter) {
        return false;
      }

      // 2. Grade Dropdown Filter
      if (selectedGradeFilter !== 'All' && item.sslGrade !== selectedGradeFilter) {
        return false;
      }

      return true;
    });
  }, [certs, selectedDomainFilter, selectedGradeFilter]);

  // Sorting logic
  const sortedCerts = useMemo(() => {
    return [...filteredCerts].sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCerts, sortField, sortDirection]);

  // Pagination slice
  const totalRows = sortedCerts.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedCerts = sortedCerts.slice(startIndex, startIndex + pageSize);

  // Sorting toggle handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters handler
  const handleClearAll = () => {
    setSelectedDomainFilter('All');
    setSelectedGradeFilter('All');
    setCurrentPage(1);
    setShowFilterPopover(false);
  };

  // Location flag helper
  const getFlag = (locStr) => {
    if (!locStr) return '🌐';
    if (locStr.includes('India')) return '🇮🇳';
    if (locStr.includes('United States') || locStr.includes('US')) return '🇺🇸';
    if (locStr.includes('Germany')) return '🇩🇪';
    if (locStr.includes('Singapore')) return '🇸🇬';
    return '🌐';
  };

  const cleanIssuerName = (raw) => {
    if (!raw || typeof raw !== 'string') return "GlobalSign RSA OV SSL CA";
    const unescaped = raw.replace(/\\,/g, ',').trim();
    const orgMatch = unescaped.match(/(?:organizationName|O)\s*=\s*([^;,]+)/i);
    if (orgMatch && orgMatch[1]) {
      const val = orgMatch[1].trim();
      if (val && !val.toLowerCase().includes('http') && val.toLowerCase() !== 'inc.' && val.length > 1) {
        return val;
      }
    }
    const cnMatch = unescaped.match(/(?:commonName|CN)\s*=\s*([^;,]+)/i);
    if (cnMatch && cnMatch[1]) {
      const val = cnMatch[1].trim();
      if (val && !val.toLowerCase().includes('http') && val.length > 1) {
        return val;
      }
    }
    return unescaped.split(/;|,/)[0].replace(/^[\w\s.]+=/, '').trim() || unescaped;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      


      {/* 3. Main Data Table */}
      <div className="ssl-table-card">
        <div className="ssl-table-wrapper">
          <table className="ssl-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th>Domain</th>
                <th>IP</th>
                <th>Status</th>
                <th>RDNS</th>
                <th>SSL Grade</th>
                <th>Iss Name</th>
              </tr>
            </thead>

            <tbody>
              {paginatedCerts.map((row, index) => {
                const globalIndex = startIndex + index + 1;
                const gradeKey = (row.sslGrade || 'A').charAt(0).toLowerCase();

                return (
                  <tr key={row.id || index} className="ssl-row-clickable">
                    <td style={{ fontWeight: '600' }} onClick={() => onSelectCert && onSelectCert(row)}>
                      {row.sNo || globalIndex}
                    </td>
                    <td
                      style={{ fontWeight: '700', color: 'var(--text-primary)' }}
                      onClick={() => onSelectCert && onSelectCert(row)}
                    >
                      {row.domain}
                    </td>
                    <td
                      style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}
                      onClick={() => onSelectCert && onSelectCert(row)}
                    >
                      {row.ip && row.ip !== '—' ? row.ip : <span style={{ color: '#EF4444', fontSize: '0.78rem', fontWeight: 600 }}>DNS Not Found</span>}
                    </td>
                    <td>
                      <span className={`ssl-status-badge ${(row.status || (row.daysLeft <= 0 ? 'Expired' : 'Valid')).toLowerCase().replace(/\s+/g, '-')}`}>
                        {row.status || (row.daysLeft <= 0 ? 'Expired' : 'Valid')}
                      </span>
                    </td>
                    <td
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => onSelectCert && onSelectCert(row)}
                    >
                      {row.rdns || '--'}
                    </td>
                    <td onClick={() => onSelectCert && onSelectCert(row)}>
                      <span className={`ssl-grade-badge grade-${gradeKey}`}>
                        {row.sslGrade || 'A'}
                      </span>
                    </td>
                    <td
                      style={{ fontWeight: '500', color: 'var(--text-secondary)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={() => onSelectCert && onSelectCert(row)}
                      title={row.issuer}
                    >
                      {cleanIssuerName(row.issuer)}
                    </td>
                  </tr>
                );
              })}

              {paginatedCerts.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="ssl-empty-container">
                      <ShieldCheck size={44} color="#94A3B8" />
                      <div className="ssl-empty-title">
                        {loading ? 'Loading SSL Certificates...' : 'No Data Available'}
                      </div>
                      <div className="ssl-empty-desc">
                        {loading
                          ? 'Please wait while we fetch certificate data for your selected domain.'
                          : 'No certificates match the selected filters or active scan parameters.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pagination Controls Footer */}
      <div className="ssl-pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, totalRows)} of {totalRows} certificates
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ background: 'var(--bg-card-2)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={totalRows > 0 ? totalRows : 1000}>All ({totalRows})</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{ opacity: validPage <= 1 ? 0.4 : 1, cursor: validPage <= 1 ? 'not-allowed' : 'pointer', background: 'var(--bg-card-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center' }}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.5rem' }}>
              Page {validPage} of {totalPages}
            </span>
            <button
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{ opacity: validPage >= totalPages ? 0.4 : 1, cursor: validPage >= totalPages ? 'not-allowed' : 'pointer', background: 'var(--bg-card-2)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center' }}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CertificatesTable;
