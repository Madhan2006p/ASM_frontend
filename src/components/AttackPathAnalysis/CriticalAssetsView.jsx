import React from 'react';
import { Target, ShieldAlert, CheckCircle2, Server, Globe } from 'lucide-react';

const CriticalAssetsView = ({ criticalAssets }) => {
  const riskColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="apa-critical-assets-container">
      <div className="vapt-section-title">
        <Target size={18} className="vapt-section-icon" />
        <h2>Business-Critical Assets & Crown Jewels</h2>
      </div>

      <p className="narrative">
        Assets identified as core business targets, databases, or API gateways connected to internet-exposed attack paths.
      </p>

      {criticalAssets.length === 0 ? (
        <div className="apa-empty-state">
          <CheckCircle2 size={44} style={{ color: '#22c55e', opacity: 0.5 }} />
          <h3>No Critical Asset Exposures Discovered</h3>
          <p>Scanned assets do not currently reveal direct attack paths leading to critical crown jewels.</p>
        </div>
      ) : (
        <div className="card apa-table-card">
          <table className="vapt-print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Asset Name</th>
                <th>Crown Jewel Designation</th>
                <th>Risk Score</th>
                <th>Correlated Attack Paths</th>
                <th>Exposed Services / Ports</th>
                <th>Critical Vulnerabilities</th>
                <th>Owner</th>
                <th>Last Scan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {criticalAssets.map((asset, idx) => (
                <tr key={idx}>
                  <td className="vapt-pt-num">{idx + 1}</td>
                  <td className="vapt-pt-title"><code>{asset.asset}</code></td>
                  <td>
                    <span className="meta-tag" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                      💎 {asset.targetName || 'Critical Crown Jewel'}
                    </span>
                  </td>
                  <td>
                    <span className="vapt-pt-badge" style={{ color: riskColor(asset.risk), borderColor: `${riskColor(asset.risk)}50`, background: `${riskColor(asset.risk)}15` }}>
                      {asset.risk}/100
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#ef4444' }}>
                    {asset.attackPaths} paths
                  </td>
                  <td>
                    {asset.exposedServices && asset.exposedServices.length > 0 ? (
                      asset.exposedServices.map((port, pi) => (
                        <span key={pi} className="adr-port-tag">{port}</span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: asset.criticalVulns > 0 ? '#ef4444' : '#22c55e' }}>
                    {asset.criticalVulns}
                  </td>
                  <td>{asset.owner || 'Security Ops'}</td>
                  <td>{asset.lastScan || 'Recent'}</td>
                  <td>
                    <span className="adr-status-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CriticalAssetsView;
