import React, { useState } from 'react';
import {
  GitMerge, Eye, Download, ChevronRight, X, ArrowRight, ShieldAlert,
  AlertTriangle, CheckCircle2, Layers, Cpu, Globe, Server
} from 'lucide-react';

const AttackPathsTable = ({ attackPaths, onHighlightPath, onExportPath }) => {
  const [selectedPath, setSelectedPath] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const riskColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    return '#22c55e';
  };

  const filteredPaths = attackPaths.filter((p) => {
    if (filterSeverity === 'CRITICAL' && p.riskScore < 80) return false;
    if (filterSeverity === 'HIGH' && (p.riskScore < 60 || p.riskScore >= 80)) return false;
    if (filterSeverity === 'MEDIUM' && (p.riskScore < 40 || p.riskScore >= 60)) return false;
    return true;
  });

  return (
    <div className="apa-paths-container">
      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="vapt-filters no-print" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <span className="vapt-filter-count">{filteredPaths.length} attack paths</span>
      </div>

      {/* ── Attack Paths Table ───────────────────────────── */}
      {filteredPaths.length === 0 ? (
        <div className="apa-empty-state">
          <CheckCircle2 size={44} style={{ color: '#22c55e', opacity: 0.5 }} />
          <h3>No Attack Paths Found</h3>
          <p>No attack paths match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="card apa-table-card">
          <table className="vapt-print-table">
            <thead>
              <tr>
                <th>Path ID</th>
                <th>Entry Point</th>
                <th>Target Asset</th>
                <th>Length</th>
                <th>Risk Score</th>
                <th>Probability</th>
                <th>Impact</th>
                <th>MITRE Techniques</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaths.map((path) => (
                <tr key={path.id}>
                  <td className="vapt-pt-num" style={{ fontWeight: 800 }}>{path.id}</td>
                  <td className="vapt-pt-title" style={{ maxWidth: '160px' }}>{path.entryPoint}</td>
                  <td className="vapt-pt-asset">{path.targetAsset}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{path.attackLength} steps</td>
                  <td>
                    <span className="vapt-pt-badge" style={{ color: riskColor(path.riskScore), borderColor: `${riskColor(path.riskScore)}50`, background: `${riskColor(path.riskScore)}15` }}>
                      {path.riskScore}/100
                    </span>
                  </td>
                  <td><span style={{ fontWeight: 600 }}>{path.probability}</span></td>
                  <td><span style={{ fontWeight: 600, color: path.businessImpact === 'Critical' ? '#ef4444' : '#f97316' }}>{path.businessImpact}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {path.mitreTechniques.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="meta-tag">{t}</span>
                      ))}
                      {path.mitreTechniques.length > 3 && <span className="meta-tag">+{path.mitreTechniques.length - 3}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="adr-status-badge">{path.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="vapt-btn vapt-btn-ghost icon-only" onClick={() => setSelectedPath(path)} title="View Attack Chain Timeline">
                        <Eye size={14} />
                      </button>
                      <button className="vapt-btn vapt-btn-ghost icon-only" onClick={() => onHighlightPath(path)} title="Highlight on Graph">
                        <GitMerge size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Attack Path Detail Modal / Drawer ─────────────── */}
      {selectedPath && (
        <div className="apa-modal-overlay" onClick={() => setSelectedPath(null)}>
          <div className="apa-modal-content page-animate" onClick={(e) => e.stopPropagation()}>
            <div className="apa-modal-header">
              <div className="apa-modal-title">
                <GitMerge size={20} style={{ color: '#ef4444' }} />
                <div>
                  <h2>Attack Path Details ({selectedPath.id})</h2>
                  <p>{selectedPath.entryPoint} &rarr; {selectedPath.targetAsset}</p>
                </div>
              </div>
              <button className="vapt-close-btn" onClick={() => setSelectedPath(null)}><X size={18} /></button>
            </div>

            <div className="apa-modal-body">
              {/* Stat summary strip */}
              <div className="apa-modal-stats">
                <div className="apa-modal-stat">
                  <span className="label">Risk Score</span>
                  <span className="val" style={{ color: riskColor(selectedPath.riskScore) }}>{selectedPath.riskScore}/100</span>
                </div>
                <div className="apa-modal-stat">
                  <span className="label">Probability</span>
                  <span className="val">{selectedPath.probability}</span>
                </div>
                <div className="apa-modal-stat">
                  <span className="label">Business Impact</span>
                  <span className="val" style={{ color: '#ef4444' }}>{selectedPath.businessImpact}</span>
                </div>
                <div className="apa-modal-stat">
                  <span className="label">Chain Length</span>
                  <span className="val">{selectedPath.attackLength} Stages</span>
                </div>
              </div>

              {/* Vertical Attack Timeline */}
              <div className="vapt-detail-block" style={{ marginTop: '1rem' }}>
                <h5>Vertical Attack Chain Timeline</h5>
                <div className="apa-timeline">
                  {selectedPath.stages.map((stage, idx) => (
                    <div key={idx} className="apa-timeline-item">
                      <div className="apa-timeline-marker">
                        <span className="apa-timeline-icon">{stage.icon}</span>
                      </div>
                      <div className="apa-timeline-content">
                        <div className="apa-timeline-header">
                          <span className="apa-stage-num">Stage {stage.stage}: {stage.type}</span>
                          <span className="vapt-pt-badge" style={{ color: riskColor(stage.severity === 'CRITICAL' ? 90 : 50) }}>
                            {stage.severity || 'INFO'}
                          </span>
                        </div>
                        <h4 className="apa-timeline-name">{stage.name}</h4>
                        <p className="apa-timeline-desc">{stage.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="vapt-detail-block" style={{ marginTop: '1rem' }}>
                <h5>Remediation & Chokepoint Action</h5>
                <div className="callout callout-critical">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Action Required:</strong> {selectedPath.recommendation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttackPathsTable;
