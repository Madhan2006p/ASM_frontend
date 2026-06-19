import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { 
  Building2, 
  MapPin, 
  ShieldAlert, 
  Activity, 
  Layers, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  Smartphone,
  Shield,
  Eye,
  AlertOctagon,
  Network,
  Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import PageHeaderCard from '../common/PageHeaderCard';
import './ExecutiveDashboard.css';

// SVG Continent Path outline for world map visualization
const WorldMapSilhouette = () => (
  <svg viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
    <path d="M120,60 L240,40 L280,60 L290,110 L270,130 L210,140 L190,180 L160,180 L140,150 L110,150 L90,120 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
    <path d="M280,20 L330,10 L320,50 L270,40 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
    <path d="M190,190 L230,210 L250,250 L220,330 L190,370 L180,340 L170,280 L170,220 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
    <path d="M380,60 L440,50 L480,60 L490,110 L450,130 L410,130 L380,100 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
    <path d="M380,140 L450,130 L480,160 L490,200 L460,260 L430,280 L410,250 L390,200 L370,160 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
    <path d="M480,50 L680,40 L700,120 L680,210 L640,230 L580,230 L540,180 L500,150 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
    <path d="M640,250 L700,260 L710,300 L660,320 L630,290 Z" fill="var(--text-secondary, #cbd5e1)" opacity="0.15" />
  </svg>
);

const countryCoords = {
  "United States": { x: 180, y: 110 },
  "Canada": { x: 160, y: 80 },
  "United Kingdom": { x: 410, y: 90 },
  "France": { x: 420, y: 110 },
  "India": { x: 610, y: 170 },
  "Germany": { x: 435, y: 95 },
  "Australia": { x: 680, y: 290 },
  "Brazil": { x: 230, y: 270 }
};

const ExecutiveDashboard = ({ assignedDomains = [], selectedDomain, setSelectedDomain }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/attacksurface/executive-dashboard/?domain=${selectedDomain || ''}`);
        setData(res);
      } catch (err) {
        console.error("Failed to load executive dashboard aggregated metrics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDomain]);

  if (loading) {
    return (
      <div className="exec-dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={32} />
          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Compiling executive risk posture report...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_assets: 0,
    organization_domains: 0,
    subdomains_count: 0,
    vulnerabilities_count: 0,
    expired_certs_count: 0,
    ssl_expiring_soon: 0
  };

  const managedVsUnmanaged = data?.managed_vs_unmanaged || { managed: 0, unmanaged: 0 };
  const riskScoreDistribution = data?.risk_score_distribution || { critical: 0, high: 0, medium: 0, low: 0 };
  const exposedServices = data?.exposed_services || [];
  const domainDistribution = data?.domain_distribution || [];
  const locationDistribution = data?.location_distribution || [];
  const trends = data?.trends || [];

  // Mobile, Email & Brand Data
  const mobileSecurity = data?.mobile_security || { scans_count: 0, findings_count: 0, severity_distribution: { high: 0, medium: 0, info: 0 }, scans_list: [] };
  const emailSecurity = data?.email_security || { spf_valid: false, dmarc_valid: false, dkim_valid: false, open_relay: false, mx_valid: false, score: 0, domain: '' };
  const brandMonitoring = data?.brand_monitoring || { suspicious_count: 0, phishing_count: 0, impersonating_count: 0, virustotal: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, reputation_score: 100 }, impersonating_list: [] };
  const surfaceWeb = data?.surface_web || { scans_count: 0, results_count: 0, findings_list: [] };

  const distributionColors = ['#ff7849', '#3b82f6', '#10b981', '#a855f7', '#6366f1', '#ec4899', '#f59e0b'];

  // Recharts Formats
  const managedChartData = [
    { name: 'Managed', value: managedVsUnmanaged.managed, color: '#1e76d2' },
    { name: 'Unmanaged', value: managedVsUnmanaged.unmanaged, color: '#ff9800' }
  ];

  const riskChartData = [
    { name: 'Severe', value: riskScoreDistribution.critical, color: '#dc2626' },
    { name: 'High', value: riskScoreDistribution.high, color: '#f97316' },
    { name: 'Medium', value: riskScoreDistribution.medium, color: '#f59e0b' },
    { name: 'Low', value: riskScoreDistribution.low, color: '#10b981' }
  ].filter(item => item.value > 0);

  if (riskChartData.length === 0) {
    riskChartData.push({ name: 'Clean / Low', value: 1, color: '#10b981' });
  }

  const domainChartData = domainDistribution.map((item, idx) => ({
    name: item.domain,
    value: item.count,
    color: distributionColors[idx % distributionColors.length]
  }));

  // Mobile Findings Recharts format
  const mobileFindingsChartData = [
    { name: 'High', value: mobileSecurity.severity_distribution.high, color: '#dc2626' },
    { name: 'Medium', value: mobileSecurity.severity_distribution.medium, color: '#f97316' },
    { name: 'Info', value: mobileSecurity.severity_distribution.info, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  if (mobileFindingsChartData.length === 0) {
    mobileFindingsChartData.push({ name: 'Healthy / Clean', value: 1, color: '#10b981' });
  }

  // VT Recharts format
  const vtChartData = [
    { name: 'Malicious', value: brandMonitoring.virustotal.malicious, color: '#dc2626' },
    { name: 'Suspicious', value: brandMonitoring.virustotal.suspicious, color: '#f59e0b' },
    { name: 'Harmless', value: brandMonitoring.virustotal.harmless, color: '#10b981' },
    { name: 'Undetected', value: brandMonitoring.virustotal.undetected, color: '#64748b' }
  ].filter(item => item.value > 0);

  if (vtChartData.length === 0) {
    vtChartData.push({ name: 'Clean', value: 1, color: '#10b981' });
  }

  const currentTrendVal = trends.length > 0 ? trends[trends.length - 1].assets : metrics.total_assets;
  const prevTrendVal = trends.length > 1 ? trends[trends.length - 2].assets : currentTrendVal;
  const percentChange = prevTrendVal > 0 
    ? (((currentTrendVal - prevTrendVal) / prevTrendVal) * 100).toFixed(2)
    : '0.00';

  const totalGlobalCount = locationDistribution.reduce((acc, curr) => acc + curr.count, 0);

  const getGrade = (s) => {
    if (s >= 90) return { grade: 'A', color: '#10b981' };
    if (s >= 75) return { grade: 'B', color: '#3b82f6' };
    if (s >= 50) return { grade: 'C', color: '#f59e0b' };
    if (s >= 25) return { grade: 'D', color: '#f97316' };
    return { grade: 'F', color: '#dc2626' };
  };

  const emailGrade = getGrade(emailSecurity.score);

  return (
    <div className="exec-dashboard-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Executive Security Dashboard</h1>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Comprehensive risk posture across discovery, mobile, email, and brand monitoring</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Domain Filter:
          </span>
          <select
            value={selectedDomain || ''}
            onChange={(e) => setSelectedDomain && setSelectedDomain(e.target.value)}
            className="exec-dropdown-select"
          >
            <option value="">All Scanned Domains</option>
            {assignedDomains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Row: 6 Metric Tiles */}
      <div className="exec-metrics-grid">
        <div className="exec-metric-tile tile-red-surface">
          <div className="exec-tile-value">{metrics.total_assets}</div>
          <div className="exec-tile-label">External Attack Surface</div>
        </div>

        <div className="exec-metric-tile tile-orange-org">
          <div className="exec-tile-value">{metrics.organization_domains}</div>
          <div className="exec-tile-label">Organization Domains</div>
        </div>

        <div className="exec-metric-tile tile-green-domains">
          <div className="exec-tile-value">{metrics.subdomains_count}</div>
          <div className="exec-tile-label">Domains And Sub Domains</div>
        </div>

        <div className="exec-metric-tile tile-red-vulns">
          <div className="exec-tile-value">{metrics.vulnerabilities_count}</div>
          <div className="exec-tile-label">Vulns Discovered</div>
        </div>

        <div className="exec-metric-tile tile-gray-expired">
          <div className="exec-tile-value">{metrics.expired_certs_count}</div>
          <div className="exec-tile-label">Expired Certificates</div>
        </div>

        <div className="exec-metric-tile tile-blue-expiring">
          <div className="exec-tile-value">{metrics.ssl_expiring_soon}</div>
          <div className="exec-tile-label">SSL Expiring &lt; 90 Days</div>
        </div>
      </div>

      {/* SECTION: ASSET DISCOVERY (ROW 2) */}
      <div className="exec-widgets-grid-3">
        {/* Externally Exposed Assets trend chart */}
        <div className="exec-widget-card">
          <div className="exec-widget-title">EXTERNALLY EXPOSED ASSETS (TREND)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{metrics.total_assets}</span>
            {Number(percentChange) !== 0 && (
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: 700, 
                color: Number(percentChange) > 0 ? '#ef4444' : '#10b981', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.1rem' 
              }}>
                {Number(percentChange) > 0 ? '▲' : '▼'} {Math.abs(Number(percentChange))}%
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              Exposure timeline
            </span>
          </div>

          <div style={{ flex: 1, minHeight: '180px' }}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="var(--text-secondary)" />
                  <YAxis tick={{ fontSize: 9 }} stroke="var(--text-secondary)" />
                  <Tooltip />
                  <Area type="monotone" dataKey="assets" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAssets)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No historical scans for this domain.
              </div>
            )}
          </div>
        </div>

        {/* External Attack Surface by Location Map */}
        <div className="exec-widget-card">
          <div className="exec-widget-title">
            <span>ATTACK SURFACE BY LOCATION</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total: {totalGlobalCount} Global
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div className="map-container">
              <WorldMapSilhouette />
              <style>{`
                @keyframes pulseMapRipple {
                  0% { r: 3px; opacity: 0.8; }
                  100% { r: 15px; opacity: 0; }
                }
                .pulse-map-dot {
                  animation: pulseMapRipple 1.8s infinite ease-out;
                }
              `}</style>
              <svg viewBox="0 0 800 400" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                {locationDistribution.map((item, idx) => {
                  const coords = countryCoords[item.location] || { x: 400, y: 200 };
                  return (
                    <g key={idx}>
                      <circle cx={coords.x} cy={coords.y} r={10} fill="#ef4444" className="pulse-map-dot" />
                      <circle cx={coords.x} cy={coords.y} r={4} fill="#dc2626" />
                    </g>
                  );
                })}
              </svg>
            </div>

            <div style={{ maxHeight: '110px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px' }}>Location</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px' }}>Asset Count</th>
                  </tr>
                </thead>
                <tbody>
                  {locationDistribution.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.location}</td>
                      <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Managed vs Unmanaged Donut */}
        <div className="exec-widget-card">
          <div className="exec-widget-title">MANAGED VS UNMANAGED</div>
          
          <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={managedChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {managedChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Assets</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.total_assets}</div>
            </div>
          </div>

          <div className="exec-legend-list">
            {managedChartData.map((entry, index) => (
              <div key={index} className="exec-legend-item">
                <div className="exec-legend-dot-label">
                  <span className="exec-legend-color-dot" style={{ backgroundColor: entry.color }}></span>
                  <span style={{ color: 'var(--text-primary)' }}>{entry.name}</span>
                </div>
                <span className="exec-legend-value" style={{ color: entry.color }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION: PORT DISCOVERY & SYSTEM RISK (ROW 3) */}
      <div className="exec-widgets-grid-3">
        <div className="exec-widget-card">
          <div className="exec-widget-title">VULNERABILITIES BY RISK SCORE</div>

          <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Issues Count</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.vulnerabilities_count}</div>
            </div>
          </div>

          <div className="exec-legend-list">
            {riskChartData.map((entry, index) => (
              <div key={index} className="exec-legend-item">
                <div className="exec-legend-dot-label">
                  <span className="exec-legend-color-dot" style={{ backgroundColor: entry.color }}></span>
                  <span style={{ color: 'var(--text-primary)' }}>{entry.name}</span>
                </div>
                <span className="exec-legend-value" style={{ color: entry.color }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="exec-widget-card" style={{ justifyContent: 'flex-start' }}>
          <div className="exec-widget-title">EXPOSED PORTS & SERVICES</div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="exec-table">
              <thead>
                <tr>
                  <th>Services</th>
                  <th style={{ textAlign: 'right' }}>Asset Count</th>
                </tr>
              </thead>
              <tbody>
                {exposedServices.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.service}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="exec-widget-card">
          <div className="exec-widget-title">DOMAIN ASSETS DISTRIBUTION</div>

          <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={domainChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {domainChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Targets</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{domainDistribution.length}</div>
            </div>
          </div>

          <div className="exec-legend-list">
            {domainChartData.map((entry, index) => (
              <div key={index} className="exec-legend-item">
                <div className="exec-legend-dot-label">
                  <span className="exec-legend-color-dot" style={{ backgroundColor: entry.color }}></span>
                  <span style={{ color: 'var(--text-primary)' }} title={entry.name}>{entry.name}</span>
                </div>
                <span className="exec-legend-value" style={{ color: entry.color }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION: EMAIL & MOBILE SECURITY (ROW 4) */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Smartphone size={20} color="#4c8cd4" /> Email & Mobile Application Security
        </h2>
      </div>

      <div className="exec-widgets-grid-3">
        {/* Email Security Compliance Card */}
        <div className="exec-widget-card">
          <div className="exec-widget-title">
            <span>EMAIL SECURITY COMPLIANCE</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{emailSecurity.domain}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '1rem 0' }}>
            <div style={{ 
              width: '75px', height: '75px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              border: `4px solid ${emailGrade.color}`, color: emailGrade.color,
              fontSize: '1.8rem', fontWeight: 800, background: `${emailGrade.color}10`
            }}>
              {emailGrade.grade}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{emailSecurity.score}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/100</span></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compliance Score</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', flex: 1 }}>
            {[
              { label: 'SPF Configuration', valid: emailSecurity.spf_valid, activeText: 'Valid', inactiveText: 'Missing' },
              { label: 'DMARC Rule', valid: emailSecurity.dmarc_valid, activeText: 'Valid', inactiveText: 'Missing' },
              { label: 'MX Records', valid: emailSecurity.mx_valid, activeText: 'Configured', inactiveText: 'Missing' },
              { label: 'STARTTLS Support', valid: emailSecurity.starttls_supported, activeText: 'Supported', inactiveText: 'Unsupported' }
            ].map((item, idx) => (
              <div key={idx} className="flex-between" style={{ padding: '0.4rem 0.5rem', background: 'var(--bg-main, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: item.valid ? '#10b981' : '#dc2626' }}>
                  {item.valid ? (
                    <><CheckCircle2 size={13} /> {item.activeText}</>
                  ) : (
                    <><XCircle size={13} /> {item.inactiveText}</>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Severity Breakdown Card */}
        <div className="exec-widget-card">
          <div className="exec-widget-title">MOBILE FINDINGS BY SEVERITY</div>

          <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mobileFindingsChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mobileFindingsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vulnerabilities</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{mobileSecurity.findings_count}</div>
            </div>
          </div>

          <div className="exec-legend-list">
            {mobileFindingsChartData.map((entry, index) => (
              <div key={index} className="exec-legend-item">
                <div className="exec-legend-dot-label">
                  <span className="exec-legend-color-dot" style={{ backgroundColor: entry.color }}></span>
                  <span style={{ color: 'var(--text-primary)' }}>{entry.name}</span>
                </div>
                <span className="exec-legend-value" style={{ color: entry.color }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scanned Mobile Packages Table */}
        <div className="exec-widget-card" style={{ justifyContent: 'flex-start' }}>
          <div className="exec-widget-title">
            <span>SCANNED MOBILE APPLICATIONS</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total: {mobileSecurity.scans_count}</span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="exec-table">
              <thead>
                <tr>
                  <th>App / Package</th>
                  <th style={{ textAlign: 'right' }}>Security Score</th>
                </tr>
              </thead>
              <tbody>
                {mobileSecurity.scans_list.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.app_name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{item.package_name || 'Generic APK'}</div>
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: isNaN(item.score) ? '#64748b' : (Number(item.score) >= 80 ? '#10b981' : (Number(item.score) >= 50 ? '#f59e0b' : '#dc2626')),
                        fontSize: '0.9rem'
                      }}>
                        {item.score}
                      </span>
                    </td>
                  </tr>
                ))}
                {mobileSecurity.scans_list.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No mobile application scans.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION: BRAND MONITORING (ROW 5) */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={20} color="#ff7849" /> Brand Protection & Threat Intelligence
        </h2>
      </div>

      <div className="exec-widgets-grid-3" style={{ marginBottom: '2rem' }}>
        {/* Brand Reputation (VirusTotal) */}
        <div className="exec-widget-card">
          <div className="exec-widget-title">VIRUSTOTAL REPUTATION SHIELD</div>

          <div style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vtChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {vtChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reputation</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{brandMonitoring.virustotal.reputation_score}</div>
            </div>
          </div>

          <div className="exec-legend-list">
            {vtChartData.map((entry, index) => (
              <div key={index} className="exec-legend-item">
                <div className="exec-legend-dot-label">
                  <span className="exec-legend-color-dot" style={{ backgroundColor: entry.color }}></span>
                  <span style={{ color: 'var(--text-primary)' }}>{entry.name}</span>
                </div>
                <span className="exec-legend-value" style={{ color: entry.color }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Threat Summary */}
        <div className="exec-widget-card" style={{ justifyContent: 'space-between' }}>
          <div className="exec-widget-title">DOMAIN IMPERSONATION THREATS</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#f59e0b', justifyContent: 'center' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{brandMonitoring.suspicious_count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Suspicious Squatting Domains</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#dc2626', justifyContent: 'center' }}>
                <AlertOctagon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{brandMonitoring.phishing_count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Phishing Domains</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#3b82f6', justifyContent: 'center' }}>
                <Layers size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{brandMonitoring.impersonating_count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Impersonating Social Profiles</div>
              </div>
            </div>
          </div>
        </div>

        {/* Impersontating accounts table */}
        <div className="exec-widget-card" style={{ justifyContent: 'flex-start' }}>
          <div className="exec-widget-title">RECENT SOCIAL IMPERSONATIONS</div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="exec-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Platform</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {brandMonitoring.impersonating_list.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>@{item.username}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Followers: {item.followers}</div>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.platform}</td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        background: item.action_status?.toLowerCase().includes('down') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: item.action_status?.toLowerCase().includes('down') ? '#10b981' : '#dc2626'
                      }}>
                        {item.action_status}
                      </span>
                    </td>
                  </tr>
                ))}
                {brandMonitoring.impersonating_list.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No brand impersonations detected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION: SURFACE WEB MONITORING (ROW 6) */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={20} color="#8b5cf6" /> Passive OSINT & Surface Web Intelligence
        </h2>
      </div>

      <div className="exec-widgets-grid-3" style={{ marginBottom: '2rem' }}>
        {/* OSINT Targets */}
        <div className="exec-widget-card" style={{ justifyContent: 'space-between' }}>
          <div className="exec-widget-title">OSINT TARGET MONITORS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#8b5cf6', justifyContent: 'center' }}>
                <Globe size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{surfaceWeb.scans_count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Monitored Targets</div>
              </div>
            </div>
          </div>
        </div>

        {/* OSINT Data Values */}
        <div className="exec-widget-card" style={{ justifyContent: 'space-between' }}>
          <div className="exec-widget-title">PASSIVE OSINT DISCOVERIES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#10b981', justifyContent: 'center' }}>
                <Layers size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{surfaceWeb.results_count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Passive OSINT Findings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent OSINT Findings */}
        <div className="exec-widget-card" style={{ justifyContent: 'flex-start' }}>
          <div className="exec-widget-title">RECENT PASSIVE DISCOVERIES</div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="exec-table">
              <thead>
                <tr>
                  <th>Data Type</th>
                  <th>Value</th>
                  <th style={{ textAlign: 'right' }}>Module</th>
                </tr>
              </thead>
              <tbody>
                {surfaceWeb.findings_list.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 750, 
                        padding: '0.15rem 0.35rem', 
                        borderRadius: '4px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.data_type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-primary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.data_value}>
                      {item.data_value}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.module}
                    </td>
                  </tr>
                ))}
                {surfaceWeb.findings_list.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No passive OSINT discoveries.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
