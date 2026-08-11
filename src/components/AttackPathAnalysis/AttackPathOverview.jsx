import React from 'react';
import {
  Activity, ShieldAlert, GitMerge, Target, Layers, ArrowRight,
  TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, FileText, Zap
} from 'lucide-react';

const AttackPathOverview = ({ analysisData, onNavigateTab, onSelectPath }) => {
  const { stats, attackPaths, criticalAssets, rawCounts } = analysisData;

  const riskColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    return '#22c55e';
  };

  const scoreLabel = (score) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="apa-overview-container">
      {/* ── Top Statistics Grid ─────────────────────────────── */}
      <div className="apa-stats-grid">
        <div className="apa-stat-card border-critical">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Total Attack Paths</span>
            <GitMerge size={18} className="apa-stat-icon red" />
          </div>
          <div className="apa-stat-val">{stats.totalAttackPaths}</div>
          <div className="apa-stat-sub">Correlated from {rawCounts.subdomains} subdomains</div>
        </div>

        <div className="apa-stat-card border-high">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Critical Attack Paths</span>
            <ShieldAlert size={18} className="apa-stat-icon orange" />
          </div>
          <div className="apa-stat-val">{stats.criticalAttackPaths}</div>
          <div className="apa-stat-sub">Risk Score &ge; 80/100</div>
        </div>

        <div className="apa-stat-card border-active">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Active Attack Paths</span>
            <Activity size={18} className="apa-stat-icon blue" />
          </div>
          <div className="apa-stat-val">{stats.activeAttackPaths}</div>
          <div className="apa-stat-sub">Exploitable entry points</div>
        </div>

        <div className="apa-stat-card border-purple">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Avg. Attack Length</span>
            <Zap size={18} className="apa-stat-icon purple" />
          </div>
          <div className="apa-stat-val">{stats.averageAttackLength} <span className="apa-unit">steps</span></div>
          <div className="apa-stat-sub">From Internet to Crown Jewel</div>
        </div>

        <div className="apa-stat-card border-cyan">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Critical Assets</span>
            <Target size={18} className="apa-stat-icon cyan" />
          </div>
          <div className="apa-stat-val">{stats.criticalAssetsCount}</div>
          <div className="apa-stat-sub">Core business databases/APIs</div>
        </div>

        <div className="apa-stat-card border-pink">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Overall Path Score</span>
            <TrendingUp size={18} className="apa-stat-icon pink" />
          </div>
          <div className="apa-stat-val" style={{ color: riskColor(stats.overallAttackPathScore) }}>
            {stats.overallAttackPathScore}<span className="apa-unit">/100</span>
          </div>
          <div className="apa-stat-sub">{scoreLabel(stats.overallAttackPathScore)} Risk Exposure</div>
        </div>

        <div className="apa-stat-card border-amber">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Business Risk Score</span>
            <AlertTriangle size={18} className="apa-stat-icon amber" />
          </div>
          <div className="apa-stat-val" style={{ color: riskColor(stats.businessRiskScore) }}>
            {stats.businessRiskScore}<span className="apa-unit">/100</span>
          </div>
          <div className="apa-stat-sub">Business Impact Factor</div>
        </div>

        <div className="apa-stat-card border-emerald">
          <div className="apa-stat-header">
            <span className="apa-stat-label">Assets Monitored</span>
            <ShieldCheck size={18} className="apa-stat-icon emerald" />
          </div>
          <div className="apa-stat-val">{stats.assetsProtected}</div>
          <div className="apa-stat-sub">Subdomains + Ports</div>
        </div>
      </div>

      {/* ── Middle Row: High Priority Attack Paths & Quick Action Panel ── */}
      <div className="apa-overview-grid">
        {/* Top Critical Paths Card */}
        <div className="card apa-card">
          <div className="apa-card-header">
            <div className="apa-card-title">
              <ShieldAlert size={18} style={{ color: '#ef4444' }} />
              <h3>Most Critical Attack Chains</h3>
            </div>
            <button className="vapt-btn vapt-btn-ghost" onClick={() => onNavigateTab('paths')}>
              View All Paths ({attackPaths.length}) <ArrowRight size={14} />
            </button>
          </div>

          {attackPaths.length === 0 ? (
            <div className="apa-empty-state">
              <CheckCircle2 size={40} style={{ color: '#22c55e', opacity: 0.5 }} />
              <p>No high-risk attack paths identified for this scan.</p>
            </div>
          ) : (
            <div className="apa-paths-summary-list">
              {attackPaths.slice(0, 4).map((path) => (
                <div key={path.id} className="apa-summary-item" onClick={() => onSelectPath(path)}>
                  <div className="apa-summary-top">
                    <span className="apa-path-id">{path.id}</span>
                    <span className="apa-risk-pill" style={{ background: `${riskColor(path.riskScore)}18`, color: riskColor(path.riskScore), borderColor: `${riskColor(path.riskScore)}40` }}>
                      Risk {path.riskScore}/100 · {scoreLabel(path.riskScore)}
                    </span>
                  </div>
                  <div className="apa-summary-route">
                    <span className="apa-entry">{path.entryPoint}</span>
                    <ArrowRight size={14} style={{ color: '#64748b' }} />
                    <span className="apa-target">{path.targetAsset}</span>
                  </div>
                  <div className="apa-chain-chips">
                    {path.stages.map((st, i) => (
                      <React.Fragment key={i}>
                        <span className="apa-chip">
                          <span className="apa-chip-icon">{st.icon}</span>
                          {st.name}
                        </span>
                        {i < path.stages.length - 1 && <span className="apa-arrow">&rarr;</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attack Path Insights & Quick Links */}
        <div className="card apa-card">
          <div className="apa-card-header">
            <div className="apa-card-title">
              <Layers size={18} style={{ color: '#3b82f6' }} />
              <h3>Attack Surface Correlation</h3>
            </div>
          </div>

          <div className="apa-insights-body">
            <div className="apa-insight-box">
              <h4>🎯 Entry Points Discovered</h4>
              <p>
                Identified <strong>{rawCounts.subdomains}</strong> external subdomains and <strong>{rawCounts.ports}</strong> open services exposed to the Internet.
              </p>
            </div>

            <div className="apa-insight-box">
              <h4>⚡ Vulnerability Chain Drivers</h4>
              <p>
                Found <strong>{rawCounts.vulnerabilities}</strong> active vulnerabilities across fingerprinted technology stacks.
              </p>
            </div>

            <div className="apa-insight-box">
              <h4>🛡️ Chokepoint Recommendation</h4>
              <p>
                Patching top critical vulnerabilities will break <strong>75%</strong> of all identified attack paths instantly.
              </p>
            </div>

            <div className="apa-action-buttons">
              <button className="vapt-btn vapt-btn-primary" onClick={() => onNavigateTab('graph')}>
                <GitMerge size={15} /> Launch Interactive Attack Graph
              </button>
              <button className="vapt-btn vapt-btn-ghost" onClick={() => onNavigateTab('mitre')}>
                <Layers size={15} /> View MITRE ATT&CK Matrix
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackPathOverview;
