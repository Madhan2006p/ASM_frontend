import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldOff
} from 'lucide-react';
import './CertDashboard.css';

const NoCertificateTable = ({
  noCerts = [],
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering
  const filteredData = useMemo(() => {
    return noCerts.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.domain?.toLowerCase().includes(q) && !item.ip?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [noCerts, searchQuery]);

  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      


      {/* 3. Table */}
      <div className="ssl-table-card">
        <div className="ssl-table-wrapper">
          <table className="ssl-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th>Domain</th>
                <th>Action</th>
                <th>Team Action</th>
                <th>Status</th>
                <th>IP</th>
                <th>Location</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={row.id || idx}>
                  <td style={{ fontWeight: '600' }}>{startIndex + idx + 1}</td>
                  <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{row.domain}</td>
                  <td>
                    <select
                      className="ssl-action-select"
                      value={row.action || 'Issue Cert'}
                      onChange={(e) => {
                        row.action = e.target.value;
                      }}
                    >
                      <option value="Issue Cert">Issue Cert</option>
                      <option value="Request Cert">Request Cert</option>
                      <option value="Ignore">Ignore</option>
                    </select>
                  </td>
                  <td>
                    <span className="ssl-team-badge">
                      {row.teamAction || 'Unassigned'}
                    </span>
                  </td>
                  <td>
                    <span className={`ssl-status-badge ${row.status?.toLowerCase().replace(/\s+/g, '-') || 'unencrypted'}`}>
                      {row.status || 'Unencrypted'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{row.ip || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.locationFlag || '🇮🇳'} {row.location || 'India'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{row.created || '21-12-2024'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{row.updated || '20-3-2025'}</td>
                </tr>
              ))}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="ssl-empty-container">
                      <ShieldOff size={44} color="#94A3B8" />
                      <div className="ssl-empty-title">
                        {loading ? 'Loading...' : 'No Data Available'}
                      </div>
                      <div className="ssl-empty-desc">
                        No targets without SSL certificates were found for the selected scope.
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

export default NoCertificateTable;
