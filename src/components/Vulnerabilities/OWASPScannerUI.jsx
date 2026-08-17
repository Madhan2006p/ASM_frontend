import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw, Activity,
} from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import VulnerabilitiesTable from './VulnerabilitiesTable';

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
  const [loading, setLoading] = useState(false);

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
    try {
      setLoading(true);
      const ep = activeScanId
        ? `/api/attacksurface/vulnerabilities/?scan=${activeScanId}`
        : (selectedDomain ? `/api/attacksurface/vulnerabilities/?domain=${encodeURIComponent(selectedDomain)}` : `/api/attacksurface/vulnerabilities/`);
      const data = await api.get(ep);
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
        owasp_id: v.owasp_rank ? `A${String(v.owasp_rank).padStart(2, '0')}` : '',
        confidence: (typeof v.confidence === 'number') ? v.confidence : null,
        finding_status: v.finding_status || '',
        evidence: v.evidence || '',
        template_id: v.template_id || '',
        vulnerability_id: v.vulnerability_id || '',
        exploit: ['CRITICAL', 'HIGH'].includes((v.severity || '').toUpperCase()),
      }));

      mapped.sort((a, b) => b.cvss - a.cvss);
      setVulnerabilities(mapped);
    } catch (e) {
      console.error('Failed to load vulnerabilities', e);
      setVulnerabilities([]);
    } finally {
      setLoading(false);
    }
  }, [activeScanId, selectedDomain]);

  useEffect(() => {
    loadVulns();
    let interval = null;
    if (isVulnScanRunning) {
      interval = setInterval(loadVulns, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeScanId, isVulnScanRunning, loadVulns]);

  // No manual filters — show every finding for the selected scan
  const filteredRows = useMemo(() => vulnerabilities, [vulnerabilities]);

  return (
    <div className="global-page-container page-animate">
      <div className="global-max-width">
        <PageHeaderCard
          title="Vulnerability Management"
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

        {/* ── Findings header ── */}
        <div className="vuln-section-header" style={{ marginBottom: '1rem' }}>
          <Activity size={16} />
          <span>Vulnerability Findings</span>
        </div>

        {/* ── Findings table (reuses the existing table) ── */}
        <VulnerabilitiesTable
          data={filteredRows}
          loading={loading}
          showScanningState={showScanningState}
          isVulnScanRunning={isVulnScanRunning}
        />
      </div>
    </div>
  );
};

export default OWASPScannerUI;
