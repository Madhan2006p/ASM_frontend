import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, AlertTriangle, ShieldCheck, PieChart, TrendingUp, Search, Layers, RefreshCw, BarChart2, Globe, Crosshair, FileWarning, ExternalLink, Users } from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import '../InternalDiscovery/InternalDashboard.css';

// Reusable simple wave chart for trends
const TrendChart = ({ color, points }) => (
  <svg viewBox="0 0 300 80" preserveAspectRatio="none" style={{ width: '100%', height: '60px' }}>
    <defs>
      <linearGradient id={`wg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.45" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={points.fill} fill={`url(#wg${color.replace('#','')})`} />
    <path d={points.line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TREND_WAVE = {
  line: 'M0,60 C30,55 60,30 90,35 C120,40 150,15 180,20 C210,25 240,45 270,40 C285,37 300,36 300,36',
  fill: 'M0,60 C30,55 60,30 90,35 C120,40 150,15 180,20 C210,25 240,45 270,40 C285,37 300,36 300,36 L300,80 L0,80 Z'
};

const BrandMonitoringDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.get('/api/brand-monitoring/targets/stats/');
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch brand monitoring stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  // Derived Stats
  const mal = stats?.total_malicious || 0;
  const sus = stats?.total_suspicious || 0;
  const phish = stats?.total_phishing_domains || 0;
  const imp = stats?.total_impersonations || 0;
  
  const totalThreats = mal + sus + phish + imp;
  const totalTargets = stats?.total_targets || 0;
  const activeAlerts = stats?.active_alerts || 0;
  const totalReports = stats?.total_reports || 0;

  // Calculate Brand Risk Score
  const rawRiskScore = (mal * 15) + (phish * 10) + (imp * 5) + (sus * 2);
  const riskScore = Math.min(100, rawRiskScore); 
  
  const getGrade = (score) => {
    if (score >= 90) return { grade: 'A', color: '#22C55E' };
    if (score >= 80) return { grade: 'B', color: '#3B82F6' };
    if (score >= 70) return { grade: 'C', color: '#F59E0B' };
    if (score >= 60) return { grade: 'D', color: '#F97316' };
    return { grade: 'F', color: '#EF4444' };
  };
  
  const healthScoreValue = Math.max(0, 100 - riskScore);
  const healthInfo = getGrade(healthScoreValue);

  return (
    <div className="internal-dashboard-container">
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Brand Monitoring Overview"
        subtitle="Comprehensive visibility into external threats, domain reputation, and brand impersonation."
      />

      {loading ? (
        <div className="card" style={{ marginTop: '1.5rem', padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Compiling brand threat report...
        </div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <div className="metrics-grid" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="metric-card-premium">
              <div className="card-icon cyan"><Globe size={24} /></div>
              <div className="card-info">
                <h4>Monitored Domains</h4>
                <div className="card-value">{totalTargets}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon red"><ShieldAlert size={24} /></div>
              <div className="card-info">
                <h4>Total Threats Found</h4>
                <div className="card-value">{totalThreats}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon orange"><AlertTriangle size={24} /></div>
              <div className="card-info">
                <h4>Active Alerts</h4>
                <div className="card-value">{activeAlerts}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon green"><Activity size={24} /></div>
              <div className="card-info">
                <h4>Total Scans Passed</h4>
                <div className="card-value">{totalReports}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Brand Health Score */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color={healthInfo.color} /> Brand Health Score
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  border: `4px solid ${healthInfo.color}`, color: healthInfo.color,
                  fontSize: '2rem', fontWeight: 800, background: `${healthInfo.color}15`
                }}>
                  {healthInfo.grade}
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{healthScoreValue}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/100</span></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Overall External Posture</div>
                </div>
              </div>
            </div>

            {/* Risk Score Overview */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} color="#EF4444" /> Brand Risk Index
              </h3>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Current Risk Level</span>
                  <span style={{ fontWeight: 'bold', color: '#EF4444' }}>{riskScore} / 100</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, riskScore)}%`, height: '100%', background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }}></div>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Monitoring Coverage</span>
                  <span style={{ fontWeight: 'bold', color: '#3B82F6' }}>100%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: '#3B82F6' }}></div>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Threat Distribution */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChart size={18} color="#8B5CF6" /> Threat Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Malicious Domains', value: mal, color: '#EF4444' },
                  { label: 'Phishing Campaigns', value: phish, color: '#F97316' },
                  { label: 'Impersonating Accounts', value: imp, color: '#F59E0B' },
                  { label: 'Suspicious Domains', value: sus, color: '#3B82F6' }
                ].map((item, idx) => {
                  const pct = totalThreats > 0 ? Math.round((item.value / totalThreats) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '140px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: item.color }}></div>
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Asset Distribution */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#06B6D4" /> External Asset Overview
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Monitored Targets', value: totalTargets, color: '#10B981' },
                  { label: 'Domain Reports', value: totalReports, color: '#8B5CF6' }
                ].map((item, idx) => {
                  const maxVal = Math.max(totalTargets, totalReports) || 1;
                  const pct = Math.round((item.value / maxVal) * 100);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '120px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: item.color }}></div>
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            
            {/* Recent Findings Table (Top Threats) */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#EF4444" /> Target Threat Status
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Domain Target</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Malicious Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.latest_reports || []).slice(0, 6).map((report, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#3B82F6' }}>{report.target_domain || report.domain}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ 
                            background: report.malicious > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                            color: report.malicious > 0 ? '#EF4444' : '#22C55E',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                          }}>
                            {report.malicious > 0 ? `${report.malicious} Engines` : 'CLEAN'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!stats?.latest_reports || stats.latest_reports.length === 0) && (
                      <tr><td colSpan="2" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No target scans available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scan Activity Table (Latest Reports) */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} color="#3B82F6" /> Recent Scan Activity
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Domain</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Reputation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.latest_reports || []).slice(0, 6).map((report, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)' }}>{report.target_domain || report.domain}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{formatDate(report.checked_at)}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ 
                            background: report.reputation_score >= 80 ? 'rgba(34,197,94,0.1)' : report.reputation_score >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                            color: report.reputation_score >= 80 ? '#22C55E' : report.reputation_score >= 50 ? '#EAB308' : '#EF4444',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                          }}>
                            {report.reputation_score}/100
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!stats?.latest_reports || stats.latest_reports.length === 0) && (
                      <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No recent scan activity.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {/* Security Trends */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="#10B981" /> Reputation Trends
              </h3>
              <div style={{ marginTop: '1rem', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Historical Threat Activity (Simulated Trend)</div>
                <TrendChart color="#10B981" points={TREND_WAVE} />
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default BrandMonitoringDashboard;
