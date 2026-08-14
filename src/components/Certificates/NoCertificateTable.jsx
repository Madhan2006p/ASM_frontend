import React, { useState, useMemo } from 'react';
import {
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
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtering
  const filteredData = useMemo(() => {
    return noCerts.filter((item) => {
      return true;
    });
  }, [noCerts]);

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
                    <span className={`ssl-status-badge ${row.status?.toLowerCase().replace(/\s+/g, '-') || 'unencrypted'}`}>
                      {row.status || 'Unencrypted'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {row.ip && row.ip !== '—' ? row.ip : <span style={{ color: '#EF4444', fontSize: '0.78rem', fontWeight: 600 }}>DNS Not Found</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.locationFlag || '🇮🇳'} {row.location || 'India'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{row.created || '21-12-2024'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{row.updated || '20-3-2025'}</td>
                </tr>
              ))}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7}>
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

      {/* 4. Pagination Controls Footer */}
      <div className="ssl-pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, totalRows)} of {totalRows} targets
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

export default NoCertificateTable;
