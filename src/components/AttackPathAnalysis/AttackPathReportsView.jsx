import React, { useState } from 'react';
import { FileText, Download, Shield, CheckCircle2, Layers, GitMerge, FileSpreadsheet, Code } from 'lucide-react';
import { generateVaptReportHTML } from '../../utils/generateVaptReport';

const AttackPathReportsView = ({ analysisData, scanMeta, selectedDomain }) => {
  const { stats, attackPaths, criticalAssets, rawCounts, recommendations } = analysisData;
  const [reportType, setReportType] = useState('Executive');
  const [exportFormat, setExportFormat] = useState('PDF');

  /* Export PDF */
  const handleExportPDF = () => {
    const reportTitle = `${reportType} Attack Path Analysis Report`;
    const scope = selectedDomain || scanMeta?.target || 'Target Attack Surface';
    const reportDate = new Date().toISOString().split('T')[0];

    // Prepare findings data array for report engine
    const allFindings = attackPaths.map((ap, idx) => ({
      id: `ap-${idx + 1}`,
      source: 'web',
      source_label: 'Attack Path Correlation',
      title: `${ap.id}: ${ap.entryPoint} ➔ ${ap.targetAsset}`,
      severity: (ap.vulnerability?.severity || 'HIGH').toUpperCase(),
      description: `Path Risk Score: ${ap.riskScore}/100. Entry Point: ${ap.entryPoint}. Crown Jewel Target: ${ap.targetAsset}.`,
      remediation: ap.recommendation,
      cve: ap.vulnerability?.cve || '',
      cwe: '',
      cvss: ap.riskScore / 10,
      asset: ap.host || scope,
      tool: 'Attack Path Engine',
      category: 'Attack Chain Exposure',
      discovered_at: ap.lastUpdated,
    }));

    const countBySev = {
      CRITICAL: attackPaths.filter(p => p.riskScore >= 85).length,
      HIGH: attackPaths.filter(p => p.riskScore >= 65 && p.riskScore < 85).length,
      MEDIUM: attackPaths.filter(p => p.riskScore >= 40 && p.riskScore < 65).length,
      LOW: attackPaths.filter(p => p.riskScore < 40).length,
    };

    const html = generateVaptReportHTML({
      reportTitle,
      orgName: 'Enterprise Security Operations',
      assessorName: 'Attack Path Analysis Engine',
      reportDate,
      scope,
      methodology: 'Automated Attack Surface Management correlation connecting subdomains, open ports, technologies, and vulnerabilities to map realistic attacker entry vectors.',
      logoDataUrl: null,
      allFindings,
      webVulns: [],
      mobileFindings: [],
      mobileScans: [],
      countBySev,
      totalFindings: attackPaths.length,
      riskScore: stats.overallAttackPathScore / 10,
      riskLbl: stats.overallAttackPathScore >= 80 ? 'CRITICAL' : 'HIGH',
      riskCol: stats.overallAttackPathScore >= 80 ? '#ef4444' : '#f97316',
    });

    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups for this site to export the PDF report.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 1200);
  };

  /* Export CSV */
  const handleExportCSV = () => {
    const headers = ['Attack Path ID', 'Entry Point', 'Target Asset', 'Length', 'Risk Score', 'Probability', 'Business Impact', 'Status'];
    const rows = attackPaths.map(p => [
      p.id,
      `"${p.entryPoint}"`,
      `"${p.targetAsset}"`,
      p.attackLength,
      p.riskScore,
      p.probability,
      p.businessImpact,
      p.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attack-path-summary-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* Export JSON */
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analysisData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `attack-path-analysis-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExport = () => {
    if (exportFormat === 'PDF') handleExportPDF();
    else if (exportFormat === 'CSV') handleExportCSV();
    else if (exportFormat === 'JSON') handleExportJSON();
  };

  return (
    <div className="apa-reports-container">
      <div className="vapt-section-title">
        <FileText size={18} className="vapt-section-icon" />
        <h2>Attack Path Analysis Reports</h2>
      </div>

      <p className="narrative">
        Generate executive briefings, technical path listings, or export raw graph structures for SIEM/SOAR integration.
      </p>

      {/* ── Report Generation Options Card ──────────────────── */}
      <div className="card apa-card">
        <div className="vapt-settings-grid">
          <div className="vapt-field">
            <label>Report Type</label>
            <select className="vapt-scan-select" value={reportType} onChange={e => setReportType(e.target.value)} style={{ width: '100%' }}>
              <option value="Executive">Executive Briefing Report</option>
              <option value="Technical">Technical Attack Path Analysis</option>
              <option value="Graph Summary">Attack Graph & Topology Summary</option>
              <option value="Critical Asset">Crown Jewels Risk Report</option>
            </select>
          </div>

          <div className="vapt-field">
            <label>Export Format</label>
            <select className="vapt-scan-select" value={exportFormat} onChange={e => setExportFormat(e.target.value)} style={{ width: '100%' }}>
              <option value="PDF">PDF Document (.pdf)</option>
              <option value="CSV">Comma Separated Values (.csv)</option>
              <option value="JSON">Structured JSON (.json)</option>
            </select>
          </div>

          <div className="vapt-field vapt-field-full">
            <button className="vapt-btn vapt-btn-primary" onClick={handleExport} style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
              <Download size={16} /> Generate &amp; Download {reportType} Report ({exportFormat})
            </button>
          </div>
        </div>
      </div>

      {/* ── Preset Report Quick Cards ──────────────────────── */}
      <div className="apa-report-cards-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card apa-card">
          <div className="apa-card-header">
            <div className="apa-card-title">
              <FileText size={18} style={{ color: '#3b82f6' }} />
              <h3>Executive Report (PDF)</h3>
            </div>
          </div>
          <p className="vapt-finding-text">
            High-level overview of critical attack paths, business risk scores, and priority remediation roadmap for C-suite and security leadership.
          </p>
          <button className="vapt-btn vapt-btn-ghost" onClick={handleExportPDF} style={{ marginTop: '0.75rem' }}>
            <Download size={14} /> Download PDF
          </button>
        </div>

        <div className="card apa-card">
          <div className="apa-card-header">
            <div className="apa-card-title">
              <FileSpreadsheet size={18} style={{ color: '#22c55e' }} />
              <h3>Attack Path CSV Export</h3>
            </div>
          </div>
          <p className="vapt-finding-text">
            Tabular dataset of all correlated attack paths, entry points, target assets, risk scores, and status for spreadsheet analysis.
          </p>
          <button className="vapt-btn vapt-btn-ghost" onClick={handleExportCSV} style={{ marginTop: '0.75rem' }}>
            <Download size={14} /> Download CSV
          </button>
        </div>

        <div className="card apa-card">
          <div className="apa-card-header">
            <div className="apa-card-title">
              <Code size={18} style={{ color: '#8b5cf6' }} />
              <h3>Graph Topology Data (JSON)</h3>
            </div>
          </div>
          <p className="vapt-finding-text">
            Structured JSON graph object containing node links, stage relationships, MITRE mappings, and risk metrics for custom tooling.
          </p>
          <button className="vapt-btn vapt-btn-ghost" onClick={handleExportJSON} style={{ marginTop: '0.75rem' }}>
            <Download size={14} /> Download JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttackPathReportsView;
