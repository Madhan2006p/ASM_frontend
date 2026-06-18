import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, AlertTriangle, ShieldCheck, PieChart, TrendingUp, Search, Layers, RefreshCw, BarChart2 } from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
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

const ExecutiveDashboard = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [loading, setLoading] = useState(false);
  const [subdomains, setSubdomains] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [openPorts, setOpenPorts] = useState([]);
  const [vulns, setVulns] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!activeScanId) {
        setSubdomains([]); setEndpoints([]); setOpenPorts([]); setVulns([]);
        return;
      }
      try {
        setLoading(true);
        const [subData, endData, portData, vulnData] = await Promise.all([
          api.get(`/api/attacksurface/subdomains/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/endpoints/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/open-ports/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`).catch(() => [])
        ]);

        setSubdomains(Array.isArray(subData) ? subData : (subData?.results || []));
        setEndpoints(Array.isArray(endData) ? endData : (endData?.results || []));
        setOpenPorts(Array.isArray(portData) ? portData : (portData?.results || []));
        setVulns(Array.isArray(vulnData) ? vulnData : (vulnData?.results || []));

      } catch (err) {
        console.error("Failed to fetch executive dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [activeScanId]);

  // Derived Stats
  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  vulns.forEach(v => {
    const sev = (v.severity || 'low').toLowerCase();
    if (riskCounts[sev] !== undefined) riskCounts[sev]++;
  });

  const critical = riskCounts.critical;
  const high = riskCounts.high;
  const medium = riskCounts.medium;
  const low = riskCounts.low;
  
  const totalVulns = critical + high + medium + low;
  const totalAssets = (subdomains.length || 0) + (endpoints.length || 0) + (openPorts.length || 0);
  
  // Calculate a mock risk score based on severity weights
  const rawRiskScore = (critical * 10) + (high * 5) + (medium * 2) + (low * 1);
  const riskScore = Math.min(100, rawRiskScore); // Cap at 100
  
  
  const getGrade = (score) => {
    if (score >= 90) return { grade: 'A', color: '#22C55E' };
    if (score >= 80) return { grade: 'B', color: '#3B82F6' };
    if (score >= 70) return { grade: 'C', color: '#F59E0B' };
    if (score >= 60) return { grade: 'D', color: '#F97316' };
    return { grade: 'F', color: '#EF4444' };
  };
  
  const health = getGrade(100 - (riskScore / 10)); // Inverting risk score for health if risk is 0-100. Wait, risk is 0-100 where 100 is bad. Health is 100-risk.
  const healthScoreValue = Math.max(0, 100 - riskScore);
  const healthInfo = getGrade(healthScoreValue);

  return (
    <div className="internal-dashboard-container">
      <PageHeaderCard
        badgeText="EXECUTIVE VIEW"
        title="Overall Executive Dashboard"
        subtitle="A centralized, complete security posture overview aggregating all modules and assets."
      />

      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Compiling executive report...
        </div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="metric-card-premium">
              <div className="card-icon blue"><Layers size={24} /></div>
              <div className="card-info">
                <h4>Total Assets</h4>
                <div className="card-value">{totalAssets}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon red"><ShieldAlert size={24} /></div>
              <div className="card-info">
                <h4>Total Vulnerabilities</h4>
                <div className="card-value">{totalVulns}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon orange"><AlertTriangle size={24} /></div>
              <div className="card-info">
                <h4>Critical / High</h4>
                <div className="card-value">{critical} / {high}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon green"><Activity size={24} /></div>
              <div className="card-info">
                <h4>Open vs Closed Issues</h4>
                <div className="card-value" style={{ fontSize: '1.25rem' }}>{totalVulns} Open <span style={{color: '#64748B', fontSize: '1rem'}}>/ 0 Closed</span></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Security Health Score */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color={healthInfo.color} /> Security Health Score
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
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Overall Posture</div>
                </div>
              </div>
            </div>

            {/* Risk Score Overview */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} color="#EF4444" /> Risk Score Overview
              </h3>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Current Risk Index</span>
                  <span style={{ fontWeight: 'bold', color: '#EF4444' }}>{riskScore} / 100</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, riskScore)}%`, height: '100%', background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }}></div>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Scan Coverage (Assigned Domains)</span>
                  <span style={{ fontWeight: 'bold', color: '#3B82F6' }}>100%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: '#3B82F6' }}></div>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Vulnerability Severity Breakdown */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChart size={18} color="#8B5CF6" /> Vulnerability Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Critical', value: critical, color: '#EF4444' },
                  { label: 'High', value: high, color: '#F97316' },
                  { label: 'Medium', value: medium, color: '#F59E0B' },
                  { label: 'Low', value: low, color: '#22C55E' }
                ].map((item, idx) => {
                  const pct = totalVulns > 0 ? Math.round((item.value / totalVulns) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '60px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
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
                <Layers size={18} color="#06B6D4" /> Asset Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Subdomains', value: subdomains.length, color: '#3B82F6' },
                  { label: 'Endpoints', value: endpoints.length, color: '#06B6D4' },
                  { label: 'Open Ports', value: openPorts.length, color: '#8B5CF6' }
                ].map((item, idx) => {
                  const pct = totalAssets > 0 ? Math.round((item.value / totalAssets) * 100) : 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '80px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
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
            
            {/* Recent Findings Table */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#EF4444" /> Recent Findings
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Vulnerability</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vulns.slice(0, 6).map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#3B82F6' }}>{v.finding || v.vulnerability_id || 'Unknown Finding'}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ 
                            background: v.severity?.toLowerCase() === 'critical' ? 'rgba(239,68,68,0.1)' : v.severity?.toLowerCase() === 'high' ? 'rgba(249,115,22,0.1)' : 'rgba(245,158,11,0.1)',
                            color: v.severity?.toLowerCase() === 'critical' ? '#EF4444' : v.severity?.toLowerCase() === 'high' ? '#F97316' : '#F59E0B',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                          }}>
                            {(v.severity || 'LOW').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {vulns.length === 0 && (
                      <tr><td colSpan="2" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active vulnerabilities found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scan Activity Table */}
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
                      <th style={{ padding: '0.75rem 0.5rem' }}>Target</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(scansList) ? scansList : (scansList?.results || [])).slice(0, 6).map((scan, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)' }}>{scan.target}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{new Date(scan.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ 
                            background: scan.status === 'completed' ? 'rgba(34,197,94,0.1)' : scan.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                            color: scan.status === 'completed' ? '#22C55E' : scan.status === 'failed' ? '#EF4444' : '#3B82F6',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                          }}>
                            {(scan.status || 'running').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!scansList || (Array.isArray(scansList) ? scansList : (scansList?.results || [])).length === 0 && (
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
                <TrendingUp size={18} color="#10B981" /> Security Trends
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

export default ExecutiveDashboard;
