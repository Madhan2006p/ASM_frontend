import React from 'react';
import { Lock } from 'lucide-react';

// Regular users can only VIEW scans — scanning is done by Super Admin only.
const ScanSelector = ({
  assignedDomains = [],
  selectedDomain,
  setSelectedDomain,
  scansList = [],
  activeScanId,
  handleSelectScan
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>

      {/* Domain filter — only shows admin-assigned domains */}
      {assignedDomains && assignedDomains.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Lock size={11} /> Target Domain:
          </div>
          <select
            value={selectedDomain || ''}
            onChange={(e) => setSelectedDomain && setSelectedDomain(e.target.value)}
            style={{
              height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              padding: '0 1rem', fontWeight: 600, fontSize: '0.775rem', cursor: 'pointer'
            }}
          >
            <option value="">All Domains</option>
            {assignedDomains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.8rem', color: '#F59E0B',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '8px', padding: '0.4rem 0.75rem'
        }}>
          <Lock size={13} />
          No domains assigned. Contact your admin to get a domain assigned.
        </div>
      )}
    </div>
  );
};

export default ScanSelector;
