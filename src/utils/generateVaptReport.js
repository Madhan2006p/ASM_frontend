/**
 * generateVaptReport.js
 * Builds a fully self-contained, professionally styled VAPT report HTML string.
 * Open with window.open() + document.write() then trigger print.
 */

const SEV_COLORS_PRINT = {
  CRITICAL: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
  HIGH:     { bg: '#ffedd5', fg: '#9a3412', border: '#fdba74', dot: '#f97316' },
  MEDIUM:   { bg: '#fef9c3', fg: '#713f12', border: '#fde047', dot: '#eab308' },
  LOW:      { bg: '#dcfce7', fg: '#14532d', border: '#86efac', dot: '#22c55e' },
  INFO:     { bg: '#dbeafe', fg: '#1e3a8a', border: '#93c5fd', dot: '#3b82f6' },
  WARNING:  { bg: '#fef9c3', fg: '#713f12', border: '#fde047', dot: '#eab308' },
};
const getSC = (s) => SEV_COLORS_PRINT[(s||'').toUpperCase()] || SEV_COLORS_PRINT.INFO;

const SEV_CVSS_MAP = { CRITICAL:9.5, HIGH:7.5, MEDIUM:5.0, LOW:2.5, INFO:0.5, WARNING:5.0 };
const cvssOf = (sev, raw) => raw ? parseFloat(raw) : (SEV_CVSS_MAP[(sev||'').toUpperCase()] || 0);

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return d; }
};

const escapeHtml = (str) => String(str||'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ── Severity badge HTML ─────────────────────────────────────── */
const badgeHtml = (sev) => {
  const c = getSC(sev);
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:7.5pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:${c.bg};color:${c.fg};border:1px solid ${c.border}">${escapeHtml(sev||'INFO')}</span>`;
};

/* ── CVSS circle ─────────────────────────────────────────────── */
const cvssCircle = (score, sev) => {
  const c = getSC(sev);
  const pct = Math.min(score/10, 1);
  const r = 14, cx = 16, cy = 16;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return `<svg width="32" height="32" viewBox="0 0 32 32" style="overflow:visible">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="3.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.dot}" stroke-width="3.5"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="8" font-weight="800" fill="${c.fg}">${score.toFixed(1)}</text>
  </svg>`;
};

/* ── Risk gauge SVG ──────────────────────────────────────────── */
const riskGauge = (score, color) => {
  const pct = score / 10;
  const arc = pct * 180;  // degrees
  const r = 70, cx = 90, cy = 80;
  const toRad = (deg) => (deg - 180) * Math.PI / 180;
  const endAngle = -180 + arc;
  const endX = cx + r * Math.cos(toRad(endAngle + 180));
  const endY = cy + r * Math.sin(toRad(endAngle + 180));
  // Simple arc via stroke-dasharray (half circle = 180deg arc = ~220px for r=70)
  const half = Math.PI * r; // semicircle circumference
  const filled = pct * half;
  return `<svg width="180" height="100" viewBox="0 0 180 100">
    <path d="M20,80 A70,70 0 0,1 160,80" fill="none" stroke="#e5e7eb" stroke-width="14" stroke-linecap="round"/>
    <path d="M20,80 A70,70 0 0,1 160,80" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${filled} ${half}"/>
    <text x="90" y="74" text-anchor="middle" font-size="24" font-weight="900" fill="${color}">${score}</text>
    <text x="90" y="92" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">/10</text>
  </svg>`;
};

/* ── Main export function ────────────────────────────────────── */
export function generateVaptReportHTML({
  reportTitle, orgName, assessorName, reportDate, scope, methodology,
  logoDataUrl, allFindings, webVulns, mobileFindings, mobileScans,
  countBySev, totalFindings, riskScore, riskLbl, riskCol,
}) {
  const getHeaderHtml = (sectionTitle) => `
<div class="page-header">
  <div class="header-brand" style="display:flex;align-items:center;gap:6px">
    <span class="provider-name" style="color:#1e40af;font-weight:900;letter-spacing:0.08em">HACKERS INFOTECH</span>
    <span class="header-divider" style="color:#94a3b8">|</span>
    <span class="section-name" style="color:#334155;text-transform:uppercase;font-weight:700">${escapeHtml(sectionTitle)}</span>
  </div>
  <div class="header-target" style="color:#64748b;font-size:7pt">
    Target Org: <strong style="color:#0f172a">${escapeHtml(orgName || scope || 'Target Organization')}</strong>
  </div>
</div>`;

  const sevKeys = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'];
  const fDate = fmtDate(reportDate);

  /* ── Cover page ──────────────────────────────────────────── */
  const coverPage = `
<div class="page cover-page">
  <div class="cover-bg-accent"></div>
  <div class="cover-inner">
    <div class="cover-top" style="display:flex;justify-content:space-between;align-items:center">
      <div class="cover-logo-wrap" style="display:flex;align-items:center;gap:12px">
        ${logoDataUrl
          ? `<img src="${logoDataUrl}" alt="Logo" style="max-height:55px;max-width:160px;object-fit:contain;border-radius:4px"/>`
          : `<div class="cover-shield" style="font-size:20pt">🎯</div>`}
        <div style="display:flex;flex-direction:column">
          <span style="font-size:14pt;font-weight:900;color:#0f172a;letter-spacing:-0.02em">${escapeHtml(orgName || scope || 'Target Organization')}</span>
          <span style="font-size:7.5pt;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:0.08em">Target Organization</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="display:flex;flex-direction:column;text-align:right">
          <span style="font-size:13pt;font-weight:900;color:#1e40af;letter-spacing:-0.02em">HACKERS INFOTECH</span>
          <span style="font-size:7pt;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.08em">Assessment Provider</span>
        </div>
        <div class="cover-confidential" style="margin-left:8px">CONFIDENTIAL</div>
      </div>
    </div>

    <div class="cover-center">
      <div class="cover-label">VULNERABILITY ASSESSMENT &amp; PENETRATION TEST</div>
      <h1 class="cover-title">${escapeHtml(reportTitle)}</h1>
      ${orgName ? `<p class="cover-org">Prepared for: <strong>${escapeHtml(orgName)}</strong></p>` : ''}
    </div>

    <div class="cover-meta-box">
      <table class="cover-meta-table">
        <tr>
          <td class="cm-label">📅 Report Date</td>
          <td class="cm-value">${fDate}</td>
          <td class="cm-label">🎯 Scope</td>
          <td class="cm-value">${escapeHtml(scope || 'Full Assessment')}</td>
        </tr>
        <tr>
          <td class="cm-label">👤 Assessor</td>
          <td class="cm-value">${escapeHtml(assessorName || 'Security Team')}</td>
          <td class="cm-label">⚠️ Overall Risk</td>
          <td class="cm-value" style="color:${riskCol};font-weight:900">${riskLbl} (${riskScore}/10)</td>
        </tr>
        <tr>
          <td class="cm-label">🔍 Total Findings</td>
          <td class="cm-value">${totalFindings}</td>
          <td class="cm-label">🚨 Critical / High</td>
          <td class="cm-value" style="color:#dc2626;font-weight:900">${(countBySev.CRITICAL||0) + (countBySev.HIGH||0)}</td>
        </tr>
      </table>
    </div>

    <div class="cover-sev-strip">
      ${sevKeys.map(s => {
        const c = getSC(s);
        return `<div class="cover-sev-item" style="border-top:4px solid ${c.dot}">
          <div class="cover-sev-num" style="color:${c.fg}">${countBySev[s]||0}</div>
          <div class="cover-sev-lbl">${s}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="cover-disclaimer">
      This report contains confidential and proprietary information. It is intended solely for the named organisation.
      Unauthorised disclosure, copying, distribution or use is strictly prohibited.
      Classification: <strong>CONFIDENTIAL — RESTRICTED</strong>
    </div>
  </div>
</div>`;

  /* ── Table of Contents ───────────────────────────────────── */
  const tocPage = `
<div class="page">
  ${getHeaderHtml('Table of Contents')}
  <h2 class="section-heading" style="margin-top:0">Table of Contents</h2>
  <table class="toc-table">
    <tr><td class="toc-num">1.</td><td class="toc-title">Executive Summary</td><td class="toc-dots"></td></tr>
    <tr><td class="toc-num">2.</td><td class="toc-title">Scope &amp; Methodology</td><td class="toc-dots"></td></tr>
    <tr><td class="toc-num">3.</td><td class="toc-title">Risk Overview &amp; Severity Distribution</td><td class="toc-dots"></td></tr>
    <tr><td class="toc-num">4.</td><td class="toc-title">Detailed Findings (${totalFindings} findings)</td><td class="toc-dots"></td></tr>
    ${mobileScans.length > 0 ? `<tr><td class="toc-num">5.</td><td class="toc-title">Mobile Application Security</td><td class="toc-dots"></td></tr>` : ''}
    <tr><td class="toc-num">${mobileScans.length > 0 ? '6' : '5'}.</td><td class="toc-title">Remediation Roadmap</td><td class="toc-dots"></td></tr>
    <tr><td class="toc-num">${mobileScans.length > 0 ? '7' : '6'}.</td><td class="toc-title">General Security Recommendations</td><td class="toc-dots"></td></tr>
  </table>
  <div class="toc-note">
    <strong>Classification:</strong> CONFIDENTIAL &nbsp;|&nbsp;
    <strong>Date:</strong> ${fDate} &nbsp;|&nbsp;
    <strong>Version:</strong> 1.0
  </div>
</div>`;

  /* ── Executive Summary ───────────────────────────────────── */
  const execPage = `
<div class="page">
  ${getHeaderHtml('1. Executive Summary')}
  <h2 class="section-heading">1. Executive Summary</h2>

  <p class="narrative">
    This Vulnerability Assessment and Penetration Test (VAPT) was conducted against
    <strong>${escapeHtml(scope || 'the target environment')}</strong> on
    <strong>${fDate}</strong>${assessorName ? ` by <strong>${escapeHtml(assessorName)}</strong>` : ''}.
    The assessment identified a total of <strong>${totalFindings}</strong> security findings
    across web application and mobile attack surfaces.
    ${(countBySev.CRITICAL||0) > 0
      ? `<strong style="color:#dc2626">${countBySev.CRITICAL} Critical</strong> and `
      : ''}
    ${(countBySev.HIGH||0) > 0
      ? `<strong style="color:#ea580c">${countBySev.HIGH} High</strong> severity findings require immediate attention.`
      : totalFindings === 0 ? 'No vulnerabilities were identified during this assessment.' : ''}
  </p>

  <div class="exec-grid">
    <!-- Risk Score -->
    <div class="exec-card">
      <div class="exec-card-title">Overall Risk Score</div>
      <div style="text-align:center;padding:8px 0">
        ${riskGauge(riskScore, riskCol)}
        <div style="font-size:13pt;font-weight:900;color:${riskCol};margin-top:4px">${riskLbl} RISK</div>
      </div>
    </div>

    <!-- Severity distribution -->
    <div class="exec-card" style="grid-column:span 2">
      <div class="exec-card-title">Finding Distribution by Severity</div>
      <table class="sev-dist-table">
        <thead><tr>
          <th>Severity</th><th>Count</th><th>Percentage</th><th style="width:40%">Distribution</th>
        </tr></thead>
        <tbody>
          ${sevKeys.map(sev => {
            const c = getSC(sev);
            const cnt = countBySev[sev] || 0;
            const pct = totalFindings > 0 ? ((cnt/totalFindings)*100).toFixed(1) : '0.0';
            const barW = totalFindings > 0 ? Math.round((cnt/totalFindings)*100) : 0;
            return `<tr>
              <td><span class="sev-dot" style="background:${c.dot}"></span><strong>${sev}</strong></td>
              <td style="text-align:center;font-weight:900;color:${c.fg};font-size:11pt">${cnt}</td>
              <td style="text-align:center;color:#64748b">${pct}%</td>
              <td><div class="dist-bar"><div class="dist-fill" style="width:${barW}%;background:${c.dot}"></div></div></td>
            </tr>`;
          }).join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td style="text-align:center;font-weight:900;font-size:11pt">${totalFindings}</td>
            <td style="text-align:center">100%</td><td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Key findings callouts -->
  ${(countBySev.CRITICAL||0) > 0 ? `
  <div class="callout callout-critical">
    <div class="callout-icon">🚨</div>
    <div><strong>${countBySev.CRITICAL} Critical Severity Finding${(countBySev.CRITICAL)>1?'s':''}</strong> — Immediate action required.
    Critical vulnerabilities pose a direct and immediate risk of complete system compromise, data breach, or service disruption.
    These must be remediated within <strong>24–48 hours</strong>.</div>
  </div>` : ''}
  ${(countBySev.HIGH||0) > 0 ? `
  <div class="callout callout-high">
    <div class="callout-icon">⚠️</div>
    <div><strong>${countBySev.HIGH} High Severity Finding${(countBySev.HIGH)>1?'s':''}</strong> — Address within 7–14 days.
    High severity issues represent significant vulnerabilities that are highly exploitable and could lead to substantial impact if left unaddressed.</div>
  </div>` : ''}
  ${totalFindings === 0 ? `
  <div class="callout callout-good">
    <div class="callout-icon">✅</div>
    <div><strong>No vulnerabilities identified.</strong> The target environment appears well-secured based on the automated scan coverage conducted during this assessment.</div>
  </div>` : ''}

  <!-- Web vs Mobile breakdown -->
  <div class="two-col" style="margin-top:16px">
    <div class="info-box">
      <div class="info-box-title">🌐 Web / ASM Findings</div>
      <div class="info-box-num">${webVulns.length}</div>
      <div class="info-box-sub">across ${[...new Set(webVulns.map(v=>v.subdomain||v.domain||scope).filter(Boolean))].length || 1} asset(s)</div>
    </div>
    <div class="info-box">
      <div class="info-box-title">📱 Mobile App Findings</div>
      <div class="info-box-num">${mobileFindings.length}</div>
      <div class="info-box-sub">across ${mobileScans.filter(s=>s.status==='completed').length} app(s) audited</div>
    </div>
  </div>
</div>`;

  /* ── Scope & Methodology ─────────────────────────────────── */
  const scopePage = `
<div class="page">
  ${getHeaderHtml('2. Scope & Methodology')}
  <h2 class="section-heading">2. Scope &amp; Methodology</h2>

  <div class="two-col">
    <div>
      <h3 class="sub-heading">🌐 Web Application Scope</h3>
      <table class="meta-table">
        <tr><td>Target Domain</td><td><code>${escapeHtml(scope||'N/A')}</code></td></tr>
        <tr><td>Total Web Findings</td><td><strong>${webVulns.length}</strong></td></tr>
        <tr><td>Assessment Engine</td><td>Enterprise ASM & VAPT Engine</td></tr>
        <tr><td>Assessment Type</td><td>Automated + Manual Verification</td></tr>
        <tr><td>Classification</td><td>Black-box / Grey-box</td></tr>
      </table>
    </div>
    <div>
      <h3 class="sub-heading">📱 Mobile VAPT Scope</h3>
      <table class="meta-table">
        <tr><td>Apps Audited</td><td><strong>${mobileScans.filter(s=>s.status==='completed').length}</strong></td></tr>
        <tr><td>Mobile Findings</td><td><strong>${mobileFindings.length}</strong></td></tr>
        <tr><td>Analysis Engine</td><td>Mobile Security Analyzer</td></tr>
        <tr><td>Analysis Type</td><td>SAST / DAST</td></tr>
        <tr><td>Platforms</td><td>${[
          mobileScans.some(s=>s.source==='android') && 'Android (APK/AAB)',
          mobileScans.some(s=>s.source==='ios') && 'iOS (IPA)',
        ].filter(Boolean).join(', ') || '—'}</td></tr>
      </table>
    </div>
  </div>

  <h3 class="sub-heading" style="margin-top:18px">🔬 Testing Methodology</h3>
  <p class="narrative">${escapeHtml(methodology)}</p>

  <div class="phases-grid">
    ${[
      { icon:'🔍', phase:'Phase 1: Reconnaissance',        desc:'Subdomain enumeration, DNS reconnaissance, port scanning, service fingerprinting, and attack surface mapping using passive OSINT and active discovery techniques.' },
      { icon:'🕵️', phase:'Phase 2: Vulnerability Discovery', desc:'Automated vulnerability signature scanning, web application fuzzing, SSL/TLS security analysis, and endpoint mapping.' },
      { icon:'📱', phase:'Phase 3: Mobile Analysis',        desc:'Static (SAST) and dynamic (DAST) analysis of Android/iOS application binaries to identify insecure coding patterns, permission misuse, hardcoded secrets, and API flaws.' },
      { icon:'⚡', phase:'Phase 4: Exploitation & Validation', desc:'Manual verification of identified vulnerabilities to eliminate false positives, determine exploitability, and assess true business impact.' },
      { icon:'📊', phase:'Phase 5: Risk Assessment',        desc:'All findings classified by severity (Critical/High/Medium/Low/Info) using CVSS v3.1 scoring and mapped to OWASP Top 10, CWE, and CVE identifiers.' },
      { icon:'📝', phase:'Phase 6: Reporting',              desc:'Comprehensive report with detailed findings, proof-of-concept evidence, business impact analysis, and actionable remediation guidance.' },
    ].map(p => `
      <div class="phase-card">
        <div class="phase-icon">${p.icon}</div>
        <div><strong>${escapeHtml(p.phase)}</strong><p style="margin:4px 0 0;font-size:8.5pt;color:#475569;line-height:1.5">${escapeHtml(p.desc)}</p></div>
      </div>`).join('')}
  </div>
</div>`;

  /* ── Findings summary table (overview before detail) ──────── */
  const findingsSummaryPage = `
<div class="page">
  ${getHeaderHtml('3. Findings Summary')}
  <h2 class="section-heading">3. Findings Summary</h2>
  <p class="narrative">
    The following table provides a consolidated summary of all <strong>${totalFindings}</strong> security findings identified during this assessment.
    Findings are ordered by severity from most critical to least critical.
  </p>
  <table class="findings-summary-table">
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Finding Title</th>
        <th style="width:80px">Severity</th>
        <th style="width:44px">CVSS</th>
        <th style="width:70px">Source</th>
        <th>Asset / Target</th>
        <th style="width:100px">CVE / CWE</th>
      </tr>
    </thead>
    <tbody>
      ${allFindings.map((f, idx) => {
        const c = getSC(f.severity);
        const cvss = cvssOf(f.severity, f.cvss);
        return `<tr>
          <td class="td-num">${idx+1}</td>
          <td class="td-title">${escapeHtml(f.title)}</td>
          <td>${badgeHtml(f.severity)}</td>
          <td class="td-cvss" style="color:${c.fg};font-weight:800">${cvss.toFixed(1)}</td>
          <td style="font-size:7.5pt">${f.source==='mobile'?'📱 Mobile':'🌐 Web'}</td>
          <td class="td-asset"><code>${escapeHtml(f.asset||'—')}</code></td>
          <td class="td-cve">${escapeHtml([f.cve, f.cwe].filter(Boolean).join(' / ')||'—')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;

  /* ── Detailed Findings ───────────────────────────────────── */
  const findingPages = allFindings.map((f, idx) => {
    const c = getSC(f.severity);
    const cvss = cvssOf(f.severity, f.cvss);
    const cvssLabel = cvss >= 9 ? 'Critical' : cvss >= 7 ? 'High' : cvss >= 4 ? 'Medium' : cvss >= 0.1 ? 'Low' : 'Informational';
    return `
<div class="finding-block">
  <div class="finding-header" style="border-left:5px solid ${c.dot};background:${c.bg}">
    <div class="finding-header-top">
      <span class="finding-num" style="color:${c.fg}">FINDING ${String(idx+1).padStart(3,'0')}</span>
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <span class="finding-title-h">${escapeHtml(f.title)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${badgeHtml(f.severity)}
        <div style="display:flex;align-items:center;gap:4px">
          ${cvssCircle(cvss, f.severity)}
          <span style="font-size:8pt;color:#64748b">CVSS ${cvssLabel}</span>
        </div>
      </div>
    </div>
    <div class="finding-header-meta">
      ${f.cve ? `<span class="meta-tag" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5">CVE: ${escapeHtml(f.cve)}</span>` : ''}
      ${f.cwe ? `<span class="meta-tag" style="background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe">CWE: ${escapeHtml(f.cwe)}</span>` : ''}
      ${f.category ? `<span class="meta-tag">Category: ${escapeHtml(f.category)}</span>` : ''}
      <span class="meta-tag">${f.source==='mobile'?'📱':'🌐'} ${escapeHtml(f.source_label||f.source)}</span>
      ${f.asset ? `<span class="meta-tag">🎯 ${escapeHtml(f.asset)}</span>` : ''}
      ${f.discovered_at ? `<span class="meta-tag">📅 ${new Date(f.discovered_at).toLocaleDateString()}</span>` : ''}
    </div>
  </div>

  <div class="finding-body">
    <div class="finding-two-col">
      ${f.description ? `
      <div class="finding-section">
        <div class="finding-section-label">📋 Description</div>
        <p class="finding-text">${escapeHtml(f.description)}</p>
      </div>` : ''}
      ${f.remediation ? `
      <div class="finding-section" style="border-left:3px solid #22c55e;background:#f0fdf4">
        <div class="finding-section-label" style="color:#15803d">✅ Remediation</div>
        <p class="finding-text" style="color:#166534">${escapeHtml(f.remediation)}</p>
      </div>` : ''}
    </div>

    <div class="finding-attrs">
      <div class="attr-item"><span class="attr-label">CVSS Score</span><span class="attr-value" style="color:${c.fg};font-weight:800">${cvss.toFixed(1)} / 10.0 (${cvssLabel})</span></div>
      ${f.cve ? `<div class="attr-item"><span class="attr-label">CVE ID</span><span class="attr-value"><code>${escapeHtml(f.cve)}</code></span></div>` : ''}
      ${f.cwe ? `<div class="attr-item"><span class="attr-label">CWE ID</span><span class="attr-value"><code>${escapeHtml(f.cwe)}</code></span></div>` : ''}
      <div class="attr-item"><span class="attr-label">Affected Asset</span><span class="attr-value"><code>${escapeHtml(f.asset||'—')}</code></span></div>
      ${f.category ? `<div class="attr-item"><span class="attr-label">Category</span><span class="attr-value">${escapeHtml(f.category)}</span></div>` : ''}
    </div>
  </div>
</div>`;
  }).join('');

  const detailedFindingsPage = `
<div class="page">
  ${getHeaderHtml('4. Detailed Findings')}
  <h2 class="section-heading">4. Detailed Findings</h2>
  <p class="narrative">
    This section provides a detailed analysis of each security finding identified during the assessment.
    ${totalFindings === 0 ? '<strong>No vulnerabilities were identified.</strong>' : `All ${totalFindings} findings are documented below with descriptions, impact analysis, and remediation guidance.`}
  </p>
  ${findingPages}
</div>`;

  /* ── Mobile VAPT section ─────────────────────────────────── */
  const mobilePage = mobileScans.length > 0 ? `
<div class="page">
  ${getHeaderHtml('5. Mobile Application Security')}
  <h2 class="section-heading">5. Mobile Application Security</h2>
  <p class="narrative">
    Mobile application security analysis was performed using MobSF (Mobile Security Framework),
    conducting both static (SAST) and dynamic (DAST) analysis of the submitted application binaries.
  </p>
  ${mobileScans.filter(s=>s.status==='completed').map(scan => {
    const scanFindings = mobileFindings.filter(f=>f.scan_id===scan.id);
    const scanCounts = scanFindings.reduce((a,f)=>{ a[(f.severity||'LOW').toUpperCase()]=(a[(f.severity||'LOW').toUpperCase()]||0)+1; return a;},{});
    const score = parseInt(scan.score||50);
    const scoreColor = score>=80?'#15803d':score>=50?'#c2410c':'#991b1b';
    const scoreBg = score>=80?'#dcfce7':score>=50?'#ffedd5':'#fee2e2';
    return `
    <div class="mobile-card">
      <div class="mobile-card-header">
        <div>
          <div class="mobile-platform">${scan.source==='ios'?'🍏 iOS Application':'🤖 Android Application'}</div>
          <h3 class="mobile-app-name">${escapeHtml(scan.app_name||scan.file_name||'Unknown App')}</h3>
          ${scan.package_name ? `<div class="mobile-pkg"><code>${escapeHtml(scan.package_name)}</code></div>` : ''}
        </div>
        <div class="mobile-score" style="background:${scoreBg};color:${scoreColor}">
          <div class="mobile-score-num">${score}</div>
          <div class="mobile-score-label">Security Score</div>
        </div>
      </div>
      <div class="mobile-sev-row">
        ${['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map(sev => {
          const c = getSC(sev);
          const cnt = scanCounts[sev]||0;
          return `<div class="mobile-sev-item" style="border:1px solid ${c.border};background:${c.bg}">
            <div style="font-size:14pt;font-weight:900;color:${c.fg}">${cnt}</div>
            <div style="font-size:7pt;font-weight:700;text-transform:uppercase;color:${c.fg}">${sev}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('')}
</div>` : '';

  /* ── Remediation Roadmap ─────────────────────────────────── */
  const remediationPage = `
<div class="page">
  ${getHeaderHtml(`${mobileScans.length > 0 ? '6' : '5'}. Remediation Roadmap`)}
  <h2 class="section-heading">${mobileScans.length>0?'6':'5'}. Remediation Roadmap</h2>
  <p class="narrative">
    The following remediation roadmap prioritises findings based on risk severity and provides
    recommended timelines for remediation. All timelines should be treated as maximum deadlines.
  </p>

  <div class="roadmap-grid">
    ${[
      { icon:'🚨', label:'IMMEDIATE',  sub:'0 – 48 hours',  color:'#dc2626', bg:'#fee2e2', sev:'CRITICAL', cnt: countBySev.CRITICAL||0,
        desc:`Patch or take offline all Critical findings. These vulnerabilities are actively exploitable and pose an immediate risk to your organisation. Escalate to C-suite immediately.` },
      { icon:'⚠️', label:'SHORT TERM', sub:'7 – 14 days',   color:'#ea580c', bg:'#ffedd5', sev:'HIGH',     cnt: countBySev.HIGH||0,
        desc:`Schedule and deploy patches for all High severity findings. Implement interim compensating controls (WAF rules, access restrictions) where patching is delayed.` },
      { icon:'🔶', label:'MEDIUM TERM',sub:'30 – 90 days',  color:'#ca8a04', bg:'#fef9c3', sev:'MEDIUM',   cnt: countBySev.MEDIUM||0,
        desc:`Address Medium severity issues within the next development sprint or maintenance window. Track all items in your security backlog.` },
      { icon:'📌', label:'LONG TERM',  sub:'3 – 6 months',  color:'#15803d', bg:'#dcfce7', sev:'LOW/INFO', cnt:(countBySev.LOW||0)+(countBySev.INFO||0),
        desc:`Document and address Low/Informational items during regular security reviews. Use findings to drive security hardening initiatives.` },
    ].map(item => `
      <div class="roadmap-card" style="border-left:5px solid ${item.color}">
        <div class="roadmap-header" style="background:${item.bg}">
          <span class="roadmap-icon">${item.icon}</span>
          <div>
            <div class="roadmap-label" style="color:${item.color}">${item.label}</div>
            <div class="roadmap-sub">${item.sub}</div>
          </div>
          <div class="roadmap-count" style="color:${item.color}">${item.cnt}<span style="font-size:8pt;font-weight:600"> findings</span></div>
        </div>
        <p class="roadmap-desc">${item.desc}</p>
      </div>`).join('')}
  </div>

  <h3 class="sub-heading" style="margin-top:20px">${mobileScans.length>0?'7':'6'}. General Security Recommendations</h3>
  <div class="rec-grid">
    ${[
      { icon:'🔒', title:'Input Validation & Sanitisation',     desc:'Validate and sanitise all user-controlled inputs server-side. Use parameterised queries and ORM frameworks to prevent injection attacks.' },
      { icon:'🔑', title:'Authentication & Session Management', desc:'Enforce multi-factor authentication (MFA). Use secure, randomly generated session tokens with HttpOnly and Secure cookie flags. Implement proper session expiry.' },
      { icon:'🛡️', title:'Security Headers',                    desc:'Deploy HTTP security headers: Content-Security-Policy, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security, and Referrer-Policy.' },
      { icon:'📦', title:'Third-party Dependency Management',   desc:'Regularly audit and update third-party libraries. Subscribe to CVE feeds for critical components. Implement software composition analysis (SCA) in CI/CD.' },
      { icon:'🔍', title:'Continuous Security Monitoring',      desc:'Deploy SIEM, WAF, and intrusion detection systems. Establish security baselines and alerting for anomalous activity.' },
      { icon:'🔐', title:'Encryption & Data Protection',        desc:'Enforce TLS 1.2+ for all communications. Encrypt sensitive data at rest. Use strong, modern cryptographic algorithms (AES-256, RSA-4096).' },
      { icon:'👩‍💻', title:'Security Development Lifecycle',     desc:'Integrate security into CI/CD pipelines via SAST/DAST tools. Conduct mandatory OWASP Top 10 training for all developers.' },
      { icon:'📋', title:'Security Policy & Governance',        desc:'Establish and maintain security policies, incident response plans, and data classification frameworks. Conduct quarterly VAPT assessments.' },
    ].map(r => `
      <div class="rec-card">
        <span class="rec-icon">${r.icon}</span>
        <div><strong style="font-size:9pt">${escapeHtml(r.title)}</strong>
        <p style="margin:3px 0 0;font-size:7.5pt;color:#475569;line-height:1.5">${escapeHtml(r.desc)}</p></div>
      </div>`).join('')}
  </div>
</div>`;

  /* ── Full CSS ─────────────────────────────────────────────── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    /* ══ PAGE SETUP ══════════════════════════════════════════ */
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 20mm 16mm;
    }
    @page :first { margin: 0; }

    body { counter-reset: page-num; }
    .page { counter-increment: page-num; }

    /* ══ RESET & BASE ════════════════════════════════════════ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    body {
      font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    /* ══ PAGE LAYOUT ═════════════════════════════════════════ */
    .page {
      position: relative;
      page-break-before: always;
      max-width: 100%;
    }
    .page:first-child,
    .cover-page { page-break-before: avoid; }

    /* Running header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: #475569;
      border-bottom: 1.5pt solid #1e40af;
      padding-bottom: 5pt;
      margin-bottom: 20pt;
    }
    .page-header span:last-child {
      color: #94a3b8;
      font-weight: 500;
      letter-spacing: 0.04em;
      max-width: 55%;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* CSS-generated page number in footer */
    .page::after {
      content: "Page " counter(page-num);
      position: fixed;
      bottom: 5mm;
      right: 16mm;
      font-family: 'Inter', sans-serif;
      font-size: 6pt;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.06em;
    }
    .cover-page::after { display: none; }

    /* ══ TYPOGRAPHY ══════════════════════════════════════════ */
    .section-heading {
      font-size: 13.5pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      letter-spacing: -0.01em;
      border-left: 4.5pt solid #1e40af;
      padding: 3pt 0 3pt 10pt;
      margin-top: 0;
      margin-bottom: 14pt;
      page-break-after: avoid;
    }
    .sub-heading {
      font-size: 10pt;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.01em;
      line-height: 1.3;
      margin-top: 14pt;
      margin-bottom: 7pt;
      border-bottom: 0.75pt solid #e2e8f0;
      padding-bottom: 3pt;
      page-break-after: avoid;
    }
    .narrative {
      font-size: 9.5pt;
      color: #374151;
      line-height: 1.68;
      letter-spacing: 0.005em;
      margin-bottom: 12pt;
    }
    strong { font-weight: 700; }
    code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 8pt;
      background: #f1f5f9;
      border: 0.5pt solid #e2e8f0;
      border-radius: 3pt;
      padding: 1pt 4pt;
      color: #334155;
    }

    /* ══ COVER PAGE ══════════════════════════════════════════ */
    .cover-page {
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
    }
    .cover-bg-accent {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 62%;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 38%, #1d4ed8 68%, #0f172a 100%);
      clip-path: polygon(0 0, 100% 0, 100% 82%, 0 100%);
    }
    .cover-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 16mm 18mm 14mm 18mm;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30mm;
    }
    .cover-logo-wrap img {
      max-height: 68pt;
      max-width: 200pt;
      object-fit: contain;
    }
    .cover-shield { font-size: 48pt; line-height: 1; }
    .cover-confidential {
      font-size: 6.5pt;
      font-weight: 900;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(239,68,68,0.75);
      border: 0.75pt solid rgba(239,68,68,0.45);
      padding: 4pt 10pt;
      border-radius: 3pt;
      align-self: flex-start;
    }
    .cover-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .cover-label {
      display: inline-block;
      font-size: 6.5pt;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #93c5fd;
      background: rgba(59,130,246,0.14);
      border: 0.75pt solid rgba(59,130,246,0.35);
      padding: 4pt 12pt;
      border-radius: 20pt;
      margin-bottom: 12pt;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 900;
      color: #f8fafc;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 8pt;
    }
    .cover-org {
      font-size: 11pt;
      font-weight: 400;
      color: #93c5fd;
      letter-spacing: 0.01em;
    }
    .cover-meta-box { margin-top: auto; padding-top: 16mm; }
    .cover-meta-table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(255,255,255,0.07);
      border-radius: 7pt;
      overflow: hidden;
    }
    .cover-meta-table td {
      padding: 8pt 12pt;
      font-size: 8.5pt;
      border-bottom: 0.75pt solid rgba(255,255,255,0.08);
      vertical-align: middle;
    }
    .cm-label { color: #94a3b8; font-weight: 600; width: 22%; font-size: 7.5pt; }
    .cm-value { color: #f1f5f9; font-weight: 700; width: 28%; }
    .cover-sev-strip {
      display: grid;
      grid-template-columns: repeat(5,1fr);
      gap: 8pt;
      margin-top: 12pt;
    }
    .cover-sev-item {
      background: rgba(255,255,255,0.08);
      border-radius: 6pt;
      padding: 10pt 8pt;
      text-align: center;
    }
    .cover-sev-num { font-size: 20pt; font-weight: 900; line-height: 1.1; margin-bottom: 2pt; }
    .cover-sev-lbl { font-size: 6pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
    .cover-disclaimer {
      margin-top: 10pt;
      font-size: 6.5pt;
      color: rgba(148,163,184,0.6);
      border-top: 0.75pt solid rgba(255,255,255,0.08);
      padding-top: 8pt;
      line-height: 1.6;
    }

    /* ══ TABLE OF CONTENTS ═══════════════════════════════════ */
    .toc-table { width: 100%; border-collapse: collapse; margin: 14pt 0; }
    .toc-table tr { border-bottom: 0.75pt dotted #e2e8f0; page-break-inside: avoid; }
    .toc-num {
      width: 30pt;
      font-weight: 800;
      font-size: 10pt;
      color: #1e40af;
      padding: 9pt 6pt;
      vertical-align: middle;
    }
    .toc-title {
      font-size: 10pt;
      font-weight: 600;
      color: #1e293b;
      padding: 9pt 6pt;
      vertical-align: middle;
    }
    .toc-dots {
      text-align: right;
      color: #cbd5e1;
      font-size: 8pt;
      padding: 9pt 0;
      vertical-align: middle;
      width: 60pt;
    }
    .toc-note {
      font-size: 8pt;
      color: #64748b;
      padding: 10pt 0;
      border-top: 0.75pt solid #e2e8f0;
      letter-spacing: 0.02em;
    }

    /* ══ EXECUTIVE SUMMARY ═══════════════════════════════════ */
    .exec-grid { display: grid; grid-template-columns: 190pt 1fr; gap: 12pt; margin: 12pt 0; }
    .exec-card {
      background: #f8fafc;
      border: 0.75pt solid #e2e8f0;
      border-radius: 7pt;
      padding: 11pt 12pt;
    }
    .exec-card-title {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #64748b;
      margin-bottom: 8pt;
    }
    .sev-dist-table { width: 100%; border-collapse: collapse; }
    .sev-dist-table thead { display: table-header-group; }
    .sev-dist-table th {
      background: #1e40af;
      color: #ffffff;
      padding: 5.5pt 8pt;
      font-size: 7.5pt;
      font-weight: 700;
      text-align: left;
      letter-spacing: 0.04em;
      vertical-align: middle;
    }
    .sev-dist-table td {
      padding: 5.5pt 8pt;
      border-bottom: 0.75pt solid #f1f5f9;
      font-size: 8.5pt;
      vertical-align: middle;
    }
    .sev-dist-table tr:nth-child(even) td { background: #f8fafc; }
    .sev-dist-table tr { page-break-inside: avoid; }
    .total-row td { border-top: 1.5pt solid #e2e8f0; background: #f1f5f9 !important; font-weight: 800; }
    .sev-dot {
      display: inline-block;
      width: 7pt;
      height: 7pt;
      border-radius: 50%;
      margin-right: 5pt;
      vertical-align: middle;
    }
    .dist-bar { background: #e2e8f0; border-radius: 3pt; height: 7pt; overflow: hidden; }
    .dist-fill { height: 100%; border-radius: 3pt; }
    .callout {
      display: flex;
      align-items: flex-start;
      gap: 9pt;
      padding: 9pt 11pt;
      border-radius: 6pt;
      margin-bottom: 7pt;
      font-size: 8.5pt;
      line-height: 1.6;
      page-break-inside: avoid;
    }
    .callout-icon { font-size: 13pt; flex-shrink: 0; margin-top: 1pt; }
    .callout-critical { background: #fee2e2; color: #7f1d1d; border: 0.75pt solid #fca5a5; }
    .callout-high     { background: #ffedd5; color: #7c2d12; border: 0.75pt solid #fdba74; }
    .callout-good     { background: #dcfce7; color: #14532d; border: 0.75pt solid #86efac; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
    .info-box {
      background: #f8fafc;
      border: 0.75pt solid #e2e8f0;
      border-radius: 7pt;
      padding: 12pt;
      text-align: center;
    }
    .info-box-title {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 5pt;
    }
    .info-box-num { font-size: 22pt; font-weight: 900; color: #1e293b; line-height: 1.1; }
    .info-box-sub { font-size: 7pt; color: #64748b; margin-top: 3pt; }

    /* ══ SCOPE & METHODOLOGY ═════════════════════════════════ */
    .meta-table { width: 100%; border-collapse: collapse; }
    .meta-table thead { display: table-header-group; }
    .meta-table td {
      padding: 5.5pt 7pt;
      border-bottom: 0.75pt solid #f1f5f9;
      font-size: 8.5pt;
      vertical-align: middle;
    }
    .meta-table td:first-child {
      color: #64748b;
      font-weight: 700;
      width: 38%;
      letter-spacing: 0.01em;
    }
    .meta-table tr:last-child td { border-bottom: none; }
    .phases-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7pt; margin-top: 10pt; }
    .phase-card {
      display: flex;
      gap: 8pt;
      align-items: flex-start;
      padding: 9pt 10pt;
      background: #f8fafc;
      border: 0.75pt solid #e2e8f0;
      border-radius: 6pt;
      page-break-inside: avoid;
    }
    .phase-icon { font-size: 13pt; flex-shrink: 0; margin-top: 1pt; }

    /* ══ FINDINGS SUMMARY TABLE ══════════════════════════════ */
    .findings-summary-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    .findings-summary-table thead { display: table-header-group; }
    .findings-summary-table th {
      background: #1e40af;
      color: #ffffff;
      padding: 6pt 7pt;
      font-size: 7pt;
      font-weight: 700;
      text-align: left;
      letter-spacing: 0.05em;
      vertical-align: middle;
    }
    .findings-summary-table td {
      padding: 5pt 7pt;
      border-bottom: 0.75pt solid #f1f5f9;
      vertical-align: middle;
      line-height: 1.45;
    }
    .findings-summary-table tr:nth-child(even) td { background: #f8fafc; }
    .findings-summary-table tr { page-break-inside: avoid; }
    .td-num   { font-weight: 800; color: #64748b; text-align: center; width: 22pt; }
    .td-title { font-weight: 600; }
    .td-cvss  { text-align: center; font-family: monospace; }
    .td-asset { font-size: 7.5pt; max-width: 110pt; word-break: break-all; }
    .td-cve   { font-family: 'Courier New', monospace; font-size: 7pt; color: #64748b; }

    /* ══ DETAILED FINDINGS ═══════════════════════════════════ */
    .finding-block {
      border: 0.75pt solid #e2e8f0;
      border-radius: 7pt;
      overflow: hidden;
      margin-bottom: 14pt;
      page-break-inside: avoid;
    }
    .finding-header { padding: 10pt 12pt; }
    .finding-header-top {
      display: flex;
      align-items: center;
      gap: 9pt;
      margin-bottom: 7pt;
      flex-wrap: wrap;
    }
    .finding-num {
      font-size: 7pt;
      font-weight: 900;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      flex-shrink: 0;
    }
    .finding-title-h {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      flex: 1;
      min-width: 0;
      line-height: 1.3;
    }
    .finding-header-meta { display: flex; flex-wrap: wrap; gap: 4pt; margin-top: 3pt; }
    .meta-tag {
      font-size: 6.5pt;
      font-weight: 700;
      padding: 2pt 6pt;
      border-radius: 4pt;
      background: #f1f5f9;
      color: #475569;
      border: 0.75pt solid #e2e8f0;
      letter-spacing: 0.03em;
    }
    .finding-body { padding: 9pt 12pt 11pt; background: #ffffff; }
    .finding-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 9pt; margin-bottom: 9pt; }
    .finding-section {
      background: #f8fafc;
      border: 0.75pt solid #e2e8f0;
      border-left: 2.5pt solid #93c5fd;
      border-radius: 5pt;
      padding: 7pt 9pt;
    }
    .finding-section-label {
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #3b82f6;
      margin-bottom: 5pt;
    }
    .finding-text { font-size: 8.5pt; color: #374151; line-height: 1.6; }
    .finding-attrs {
      display: flex;
      flex-wrap: wrap;
      gap: 4pt 14pt;
      background: #f8fafc;
      border: 0.75pt solid #e2e8f0;
      border-radius: 5pt;
      padding: 7pt 9pt;
    }
    .attr-item  { display: flex; align-items: center; gap: 4pt; }
    .attr-label { font-size: 7pt; font-weight: 700; color: #64748b; }
    .attr-value { font-size: 8.5pt; font-weight: 700; color: #1e293b; }

    /* ══ MOBILE SECTION ══════════════════════════════════════ */
    .mobile-card {
      border: 0.75pt solid #e2e8f0;
      border-radius: 7pt;
      overflow: hidden;
      margin-bottom: 11pt;
      page-break-inside: avoid;
    }
    .mobile-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 10pt 13pt;
      background: #f8fafc;
      border-bottom: 0.75pt solid #e2e8f0;
    }
    .mobile-platform  { font-size: 7.5pt; font-weight: 700; color: #64748b; margin-bottom: 3pt; }
    .mobile-app-name  { font-size: 10.5pt; font-weight: 800; color: #1e293b; margin-bottom: 3pt; }
    .mobile-pkg       { font-size: 7.5pt; color: #64748b; }
    .mobile-score { text-align: center; padding: 9pt 15pt; border-radius: 7pt; flex-shrink: 0; }
    .mobile-score-num   { font-size: 20pt; font-weight: 900; line-height: 1.1; }
    .mobile-score-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2pt; }
    .mobile-sev-row  { display: flex; padding: 9pt 13pt; gap: 7pt; flex-wrap: wrap; }
    .mobile-sev-item { flex: 1; min-width: 50pt; text-align: center; border-radius: 5pt; padding: 7pt 5pt; }

    /* ══ REMEDIATION ROADMAP ═════════════════════════════════ */
    .roadmap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9pt; margin-bottom: 14pt; }
    .roadmap-card {
      border-radius: 7pt;
      overflow: hidden;
      border: 0.75pt solid #e2e8f0;
      page-break-inside: avoid;
    }
    .roadmap-header { display: flex; align-items: center; gap: 9pt; padding: 9pt 11pt; }
    .roadmap-icon  { font-size: 14pt; flex-shrink: 0; }
    .roadmap-label { font-size: 9pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.07em; }
    .roadmap-sub   { font-size: 7.5pt; color: #64748b; font-weight: 600; margin-top: 2pt; }
    .roadmap-count { margin-left: auto; font-size: 15pt; font-weight: 900; flex-shrink: 0; }
    .roadmap-desc  { font-size: 8.5pt; color: #374151; line-height: 1.6; padding: 7pt 11pt 11pt; }
    .rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7pt; }
    .rec-card {
      display: flex;
      gap: 8pt;
      align-items: flex-start;
      background: #f8fafc;
      border: 0.75pt solid #e2e8f0;
      border-radius: 6pt;
      padding: 8pt 10pt;
      page-break-inside: avoid;
    }
    .rec-icon { font-size: 13pt; flex-shrink: 0; margin-top: 1pt; }

    /* ══ PRINT CONTROL ═══════════════════════════════════════ */
    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

      .page { page-break-before: always; }
      .cover-page { page-break-before: avoid; page-break-after: always; }

      /* Never break these elements mid-render */
      .finding-block    { page-break-inside: avoid; }
      .callout          { page-break-inside: avoid; }
      .roadmap-card     { page-break-inside: avoid; }
      .phase-card       { page-break-inside: avoid; }
      .rec-card         { page-break-inside: avoid; }
      .mobile-card      { page-break-inside: avoid; }
      .toc-table tr     { page-break-inside: avoid; }

      /* Repeat table headers across pages */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .findings-summary-table tr { page-break-inside: avoid; }
      .sev-dist-table tr { page-break-inside: avoid; }

      /* Widow & orphan control */
      p, li  { orphans: 3; widows: 3; }
      h1, h2, h3, .section-heading, .sub-heading {
        page-break-after: avoid;
        orphans: 4;
        widows: 4;
      }
      /* Glue a heading to the first paragraph after it */
      .section-heading + * { page-break-before: avoid; }
      .sub-heading + *     { page-break-before: avoid; }
    }
  `;

  /* ── Assemble full HTML ───────────────────────────────────── */
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHtml(reportTitle)}</title>
  <style>${css}</style>
</head>
<body>
  ${coverPage}
  ${tocPage}
  ${execPage}
  ${scopePage}
  ${findingsSummaryPage}
  ${detailedFindingsPage}
  ${mobilePage}
  ${remediationPage}
</body>
</html>`;
}
