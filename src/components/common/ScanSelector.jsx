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

      {selectedDomain && (
        <div style={{ marginLeft: 'auto' }}>
          <button 
            onClick={async () => {
              try {
                // We'll dispatch a custom event to show a notification, or just use a standard alert for now
                alert(`Initializing comprehensive scan for ${selectedDomain}... This will run in the background.`);
                const { api } = await import('../../utils/api');
                await api.post('/api/attacksurface/scan/', { target: selectedDomain });
                alert(`Scan successfully triggered for ${selectedDomain}! Refresh the page in a few minutes to see results.`);
              } catch (e) {
                alert(`Failed to start scan: ${e.message}`);
              }
            }}
            style={{
              height: '36px',
              padding: '0 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#3B82F6',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}>
            Launch Target Scan
          </button>
        </div>
      )}
    </div>
  );
};

export default ScanSelector;
