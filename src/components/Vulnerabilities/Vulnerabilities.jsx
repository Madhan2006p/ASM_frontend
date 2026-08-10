import React, { useState, useEffect } from 'react';
import VulnerabilitiesTable from './VulnerabilitiesTable';
import './Vulnerabilities.css';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { TrendingUp, ShieldAlert, Shield, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import OWASPScannerUI from './OWASPScannerUI';

const Vulnerabilities = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('asm'); // 'asm' or 'owasp'

  const activeScan = scansList?.find(s => s.id === Number(activeScanId));
  const isVulnScanRunning = activeScan && (activeScan.vuln_scan_phase === 'running' || activeScan.vuln_scan_phase?.startsWith('running_') || (activeScan.vuln_scan_phase && activeScan.vuln_scan_phase !== 'pending' && activeScan.vuln_scan_phase !== 'complete' && activeScan.status === 'running'));
  const showScanningState = activeScan && activeScan.vuln_scan_phase !== 'complete';

  let currentAttemptText = "Initializing...";
  let timeoutExplanation = "";
  if (activeScan?.vuln_scan_phase === 'running_nuclei') {
    currentAttemptText = "Phase 1: Nuclei Fast Scan";
    timeoutExplanation = "Sending thousands of optimized exploit payloads to discover misconfigurations, CVEs, and exposures. This phase is heavily optimized for speed.";
  } else if (activeScan?.vuln_scan_phase === 'running_wapiti') {
    currentAttemptText = "Phase 2: Wapiti Application Fuzzing (60s total)";
    timeoutExplanation = "Crawling the application and injecting SQL/XSS payloads into forms. This takes exactly 60 seconds.";
  } else if (activeScan?.vuln_scan_phase && activeScan.vuln_scan_phase.startsWith('phase_')) {
    // deep nuclei phase e.g. "phase_3_of_10_cnvd"
    const parts = activeScan.vuln_scan_phase.split('_');
    const phaseNum = parts[1];
    const total = parts[3];
    const phaseId = parts.slice(4).join('_');
    currentAttemptText = `Deep Scan Phase ${phaseNum}/${total}: ${phaseId.replace(/_/g, ' ')}`;
    timeoutExplanation = "Running nuclei templates across multiple vulnerability databases (CVE, CNVD, exposures, misconfigurations, IoT, DNS). New findings appear below as they are discovered.";
  }

  // Load vulnerabilities — polls every 5s while deep scan is running
  useEffect(() => {
    let mounted = true;
    let interval = null;

    const loadVulns = async () => {
      const targetScanId = activeScanId || (scansList && scansList.length > 0 ? scansList[0].id : null);
      if (!targetScanId) {
        setVulnerabilities([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/vulnerabilities/?scan=${targetScanId}`);
        if (!mounted) return;
        const list = Array.isArray(data) ? data : (data.results || []);
        
        const mapped = list.map(v => {
          const dateStr = v.discovered_at ? new Date(v.discovered_at).toLocaleDateString() : 'Recent';
          let cvss = 3.0;
          if (v.severity === 'CRITICAL') cvss = 9.5;
          else if (v.severity === 'HIGH') cvss = 8.0;
          else if (v.severity === 'MEDIUM') cvss = 5.5;

          return {
            id: v.id,
            title: v.finding || v.vulnerability_id || 'Security Vulnerability',
            cve: v.cve || '—',
            cwe: v.cwe || '—',
            description: v.description || 'No description provided.',
            remediation: v.remediation || 'No remediation provided.',
            reference: v.reference || '—',
            severity: v.severity || 'LOW',
            status: 'Open',
            cvss,
            affected_assets: v.affected_assets || [v.subdomain || v.domain || 'Target Scope'],
            age: dateStr,
            source_tool: v.source_tool || 'Nuclei',
            exploit: v.severity === 'CRITICAL' || v.severity === 'HIGH'
          };
        });

        mapped.sort((a, b) => b.cvss - a.cvss);
        if (mounted) setVulnerabilities(mapped);
      } catch (e) {
        console.error("Failed to load vulnerabilities", e);
        if (mounted) setVulnerabilities([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadVulns();

    // Auto-poll every 5s while scan is running (deep nuclei scan streams findings)
    if (isVulnScanRunning) {
      interval = setInterval(loadVulns, 5000);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeScanId, isVulnScanRunning, scansList]);

  const filteredData = vulnerabilities.filter(item => {
    if (activeFilter === 'All') return true;
    return item.severity === activeFilter.toUpperCase();
  });

  // Staggered local vuln stats calculation
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  vulnerabilities.forEach(v => {
    const sev = (v.severity || 'LOW').toLowerCase();
    if (counts[sev] !== undefined) counts[sev]++;
  });

  const localVulnStats = [
    { label: 'Critical Severity', value: counts.critical, bgClass: 'bg-red-light', colorClass: 'text-red', bar: 'bar-red', icon: <ShieldAlert size={16} /> },
    { label: 'High Severity', value: counts.high, bgClass: 'bg-orange-light', colorClass: 'text-orange', bar: 'bar-orange', icon: <AlertTriangle size={16} /> },
    { label: 'Medium Severity', value: counts.medium, bgClass: 'bg-yellow-light', colorClass: 'text-yellow', bar: 'bar-yellow', icon: <Shield size={16} /> },
    { label: 'Low Severity', value: counts.low, bgClass: 'bg-blue-light', colorClass: 'text-blue', bar: 'bar-blue', icon: <Info size={16} /> },
  ];

  if (activeTab === 'owasp') {
    return (
      <div className="global-page-container">
        <div className="global-max-width">
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('asm')} 
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
            >
              Attack Surface Vulnerabilities ({vulnerabilities.length})
            </button>
            <button 
              onClick={() => setActiveTab('owasp')} 
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
            >
              OWASP Top 10 Dynamic Scanner
            </button>
          </div>
          <OWASPScannerUI 
            activeScanId={activeScanId} 
            assignedDomains={assignedDomains} 
            selectedDomain={selectedDomain} 
            setSelectedDomain={setSelectedDomain} 
            scansList={scansList} 
            handleSelectScan={handleSelectScan} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        
        <PageHeaderCard 
          badgeText="SECURITY"
          title="Vulnerability Management"
          subtitle="Track, triage and remediate findings across your attack surface."
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem' }}>
          <button 
            onClick={() => setActiveTab('asm')} 
            style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
          >
            Attack Surface Vulnerabilities ({vulnerabilities.length})
          </button>
          <button 
            onClick={() => setActiveTab('owasp')} 
            style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
          >
            OWASP Top 10 Dynamic Scanner
          </button>
        </div>

        <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
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
              <span>Vulnerability scanning is currently running — findings appear below in real time.</span>
              {vulnerabilities.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgba(34,211,238,0.2)', padding: '0.1rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700' }}>
                  {vulnerabilities.length} found
                </span>
              )}
            </div>
            <div style={{ paddingLeft: '1.85rem', color: '#8AAED6' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ color: '#fff' }}>Current Step: </strong> 
                <span style={{ background: 'rgba(34, 211, 238, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(34,211,238,0.4)', color: '#22D3EE', fontWeight: '600' }}>
                  {currentAttemptText}
                </span>
              </div>
              <div><strong>What's happening?</strong> {timeoutExplanation}</div>
              <div style={{ marginTop: '0.5rem', color: '#6B8CAE', fontSize: '0.8rem' }}>
                Auto-refreshing every 5 seconds. Scan can run up to 5 days across 10 template categories.
              </div>
            </div>
          </div>
        )}

        {/* Vulnerability Breakdown */}
        <div className="vuln-breakdown-section">
          <div className="vuln-section-header">
            <TrendingUp size={16} />
            <span>Vulnerability Breakdown</span>
          </div>
          <div className="vuln-stats-grid">
            {localVulnStats.map((vuln, idx) => (
              <div key={idx} className={`vuln-card ${vuln.bgClass}`}>
                <div className="vuln-top-row">
                  <div className="vuln-icon-wrapper" style={{ padding: '0.25rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>{vuln.icon}</div>
                  <span className={`vuln-value ${vuln.colorClass}`}>{vuln.value}</span>
                </div>
                <span className="vuln-label">{vuln.label}</span>
                <div className="vuln-progress-bar">
                  <div className={`vuln-progress-fill ${vuln.bar}`} style={{ width: vulnerabilities.length > 0 ? `${(vuln.value / vulnerabilities.length) * 100}%` : '0%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <VulnerabilitiesTable
          data={filteredData}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          allData={vulnerabilities}
          loading={loading}
          showScanningState={showScanningState}
          isVulnScanRunning={isVulnScanRunning}
        />
      </div>
    </div>
  );
};

export default Vulnerabilities;
