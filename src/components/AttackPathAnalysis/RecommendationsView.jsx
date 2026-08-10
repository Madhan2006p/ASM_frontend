import React from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, TrendingDown, Layers } from 'lucide-react';

const RecommendationsView = ({ recommendations }) => {
  const priorityColor = (pri) => {
    if (pri === 'CRITICAL') return '#ef4444';
    if (pri === 'HIGH') return '#f97316';
    if (pri === 'MEDIUM') return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="apa-recommendations-container">
      <div className="vapt-section-title">
        <ShieldCheck size={18} className="vapt-section-icon" />
        <h2>Prioritized Remediation & Chokepoint Action Plan</h2>
      </div>

      <p className="narrative">
        Actionable recommendations designed to break critical attack paths at key chokepoints and maximize risk reduction.
      </p>

      {/* ── Recommendations Grid ────────────────────────────── */}
      <div className="apa-rec-grid">
        {recommendations.map((rec) => (
          <div key={rec.id} className="card apa-rec-card" style={{ borderLeft: `4.5px solid ${priorityColor(rec.priority)}` }}>
            <div className="apa-rec-header">
              <span className="apa-rec-id">{rec.id}</span>
              <span className="vapt-pt-badge" style={{ color: priorityColor(rec.priority), borderColor: `${priorityColor(rec.priority)}50`, background: `${priorityColor(rec.priority)}15` }}>
                {rec.priority} PRIORITY
              </span>
            </div>

            <h3 className="apa-rec-title">{rec.title}</h3>
            <p className="apa-rec-action">{rec.action}</p>

            <div className="apa-rec-metrics">
              <div className="apa-rec-metric">
                <TrendingDown size={14} style={{ color: '#22c55e' }} />
                <span><strong>Risk Reduction:</strong> {rec.riskReduction}</span>
              </div>
              <div className="apa-rec-metric">
                <Layers size={14} style={{ color: '#3b82f6' }} />
                <span><strong>Affected Assets:</strong> {rec.affectedAssets}</span>
              </div>
              <div className="apa-rec-metric">
                <ShieldCheck size={14} style={{ color: '#8b5cf6' }} />
                <span><strong>Path Reduction:</strong> {rec.pathReduction}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Standard Attack Surface Hardening Checklists ────── */}
      <div className="vapt-best-practices" style={{ marginTop: '2rem' }}>
        <h3>Attack Path Chokepoint Best Practices</h3>
        <div className="vapt-bp-grid">
          {[
            { icon: '🚪', title: 'Port & Service Restriction', desc: 'Close unused public ports (22, 3306, 5432). Move administration behind VPN or IP whitelist.' },
            { icon: '🔒', title: 'Patch Vulnerabilities', desc: 'Prioritize patching CVEs with high CVSS & public exploit availability to break initial entry points.' },
            { icon: '🔑', title: 'Multi-Factor Authentication', desc: 'Enforce MFA across all external admin panels, login endpoints, and remote desktop services.' },
            { icon: '📦', title: 'Tech Stack Upgrades', desc: 'Update legacy web servers, frameworks, and OS dependencies to remove known vulnerability vectors.' },
            { icon: '🛡️', title: 'WAF & DDoS Defense', desc: 'Deploy Cloud WAF to block web application exploits, SQL injections, and malicious probing.' },
            { icon: '🔍', title: 'Continuous Attack Path Audit', desc: 'Perform automated ASM correlation after every infrastructure change to detect new path drift.' },
          ].map((bp, i) => (
            <div key={i} className="card vapt-bp-card">
              <span className="vapt-bp-icon">{bp.icon}</span>
              <h5>{bp.title}</h5>
              <p>{bp.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsView;
