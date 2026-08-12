import React, { useState, useMemo } from 'react';
import {
  Search,
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
  const [searchQuery, setSearchQuery] = useState('');
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
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesDomain = item.domain?.toLowerCase().includes(q);
        const matchesIp = item.ip?.toLowerCase().includes(q);
        const matchesIssuer = item.issuer?.toLowerCase().includes(q);
        const matchesLocation = item.location?.toLowerCase().includes(q);
        if (!matchesDomain && !matchesIp && !matchesIssuer && !matchesLocation) {
          return false;
        }
      }

      // 2. Domain Dropdown Filter
      if (selectedDomainFilter !== 'All' && item.domain !== selectedDomainFilter) {
        return false;
      }

      // 3. Grade Dropdown Filter
      if (selectedGradeFilter !== 'All' && item.sslGrade !== selectedGradeFilter) {
        return false;
      }

      return true;
    });
  }, [certs, searchQuery, selectedDomainFilter, selectedGradeFilter]);

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
    setSearchQuery('');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      


      {/* 3. Main Data Table */}
      <div className="ssl-table-card">
        <div className="ssl-table-wrapper">
          <table className="ssl-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>
                  <div className="ssl-th-content" onClick={() => handleSort('sNo')}>
                    S.No <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('domain')}>
                    Domain <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('ip')}>
                    IP <Filter size={12} />
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content">
                    Action
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content">
                    Team Action
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('status')}>
                    Status <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('rdns')}>
                    RDNS <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('sslGrade')}>
                    SSL Grade <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
                <th>
                  <div className="ssl-th-content" onClick={() => handleSort('issuer')}>
                    Iss Name <Filter size={12} /> <span>⇅</span>
                  </div>
                </th>
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
                      {row.ip || '—'}
                    </td>
                    <td>
                      <select
                        className="ssl-action-select"
                        value={row.action || 'Inspect'}
                        onChange={(e) => {
                          e.stopPropagation();
                          row.action = e.target.value;
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="Inspect">Inspect</option>
                        <option value="Re-scan">Re-scan</option>
                        <option value="Renew">Renew</option>
                        <option value="Export">Export</option>
                      </select>
                    </td>
                    <td>
                      <span className="ssl-team-badge">
                        {row.teamAction || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className={`ssl-status-badge ${row.status?.toLowerCase().replace(/\s+/g, '-') || 'valid'}`}>
                        {row.status || 'Valid'}
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
                      {row.issuer || 'GlobalSign RSA OV SSL CA'}
                    </td>
                  </tr>
                );
              })}

              {paginatedCerts.length === 0 && (
                <tr>
                  <td colSpan={9}>
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

    </div>
  );
};

export default CertificatesTable;
