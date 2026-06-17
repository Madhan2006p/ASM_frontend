import React from 'react';

const ScanSelector = ({
  assignedDomains = [],
  selectedDomain,
  setSelectedDomain,
  scansList = [],
  activeScanId,
  handleSelectScan
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
      
      {/* Domain Selector */}
      {assignedDomains && assignedDomains.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Domain:</span>
          <select
            value={selectedDomain || ''}
            onChange={(e) => setSelectedDomain && setSelectedDomain(e.target.value)}
            style={{ 
              height: '36px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-card)', 
              color: 'var(--text-primary)', 
              padding: '0 1rem', 
              fontWeight: 600, 
              fontSize: '0.775rem', 
              cursor: 'pointer' 
            }}
          >
            <option value="">All Domains</option>
            {assignedDomains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Active Scan Selector */}
      {scansList && scansList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Scan:</span>
          <select
            value={activeScanId || ''}
            onChange={e => handleSelectScan && handleSelectScan(e.target.value)}
            style={{ 
              height: '36px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-card)', 
              color: 'var(--text-primary)', 
              padding: '0 1rem', 
              fontWeight: 600, 
              fontSize: '0.775rem', 
              cursor: 'pointer' 
            }}
          >
            {scansList.map(s => (
              <option key={s.id} value={s.id}>
                {s.target} — Scan #{s.id} ({new Date(s.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default ScanSelector;
