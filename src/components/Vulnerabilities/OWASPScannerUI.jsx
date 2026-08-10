import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, AlertOctagon, Info,
  RefreshCw, Download, Activity, Filter,
} from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import VulnerabilitiesTable from './VulnerabilitiesTable';

const SEVERITY_COLORS = {
  CRITICAL: '#F87171',
  HIGH: '#FBBF24',
  MEDIUM: '#22D3EE',
  LOW: '#4ADE80',
  INFO: '#94A3B8',
};

const DEFAULT_CATEGORIES = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  id: `A${String(i + 1).padStart(2, '0')}`,
  name: '',
  title: '',
  description: '',
  url: '',
  cwes: [],
  count: 0,
  severities: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  findings: [],
}));

const CATEGORY_FALLBACK_NAMES = [
  'Broken Access Control',
  'Cryptographic Failures',
  'Injection',
  'Insecure Design',
  'Security Misconfiguration',
  'Vulnerable and Outdated Components',
  'Identification and Authentication Failures',
  'Software and Data Integrity Failures',
  'Security Logging and Monitoring Failures',
  'Server-Side Request Forgery (SSRF)',
];

const cvssForSeverity = (sev) => {
  const s = (sev || 'LOW').toUpperCase();
  if (s === 'CRITICAL') return 9.5;
  if (s === 'HIGH') return 8.0;
  if (s === 'MEDIUM') return 5.5;
  if (s === 'LOW') return 3.0;
  return 1.0;
};

const OWASPScannerUI = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'A01'...'A10'
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const activeScan = scansList?.find(s => s.id === Number(activeScanId));
  const isVulnScanRunning = activeScan && (
    activeScan.vuln_scan_phase === 'running' ||
    activeScan.vuln_scan_phase?.startsWith('running_') ||
    (activeScan.vuln_scan_phase && activeScan.vuln_scan_phase !== 'pending' &&
     activeScan.vuln_scan_phase !== 'complete' && activeScan.status === 'running')
  );
  const showScanningState = activeScan && activeScan.vuln_scan_phase !== 'complete';

  // Phase display text for the running banner
  const currentAttemptText = useMemo(() => {
    if (!activeScan?.vuln_scan_phase) return 'Initializing...';
    if (activeScan.vuln_scan_phase === 'running_nuclei') return 'Phase 1: Nuclei Fast Scan';
    if (activeScan.vuln_scan_phase === 'running_wapiti') return 'Phase 2: Wapiti Application Fuzzing';
    if (activeScan.vuln_scan_phase.startsWith('phase_')) {
      const parts = activeScan.vuln_scan_phase.split('_');
      const phaseNum = parts[1];
      const total = parts[3];
      const phaseId = parts.slice(4).join('_');
      return `Deep Scan Phase ${phaseNum}/${total}: ${phaseId.replace(/_/g, ' ')}`;
    }
    if (activeScan.vuln_scan_phase === 'running_basic') return 'Running OWASP Top 10 & baseline checks';
    if (activeScan.vuln_scan_phase === 'running_deep') return 'Running deep OWASP Top 10 assessment';
    return 'Scanning...';
  }, [activeScan]);

  const loadVulns = useCallback(async () => {
    if (!activeScanId) {
      setVulnerabilities([]);
      setCategories(DEFAULT_CATEGORIES);
      return;
    }
    try {
      setLoading(true);
      const data = await api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`);
      const list = Array.isArray(data) ? data : (data.results || []);

      const mapped = list.map(v => ({
        id: v.id,
        title: v.finding || v.vulnerability_id || 'Security Vulnerability',
        cve: v.cve || '—',
        cwe: v.cwe || '—',
        description: v.description || 'No description provided.',
        remediation: v.remediation || 'No remediation provided.',
        reference: v.reference || '—',
        severity: (v.severity || 'LOW').toUpperCase(),
        status: 'Open',
        cvss: (typeof v.cvss_score === 'number' && v.cvss_score > 0)
          ? v.cvss_score
          : cvssForSeverity(v.severity),
        affected_assets: v.affected_assets || [v.subdomain || v.domain || 'Target Scope'],
        asset: (Array.isArray(v.affected_assets) && v.affected_assets.length > 0)
          ? v.affected_assets[0]
          : (v.subdomain || v.domain || 'Target Scope'),
        age: v.discovered_at ? new Date(v.discovered_at).toLocaleDateString() : 'Recent',
        source_tool: v.source_tool || 'Nuclei',
        owasp_category: v.owasp_category || '',
        owasp_rank: v.owasp_rank || 0,
        template_id: v.template_id || '',
        vulnerability_id: v.vulnerability_id || '',
        exploit: ['CRITICAL', 'HIGH'].includes((v.severity || '').toUpperCase()),
      }));

      mapped.sort((a, b) => b.cvss - a.cvss);
      setVulnerabilities(mapped);

      // Group into the 10 OWASP categories (fallback to names when API lacks metadata)
      const grouped = DEFAULT_CATEGORIES.map((base, i) => {
        const rank = i + 1;
        const catFindings = mapped.filter(v => Number(v.owasp_rank) === rank || (v.owasp_category || '').includes(`A${String(rank).padStart(2, '0')}`));
        const severities = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        catFindings.forEach(f => {
          const s = (f.severity || 'INFO').toLowerCase();
          if (severities[s] !== undefined) severities[s]++;
        });
        return {
          ...base,
          name: CATEGORY_FALLBACK_NAMES[i],
          title: `A${String(rank).padStart(2, '0')}:2021 – ${CATEGORY_FALLBACK_NAMES[i]}`,
          count: catFindings.length,
          severities,
          findings: catFindings,
        };
      });
      setCategories(grouped);

      // Any findings without OWASP tags land in an "Other" bucket implicitly via table
    } catch (e) {
      console.error('Failed to load vulnerabilities', e);
      setVulnerabilities([]);
    } finally {
      setLoading(false);
    }
  }, [activeScanId]);

  useEffect(() => {
    loadVulns();
    let interval = null;
    if (isVulnScanRunning) {
      interval = setInterval(loadVulns, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeScanId, isVulnScanRunning, loadVulns]);

  // Derived stats
  const totalCount = vulnerabilities.length;
  const sevCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    vulnerabilities.forEach(v => { counts[v.severity] = (counts[v.severity] || 0) + 1; });
    return counts;
  }, [vulnerabilities]);

  const categorizedCount = categories.reduce((s, c) => s + c.count, 0);

  // Filters
  const filteredRows = useMemo(() => {
    return vulnerabilities.filter(v => {
      if (categoryFilter !== 'ALL' && Number(v.owasp_rank) !== Number(categoryFilter.replace('A', ''))) return false;
      if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false;
      return true;
    });
  }, [vulnerabilities, categoryFilter, severityFilter]);

  const exportCsv = () => {
    const header = 'OWASP Category,Title,CVE,CWE,Severity,CVSS,Affected Assets,Age,Source';
    const rows = filteredRows.map(r => {
      const cat = r.owasp_rank ? `A${String(r.owasp_rank).padStart(2, '0')}` : 'Uncategorized';
      return `"${cat}","${r.title}","${r.cve}","${r.cwe}","${r.severity}",${r.cvss},"${(r.affected_assets || []).join(', ')}","${r.age}","${r.source_tool}"`;
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'owasp_top10_vulnerabilities.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="global-page-container page-animate">
      <div className="global-max-width">
        <PageHeaderCard
          badgeText="OWASP TOP 10"
          title="Vulnerability Management"
          subtitle="OWASP Top 10 (2021) powered scanning — track, triage and remediate findings across your attack surface."
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

        {isVulnScanRunning && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            padding: '1rem', background: 'rgba(34, 211, 238, 0.1)',
            border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '8px',
            color: '#22D3EE', marginBottom: '1.5rem', fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
              <RefreshCw className="spin" size={18} />
              <span>OWASP Top 10 vulnerability scan running — findings appear below in real time.</span>
              {vulnerabilities.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgba(34,211,238,0.2)', padding: '0.1rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700' }}>
                  {vulnerabilities.length} found
                </span>
              )}
            </div>
            <div style={{ paddingLeft: '1.85rem', color: '#8AAED6' }}>
              <div><strong style={{ color: '#fff' }}>Current Step: </strong>
                <span style={{ background: 'rgba(34, 211, 238, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(34,211,238,0.4)', color: '#22D3EE', fontWeight: '600' }}>
                  {currentAttemptText}
                </span>
              </div>
              <div style={{ marginTop: '0.5rem', color: '#6B8CAE', fontSize: '0.8rem' }}>
                Scanning A01–A10 categories: Access Control, Crypto, Injection, Design, Misconfig, Components, Auth, Integrity, Logging & SSRF.
              </div>
            </div>
          </div>
        )}

        {/* ── Top stats ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.875rem', marginBottom: '1.5rem'
        }}>
          {[
            { label: 'Total Findings', value: totalCount, color: '#60A5FA', icon: <ShieldAlert size={18} /> },
            { label: 'Critical', value: sevCounts.CRITICAL, color: SEVERITY_COLORS.CRITICAL, icon: <AlertOctagon size={18} /> },
            { label: 'High', value: sevCounts.HIGH, color: SEVERITY_COLORS.HIGH, icon: <AlertTriangle size={18} /> },
            { label: 'Medium', value: sevCounts.MEDIUM, color: SEVERITY_COLORS.MEDIUM, icon: <Shield size={18} /> },
            { label: 'Low', value: sevCounts.LOW, color: SEVERITY_COLORS.LOW, icon: <Info size={18} /> },
            { label: 'OWASP Mapped', value: categorizedCount, color: '#A78BFA', icon: <Activity size={18} /> },
          ].map((s, i) => (
            <div key={i} className="vuln-card" style={{ padding: '1rem 1.25rem', borderTop: `2px solid ${s.color}` }}>
              <div className="vuln-top-row">
                <div className="vuln-icon-wrapper" style={{ background: `${s.color}1a`, border: `1px solid ${s.color}33` }}>
                  <span style={{ color: s.color }}>{s.icon}</span>
                </div>
                <span className="vuln-value" style={{ color: s.color, fontSize: '1.6rem' }}>{s.value}</span>
              </div>
              <span className="vuln-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Export row ── */}
        <div className="vuln-section-header" style={{ marginBottom: '1rem' }}>
          <Activity size={16} />
          <span>OWASP Top 10 (2021) Findings</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportCsv} disabled={totalCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' }}>
              <Download size={13} /> Export CSV
            </button>
          </span>
        </div>

        {/* ── Filter pills ── */}
        <div className="global-filter-row" style={{ marginBottom: '1rem' }}>
          <div className={`global-filter-pill ${categoryFilter === 'ALL' ? 'active' : ''}`} onClick={() => setCategoryFilter('ALL')}>
            <Filter size={12} /> All Categories
          </div>
          {categories.map(c => (
            <div key={c.id}
              className={`global-filter-pill ${categoryFilter === c.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === c.id ? 'ALL' : c.id)}>
              {c.id} ({c.count})
            </div>
          ))}
        </div>

        <div className="global-filter-row" style={{ marginBottom: '1.5rem' }}>
          <div className={`global-filter-pill ${severityFilter === 'ALL' ? 'active' : ''}`} onClick={() => setSeverityFilter('ALL')}>All Severities</div>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
            <div key={s} className={`global-filter-pill ${severityFilter === s ? 'active' : ''}`} onClick={() => setSeverityFilter(severityFilter === s ? 'ALL' : s)}>
              {s} ({sevCounts[s] || 0})
            </div>
          ))}
        </div>

        {/* ── Findings table (reuses the existing table) ── */}
        <VulnerabilitiesTable
          data={filteredRows}
          activeFilter={severityFilter === 'ALL' ? 'All' : severityFilter}
          setActiveFilter={(f) => setSeverityFilter(f === 'All' ? 'ALL' : f)}
          allData={vulnerabilities}
          loading={loading}
          showScanningState={showScanningState}
          isVulnScanRunning={isVulnScanRunning}
        />
      </div>
    </div>
  );
};

export default OWASPScannerUI;
