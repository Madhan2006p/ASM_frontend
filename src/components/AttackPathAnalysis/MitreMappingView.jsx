import React, { useState } from 'react';
import { Layers, ShieldAlert, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import { MITRE_TACTICS } from './attackPathEngine';

const MitreMappingView = ({ mitreMapping }) => {
  const [selectedTactic, setSelectedTactic] = useState(null);

  const getTacticItems = (tacticId) => {
    return mitreMapping[tacticId] || [];
  };

  return (
    <div className="apa-mitre-container">
      <div className="vapt-section-title">
        <Layers size={18} className="vapt-section-icon" />
        <h2>MITRE ATT&CK Matrix Correlation</h2>
      </div>

      <p className="narrative">
        Discovered vulnerabilities, open services, and path stages automatically mapped to 11 core MITRE ATT&CK tactics.
      </p>

      {/* ── MITRE ATT&CK Matrix Grid ────────────────────────── */}
      <div className="apa-mitre-matrix">
        {MITRE_TACTICS.map((tactic) => {
          const items = getTacticItems(tactic.id);
          const count = items.length;
          const isSelected = selectedTactic?.id === tactic.id;

          return (
            <div
              key={tactic.id}
              className={`apa-mitre-column ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedTactic(tactic)}
            >
              <div className="apa-mitre-header">
                <span className="apa-mitre-icon">{tactic.icon}</span>
                <div className="apa-mitre-title">{tactic.name}</div>
                <div className="apa-mitre-code">{tactic.code}</div>
                <div className={`apa-mitre-count ${count > 0 ? 'active' : ''}`}>{count}</div>
              </div>

              <div className="apa-mitre-body">
                {count === 0 ? (
                  <div className="apa-mitre-empty">No techniques</div>
                ) : (
                  items.slice(0, 4).map((tech, idx) => (
                    <div key={idx} className="apa-mitre-card">
                      <span className="apa-mitre-tech-id">{tech.id}</span>
                      <span className="apa-mitre-tech-name">{tech.name}</span>
                      <span className="vapt-pt-badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>
                        {tech.severity}
                      </span>
                    </div>
                  ))
                )}
                {count > 4 && (
                  <div className="apa-mitre-more">+{count - 4} more techniques</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detailed Tactic Drawer / Panel ─────────────────── */}
      {selectedTactic && (
        <div className="card apa-card" style={{ marginTop: '1.5rem' }}>
          <div className="apa-card-header">
            <div className="apa-card-title">
              <span style={{ fontSize: '1.2rem' }}>{selectedTactic.icon}</span>
              <h3>
                {selectedTactic.name} ({selectedTactic.code}) Techniques ({getTacticItems(selectedTactic.id).length})
              </h3>
            </div>
            <button className="vapt-btn vapt-btn-ghost" onClick={() => setSelectedTactic(null)}>
              Close Panel
            </button>
          </div>

          <div className="apa-tactic-detail-list">
            {getTacticItems(selectedTactic.id).length === 0 ? (
              <div className="apa-empty-state">
                <CheckCircle2 size={32} style={{ color: '#22c55e', opacity: 0.5 }} />
                <p>No active techniques associated with {selectedTactic.name}.</p>
              </div>
            ) : (
              <table className="vapt-print-table">
                <thead>
                  <tr>
                    <th>Technique ID</th>
                    <th>Technique Name</th>
                    <th>Correlated Asset</th>
                    <th>Vulnerability / Cause</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {getTacticItems(selectedTactic.id).map((item, i) => (
                    <tr key={i}>
                      <td><span className="meta-tag" style={{ fontWeight: 800 }}>{item.id}</span></td>
                      <td className="vapt-pt-title">{item.name}</td>
                      <td className="vapt-pt-asset">{item.asset}</td>
                      <td>{item.vuln}</td>
                      <td>
                        <span className="vapt-pt-badge" style={{ color: item.severity === 'CRITICAL' ? '#ef4444' : '#f97316' }}>
                          {item.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MitreMappingView;
