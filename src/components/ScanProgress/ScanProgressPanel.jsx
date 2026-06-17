import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import './ScanProgressPanel.css';

// Phase definitions mapped from AttackSurfaceScan model fields
const PHASES = [
  { key: 'init',           label: 'Initializing Scan',               field: null,              progressStart: 0,   progressEnd: 2    },
  { key: 'subdomains',     label: 'Subdomain Discovery',             field: 'subdomains_done', progressStart: 2,   progressEnd: 15   },
  { key: 'endpoints',      label: 'Live Host Probing & Endpoints',   field: 'endpoints_done',  progressStart: 15,  progressEnd: 30   },
  { key: 'ports',          label: 'Port Scanning (Nmap)',            field: 'ports_done',      progressStart: 30,  progressEnd: 45   },
  { key: 'directories',    label: 'Directory Enumeration',           field: 'directories_done',progressStart: 45,  progressEnd: 55   },
  { key: 'technologies',   label: 'Technology Fingerprinting',       field: 'technologies_done',progressStart: 55, progressEnd: 65   },
  { key: 'email',          label: 'Email Security (SPF/DMARC)',      field: 'email_done',      progressStart: 65,  progressEnd: 70   },
  { key: 'vuln_basic',     label: 'Basic Vulnerability Scan',        field: 'vuln_scan_phase', progressStart: 70,  progressEnd: 80,  phaseValue: 'basic' },
  { key: 'vuln_deep',      label: 'Deep Vulnerability Scan (Nuclei)',field: 'vuln_scan_phase', progressStart: 80,  progressEnd: 85,  phaseValue: 'complete' },
  { key: 'ssl',            label: 'SSL/TLS Certificate Audit',       field: 'ssl_done',        progressStart: 85,  progressEnd: 90   },
  { key: 'antimalware',    label: 'Anti-Malware & VirusTotal Check', field: 'malware_done',    progressStart: 90,  progressEnd: 100  },
];

const STATUS_ICONS = {
  pending:  <Clock size={12} className="spp-status-icon spp-pending" />,
  running:  <Loader2 size={12} className="spp-status-icon spp-running spin" />,
  done:     <CheckCircle2 size={12} className="spp-status-icon spp-done" />,
  failed:   <AlertCircle size={12} className="spp-status-icon spp-failed" />,
};

function getPhaseStatus(phase, scanData) {
  if (!scanData) return 'pending';
  const progress = scanData.progress || 0;

  if (progress >= phase.progressEnd) return 'done';

  if (phase.field === null) {
    return progress > 0 ? 'done' : (scanData.status === 'running' ? 'running' : 'pending');
  }

  if (phase.field === 'vuln_scan_phase') {
    if (scanData.vuln_scan_phase === phase.phaseValue) return 'running';
    if (phase.phaseValue === 'basic' && (scanData.vuln_scan_phase === 'basic' || scanData.vuln_scan_phase === 'complete')) return 'done';
    if (phase.phaseValue === 'complete' && scanData.vuln_scan_phase === 'complete') return 'running';
    // If vuln_scan_phase is 'deep' or some other value, basic is done
    if (phase.phaseValue === 'basic' && scanData.vuln_scan_phase && scanData.vuln_scan_phase !== 'pending') return 'done';
    return 'pending';
  }

  if (scanData[phase.field] === true) return 'done';
  if (progress >= phase.progressStart && scanData.status === 'running') return 'running';
  return 'pending';
}

function getCurrentPhaseLabel(scanData) {
  if (!scanData) return 'Waiting to start...';
  if (scanData.status === 'completed') return 'Scan completed successfully';
  if (scanData.status === 'failed') return 'Scan failed';

  const progress = scanData.progress || 0;
  for (const phase of PHASES) {
    if (progress >= phase.progressStart && progress < phase.progressEnd) {
      return phase.label;
    }
  }
  return 'Initializing...';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

const ScanProgressPanel = ({ activeScanId, scansList = [], fetchScans }) => {
  const [scanData, setScanData] = useState(null);
  const [log, setLog] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const logEndRef = useRef(null);

  // Find the active scan from scansList
  const activeScan = scansList.find(s => s.id === Number(activeScanId));
  const isRunning = activeScan?.status === 'running' || scanData?.status === 'running';

  // Fetch scan status periodically
  useEffect(() => {
    if (!activeScanId) {
      setScanData(null);
      return;
    }

    let mounted = true;
    const fetchStatus = async () => {
      try {
        const data = await api.get(`/api/attacksurface/scan/${activeScanId}/`);
        if (!mounted) return;
        setScanData(prev => {
          if (!prev) return data;

          // Detect phase changes and add log entries
          const phasesChanged = [];
          for (const phase of PHASES) {
            const oldStatus = getPhaseStatus(phase, prev);
            const newStatus = getPhaseStatus(phase, data);
            if (oldStatus !== 'done' && newStatus === 'done') {
              phasesChanged.push({ phase: phase.label, status: 'done', time: data.updated_at || new Date().toISOString() });
            }
          }

          // Detect when scan completes or fails
          const justCompleted = prev.status === 'running' && data.status === 'completed';
          const justFailed = prev.status === 'running' && data.status === 'failed';
          if (justCompleted) {
            phasesChanged.push({ phase: 'Scan completed successfully', status: 'done', time: data.updated_at || new Date().toISOString() });
            // Notify parent to refresh scans list
            if (fetchScans) fetchScans(true);
          }
          if (justFailed) {
            phasesChanged.push({ phase: 'Scan failed', status: 'failed', time: data.updated_at || new Date().toISOString() });
            if (fetchScans) fetchScans(true);
          }

          if (phasesChanged.length > 0) {
            setLog(prevLog => [...prevLog, ...phasesChanged]);
          }

          return data;
        });
      } catch (e) {
        // Ignore errors
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds while running
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeScanId]);

  // Add initial log entries when scan starts
  useEffect(() => {
    if (activeScan && activeScan.status === 'running' && log.length === 0) {
      setLog([
        { phase: 'Scan triggered', status: 'done', time: activeScan.created_at },
        { phase: `Target: ${activeScan.target}`, status: 'done', time: activeScan.created_at },
        { phase: 'Brand monitoring: suspicious domains, phishing & impersonation scans triggered', status: 'done', time: activeScan.created_at },
      ]);
    }
  }, [activeScan?.id, activeScan?.status]);

  // Scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const progress = scanData?.progress ?? activeScan?.progress ?? 0;
  const target = scanData?.target ?? activeScan?.target ?? '';

  // Guard: must be after all hooks to comply with Rules of Hooks
  if (!activeScanId) return null;
  if (!visible) return null;

  return (
    <div className={`spp-container ${collapsed ? 'spp-collapsed' : ''} ${isRunning ? 'spp-running-state' : ''}`}>
      {/* Header bar */}
      <div className="spp-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="spp-header-left">
          <Terminal size={14} className="spp-terminal-icon" />
          <span className="spp-title">
            {isRunning ? (
              <>
                <span className="spp-dot-pulse" />
                Scan Progress — {target}
              </>
            ) : scanData?.status === 'completed' ? (
              <>
                <CheckCircle2 size={13} className="spp-done-icon" />
                Scan Complete — {target}
              </>
            ) : scanData?.status === 'failed' ? (
              <>
                <AlertCircle size={13} className="spp-failed-icon" />
                Scan Failed — {target}
              </>
            ) : (
              <>
                <Clock size={13} className="spp-pending-icon" />
                Scan — {target}
              </>
            )}
          </span>
        </div>
        <div className="spp-header-right">
          {!isRunning && scanData?.status && (
            <span className={`spp-status-badge spp-status-${scanData.status}`}>
              {scanData.status}
            </span>
          )}
          <button
            className="spp-pin-btn"
            onClick={(e) => { e.stopPropagation(); }}
            title="Scan progress panel"
          >
            <span className="spp-pin-icon spp-pinned">⬡</span>
          </button>
          {!isRunning && (
            <button
              className="spp-close-btn"
              onClick={(e) => { e.stopPropagation(); setVisible(false); }}
              title="Dismiss"
            >
              <X size={12} />
            </button>
          )}
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Progress body */}
      {!collapsed && (
        <div className="spp-body">
          {/* Progress bar */}
          <div className="spp-progress-section">
            <div className="spp-progress-top">
              <span className="spp-current-phase">{getCurrentPhaseLabel(scanData || activeScan)}</span>
              <span className="spp-progress-pct">{progress}%</span>
            </div>
            <div className="spp-progress-track">
              <div
                className={`spp-progress-fill ${scanData?.status === 'failed' ? 'spp-progress-failed' : ''}`}
                style={{ width: `${progress}%` }}
              />
              {/* Phase markers on progress bar */}
              {PHASES.filter(p => p.progressEnd < 100).map((phase, i) => (
                <div
                  key={phase.key}
                  className={`spp-progress-marker ${getPhaseStatus(phase, scanData || activeScan) === 'done' ? 'spp-marker-done' : ''}`}
                  style={{ left: `${phase.progressEnd}%` }}
                  title={phase.label}
                />
              ))}
            </div>
            <div className="spp-progress-phases">
              {PHASES.filter(p => p.progressEnd % 25 === 0 || p.key === 'subdomains' || p.key === 'vuln_basic').map(phase => {
                const st = getPhaseStatus(phase, scanData || activeScan);
                return (
                  <span key={phase.key} className={`spp-phase-label ${st}`}>
                    {STATUS_ICONS[st]}
                    {phase.label.split('(')[0].trim()}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Terminal log */}
          <div className="spp-terminal">
            <div className="spp-terminal-header">
              <span className="spp-terminal-dot spp-terminal-dot-red" />
              <span className="spp-terminal-dot spp-terminal-dot-yellow" />
              <span className="spp-terminal-dot spp-terminal-dot-green" />
              <span className="spp-terminal-label">scan-log</span>
            </div>
            <div className="spp-terminal-body">
              {log.map((entry, i) => (
                <div key={i} className="spp-log-line">
                  <span className="spp-log-time">[{entry.time ? formatTime(entry.time) : formatTime(new Date().toISOString())}]</span>
                  <span className={`spp-log-status spp-log-${entry.status}`}>
                    {entry.status === 'done' ? '✓' : entry.status === 'failed' ? '✗' : '●'}
                  </span>
                  <span className="spp-log-msg">{entry.phase}</span>
                </div>
              ))}
              {isRunning && (
                <div className="spp-log-line spp-log-active">
                  <span className="spp-log-time">[{formatTime(new Date().toISOString())}]</span>
                  <Loader2 size={10} className="spp-log-spinner spin" />
                  <span className="spp-log-msg">{getCurrentPhaseLabel(scanData || activeScan)}...</span>
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanProgressPanel;
