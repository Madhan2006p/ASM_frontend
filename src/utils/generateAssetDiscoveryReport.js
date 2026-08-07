/**
 * generateAssetDiscoveryReport.js
 * Builds a fully self-contained, professionally styled Asset Discovery Report HTML string.
 * Mirrors generateVaptReport.js in architecture: same CSS, page layout, print rules,
 * cover page, TOC, page numbers, watermark, footer.
 * Data is sourced exclusively from existing Asset Discovery APIs.
 *
 * Open with window.open() + document.write() then trigger print/save-as-PDF.
 */

/* ── Severity colour palette (print-safe) ─────────────────── */
const SEV_COLORS_PRINT = {
  CRITICAL: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
  HIGH:     { bg: '#ffedd5', fg: '#9a3412', border: '#fdba74', dot: '#f97316' },
  MEDIUM:   { bg: '#fef9c3', fg: '#713f12', border: '#fde047', dot: '#eab308' },
  LOW:      { bg: '#dcfce7', fg: '#14532d', border: '#86efac', dot: '#22c55e' },
  INFO:     { bg: '#dbeafe', fg: '#1e3a8a', border: '#93c5fd', dot: '#3b82f6' },
  WARNING:  { bg: '#fef9c3', fg: '#713f12', border: '#fde047', dot: '#eab308' },
};
const getSC = (s) => SEV_COLORS_PRINT[(s || '').toUpperCase()] || SEV_COLORS_PRINT.INFO;

const SEV_CVSS_MAP = { CRITICAL: 9.5, HIGH: 7.5, MEDIUM: 5.0, LOW: 2.5, INFO: 0.5, WARNING: 5.0 };
const cvssOf = (sev, raw) => raw ? parseFloat(raw) : (SEV_CVSS_MAP[(sev || '').toUpperCase()] || 0);

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
};

const escapeHtml = (str) => String(str || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── Severity badge HTML ─────────────────────────────────────── */
const badgeHtml = (sev) => {
  const c = getSC(sev);
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:7.5pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:${c.bg};color:${c.fg};border:1px solid ${c.border}">${escapeHtml(sev || 'INFO')}</span>`;
};

/* ── CVSS circle SVG ─────────────────────────────────────────── */
const cvssCircle = (score, sev) => {
  const c = getSC(sev);
  const pct = Math.min(score / 10, 1);
  const r = 14, cx = 16, cy = 16;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return `<svg width="32" height="32" viewBox="0 0 32 32" style="overflow:visible">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="3.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.dot}" stroke-width="3.5"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="8" font-weight="800" fill="${c.fg}">${score.toFixed(1)}</text>
  </svg>`;
};

/* ── Risk gauge SVG ──────────────────────────────────────────── */
const riskGauge = (score, color) => {
  const pct = score / 10;
  const r = 70;
  const half = Math.PI * r;
  const filled = pct * half;
  return `<svg width="180" height="100" viewBox="0 0 180 100">
    <path d="M20,80 A70,70 0 0,1 160,80" fill="none" stroke="#e5e7eb" stroke-width="14" stroke-linecap="round"/>
    <path d="M20,80 A70,70 0 0,1 160,80" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${filled} ${half}"/>
    <text x="90" y="74" text-anchor="middle" font-size="24" font-weight="900" fill="${color}">${score}</text>
    <text x="90" y="92" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">/10</text>
  </svg>`;
};

/* ── Status dot colour ───────────────────────────────────────── */
const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'live' || s === 'active' || s === 'up') return { color: '#15803d', bg: '#dcfce7', border: '#86efac', label: 'Active' };
  if (s === 'down' || s === 'inactive') return { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', label: 'Down' };
  return { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Unknown' };
};

/* ── Cert health colour ─────────────────────────────────────── */
const certHealth = (expiryDate, isValid) => {
  if (!isValid || isValid === false) return { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', label: 'Expired' };
  if (!expiryDate) return { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Unknown' };
  const daysLeft = Math.floor((new Date(expiryDate) - Date.now()) / 86400000);
  if (daysLeft < 0) return { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', label: 'Expired' };
  if (daysLeft < 30) return { color: '#9a3412', bg: '#ffedd5', border: '#fdba74', label: 'Expiring Soon' };
  return { color: '#14532d', bg: '#dcfce7', border: '#86efac', label: 'Healthy' };
};

/* ── Risk score calculation (from vulnerability counts) ──────── */
const calcRiskScore = (counts) => {
  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0 } = counts;
  const total = CRITICAL + HIGH + MEDIUM + LOW;
  if (total === 0) return 0;
  return Math.min(10, (CRITICAL * 10 + HIGH * 7 + MEDIUM * 4 + LOW * 1) / total);
};

const riskLabel = (score) => {
  if (score >= 8) return { label: 'CRITICAL', color: '#dc2626' };
  if (score >= 6) return { label: 'HIGH',     color: '#ea580c' };
  if (score >= 4) return { label: 'MEDIUM',   color: '#ca8a04' };
  if (score >= 2) return { label: 'LOW',      color: '#16a34a' };
  return              { label: 'MINIMAL',  color: '#2563eb' };
};

/* ═══════════════════════════════════════════════════════════════
   Main export function
═══════════════════════════════════════════════════════════════ */
export function generateAssetDiscoveryReportHTML({
  reportTitle, orgName, assessorName, reportDate, scope, methodology,
  logoDataUrl,
  // Asset Discovery data
  subdomains, endpoints, ports, technologies, vulnerabilities, certificates,
  scanMeta,
}) {
  const fDate = fmtDate(reportDate);
  const sevKeys = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  /* ── Aggregate vulnerability counts ─────────────────────── */
  const countBySev = vulnerabilities.reduce((acc, v) => {
    const s = (v.severity || 'LOW').toUpperCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const totalVulns = vulnerabilities.length;
  const riskScore = parseFloat(calcRiskScore(countBySev).toFixed(1));
  const { label: riskLbl, color: riskCol } = riskLabel(riskScore);

  /* ── Cert health stats ─────────────────────────────────── */
  const certStats = certificates.reduce((acc, c) => {
    const h = certHealth(c.expiry_date || c.valid_till, c.is_valid);
    acc[h.label] = (acc[h.label] || 0) + 1;
    return acc;
  }, {});

  /* ── Unique domains in scan ─────────────────────────────── */
  const uniqueDomains = [...new Set(subdomains.map(s => s.domain).filter(Boolean))];

  /* ── Cover page ─────────────────────────────────────────── */
  const assetStatStrip = [
    { label: 'Subdomains', value: subdomains.length, color: '#3b82f6' },
    { label: 'Endpoints',  value: endpoints.length,  color: '#8b5cf6' },
    { label: 'Open Ports', value: ports.length,       color: '#f97316' },
    { label: 'Techs',      value: technologies.length, color: '#06b6d4' },
    { label: 'Certs',      value: certificates.length, color: '#22c55e' },
  ].map(s => `<div class="cover-sev-item" style="border-top:4px solid ${s.color}">
    <div class="cover-sev-num" style="color:${s.color}">${s.value}</div>
    <div class="cover-sev-lbl">${s.label}</div>
  </div>`).join('');

  const coverPage = `
<div class="page cover-page">
  <div class="cover-bg-accent"></div>
  <div class="cover-inner">
    <div class="cover-top">
      <div class="cover-logo-wrap" style="display:flex;align-items:center;gap:14px">
        ${logoDataUrl
          ? `<img src="${logoDataUrl}" alt="Logo" style="max-height:60px;max-width:180px;object-fit:contain;border-radius:4px"/>`
          : `<div class="cover-shield">🔍</div>`}
        <div style="display:flex;flex-direction:column">
          <span style="font-size:16pt;font-weight:900;color:#0f172a;letter-spacing:-0.02em">${escapeHtml(orgName || 'Infotech Sentinel')}</span>
          <span style="font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">Target Organization</span>
        </div>
      </div>
      <div class="cover-confidential">CONFIDENTIAL</div>
    </div>

    <div class="cover-center">
      <div class="cover-label">ATTACK SURFACE MANAGEMENT</div>
      <h1 class="cover-title">${escapeHtml(reportTitle)}</h1>
      <p class="cover-org">Prepared for: <strong>${escapeHtml(orgName || 'Infotech Sentinel')}</strong></p>
    </div>

    <div class="cover-meta-box">
      <table class="cover-meta-table">
        <tr>
          <td class="cm-label">📅 Report Date</td><td class="cm-value">${fDate}</td>
          <td class="cm-label">🎯 Scope</td><td class="cm-value">${escapeHtml(scope || 'Full Assessment')}</td>
        </tr>
        <tr>
          <td class="cm-label">👤 Assessor</td><td class="cm-value">${escapeHtml(assessorName || 'Security Team')}</td>
          <td class="cm-label">⚠️ Overall Risk</td>
          <td class="cm-value" style="color:${riskCol};font-weight:900">${riskLbl} (${riskScore}/10)</td>
        </tr>
        <tr>
          <td class="cm-label">🏠 Assets Discovered</td><td class="cm-value">${subdomains.length}</td>
          <td class="cm-label">🚨 Vulnerabilities</td>
          <td class="cm-value" style="color:#dc2626;font-weight:900">${totalVulns}</td>
        </tr>
      </table>
      <div class="cover-sev-strip">${assetStatStrip}</div>
    </div>

    <div class="cover-disclaimer">
      This report contains confidential and proprietary information. It is intended solely for the named organisation.
      Unauthorised disclosure, copying, distribution or use is strictly prohibited.
      Classification: <strong>CONFIDENTIAL — RESTRICTED</strong>
    </div>
  </div>
</div>`;

  /* ── Table of Contents ──────────────────────────────────── */
  const hasTech = technologies.length > 0;
  const hasCerts = certificates.length > 0;
  let secNum = 1;
  const toc = [];
  toc.push({ n: secNum++, title: 'Executive Summary' });
  toc.push({ n: secNum++, title: 'Scope & Methodology' });
  toc.push({ n: secNum++, title: `Asset Inventory (${subdomains.length} assets)` });
  toc.push({ n: secNum++, title: `Vulnerability Findings (${totalVulns} findings)` });
  if (hasTech) toc.push({ n: secNum++, title: 'Technology Fingerprint' });
  if (hasCerts) toc.push({ n: secNum++, title: 'SSL / TLS Overview' });
  toc.push({ n: secNum++, title: 'Hardening Recommendations' });

  const tocPage = `
<div class="page">
  <div class="page-header"><span>TABLE OF CONTENTS</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">Table of Contents</h2>
  <table class="toc-table">
    ${toc.map(t => `<tr><td class="toc-num">${t.n}.</td><td class="toc-title">${escapeHtml(t.title)}</td><td class="toc-dots"></td></tr>`).join('')}
  </table>
  <div class="toc-note">
    <strong>Classification:</strong> CONFIDENTIAL &nbsp;|&nbsp;
    <strong>Date:</strong> ${fDate} &nbsp;|&nbsp;
    <strong>Version:</strong> 1.0
  </div>
</div>`;

  /* ── Executive Summary ──────────────────────────────────── */
  let sn = 1;
  const execPage = `
<div class="page">
  <div class="page-header"><span>1. EXECUTIVE SUMMARY</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">1. Executive Summary</h2>

  <p class="narrative">
    This Asset Discovery assessment was conducted against
    <strong>${escapeHtml(scope || 'the target environment')}</strong> on
    <strong>${fDate}</strong>${assessorName ? ` by <strong>${escapeHtml(assessorName)}</strong>` : ''}.
    The scan discovered a total of <strong>${subdomains.length}</strong> subdomains,
    <strong>${endpoints.length}</strong> web endpoints, <strong>${ports.length}</strong> open port records,
    <strong>${technologies.length}</strong> unique technologies, and
    <strong>${certificates.length}</strong> SSL/TLS certificates.
    ${totalVulns > 0
      ? `A total of <strong>${totalVulns}</strong> security vulnerabilities were identified across the attack surface.`
      : 'No vulnerabilities were identified during this assessment.'}
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

    <!-- Vulnerability distribution by severity -->
    <div class="exec-card" style="grid-column:span 2">
      <div class="exec-card-title">Vulnerability Distribution by Severity</div>
      <table class="sev-dist-table">
        <thead><tr>
          <th>Severity</th><th>Count</th><th>Percentage</th><th style="width:40%">Distribution</th>
        </tr></thead>
        <tbody>
          ${sevKeys.map(sev => {
            const c = getSC(sev);
            const cnt = countBySev[sev] || 0;
            const pct = totalVulns > 0 ? ((cnt / totalVulns) * 100).toFixed(1) : '0.0';
            const barW = totalVulns > 0 ? Math.round((cnt / totalVulns) * 100) : 0;
            return `<tr>
              <td><span class="sev-dot" style="background:${c.dot}"></span><strong>${sev}</strong></td>
              <td style="text-align:center;font-weight:900;color:${c.fg};font-size:11pt">${cnt}</td>
              <td style="text-align:center;color:#64748b">${pct}%</td>
              <td><div class="dist-bar"><div class="dist-fill" style="width:${barW}%;background:${c.dot}"></div></div></td>
            </tr>`;
          }).join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td style="text-align:center;font-weight:900;font-size:11pt">${totalVulns}</td>
            <td style="text-align:center">100%</td><td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Asset summary strip -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:14px 0">
    ${[
      { icon: '🌐', label: 'Subdomains', value: subdomains.length, sub: `${subdomains.filter(s => (s.status||'active').toLowerCase() === 'active' || (s.status||'active').toLowerCase() === 'live').length} active` },
      { icon: '🔗', label: 'Endpoints',  value: endpoints.length,  sub: `${[...new Set(endpoints.map(e => { try { return new URL(e.url).hostname; } catch { return e.url; } }))].length} hosts` },
      { icon: '🚪', label: 'Open Ports', value: ports.length,      sub: `${[...new Set(ports.map(p => p.host))].length} hosts` },
      { icon: '🛠', label: 'Technologies', value: technologies.length, sub: 'detected' },
      { icon: '🔒', label: 'SSL Certs', value: certificates.length, sub: `${certStats['Healthy'] || 0} healthy` },
    ].map(a => `<div class="info-box">
      <div class="info-box-title">${a.icon} ${escapeHtml(a.label)}</div>
      <div class="info-box-num">${a.value}</div>
      <div class="info-box-sub">${escapeHtml(a.sub)}</div>
    </div>`).join('')}
  </div>

  <!-- Critical/high callouts -->
  ${(countBySev.CRITICAL || 0) > 0 ? `
  <div class="callout callout-critical">
    <div class="callout-icon">🚨</div>
    <div><strong>${countBySev.CRITICAL} Critical Vulnerability${countBySev.CRITICAL > 1 ? 'ies' : 'y'}</strong> — Immediate remediation required.
    These findings pose a direct and immediate risk and must be resolved within <strong>24–48 hours</strong>.</div>
  </div>` : ''}
  ${(countBySev.HIGH || 0) > 0 ? `
  <div class="callout callout-high">
    <div class="callout-icon">⚠️</div>
    <div><strong>${countBySev.HIGH} High Severity Finding${countBySev.HIGH > 1 ? 's' : ''}</strong> — Address within 7–14 days.
    High severity issues represent significant vulnerabilities exploitable without advanced skill.</div>
  </div>` : ''}
  ${totalVulns === 0 ? `
  <div class="callout callout-good">
    <div class="callout-icon">✅</div>
    <div><strong>No vulnerabilities identified.</strong> The target environment appears well-secured based on ASM scan coverage.</div>
  </div>` : ''}
</div>`;

  /* ── Scope & Methodology ────────────────────────────────── */
  const scopePage = `
<div class="page">
  <div class="page-header"><span>2. SCOPE &amp; METHODOLOGY</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">2. Scope &amp; Methodology</h2>

  <div class="two-col">
    <div>
      <h3 class="sub-heading">🎯 Assessment Scope</h3>
      <table class="meta-table">
        <tr><td>Target Domain</td><td><code>${escapeHtml(scope || '—')}</code></td></tr>
        <tr><td>Scan ID</td><td><code>${escapeHtml(String(scanMeta?.id || '—'))}</code></td></tr>
        <tr><td>Scan Date</td><td>${scanMeta?.created_at ? fmtDate(scanMeta.created_at) : fDate}</td></tr>
        <tr><td>Subdomains Found</td><td><strong>${subdomains.length}</strong></td></tr>
        <tr><td>Assessment Type</td><td>Automated ASM</td></tr>
      </table>
    </div>
    <div>
      <h3 class="sub-heading">📊 Surface Overview</h3>
      <table class="meta-table">
        <tr><td>Active Subdomains</td><td><strong>${subdomains.length}</strong></td></tr>
        <tr><td>Discovered Endpoints</td><td><strong>${endpoints.length}</strong></td></tr>
        <tr><td>Open Network Ports</td><td><strong>${ports.length}</strong></td></tr>
        <tr><td>Technologies Detected</td><td><strong>${technologies.length}</strong></td></tr>
        <tr><td>SSL Certificates</td><td><strong>${certificates.length}</strong></td></tr>
        <tr><td>Assessment Engine</td><td>Enterprise ASM Scanner</td></tr>
      </table>
    </div>
  </div>

  <h3 class="sub-heading" style="margin-top:18px">🔬 Testing Methodology</h3>
  <p class="narrative">${escapeHtml(methodology)}</p>

  <div class="phases-grid">
    ${[
      { icon: '🔍', phase: 'Phase 1: Subdomain Enumeration', desc: 'Passive and active subdomain discovery using DNS brute-force, certificate transparency logs, and OSINT sources to map the full external attack surface.' },
      { icon: '🚪', phase: 'Phase 2: Port & Service Scanning', desc: 'Automated TCP/UDP port scanning to identify open network services, running protocols, and exposed interfaces.' },
      { icon: '🌐', phase: 'Phase 3: Web Endpoint Discovery', desc: 'Web crawling and endpoint discovery to map accessible web applications, APIs, and administrative interfaces.' },
      { icon: '🛠', phase: 'Phase 4: Technology Fingerprinting', desc: 'Identification of web frameworks, libraries, CMS engines, CDN providers, and backend infrastructure via HTTP response header analysis.' },
      { icon: '🔒', phase: 'Phase 5: Certificate Analysis', desc: 'SSL/TLS certificate inspection for validity, expiry dates, issuer chains, and TLS version security configuration.' },
      { icon: '⚡', phase: 'Phase 6: Vulnerability Assessment', desc: 'Automated vulnerability assessment scanning against discovered digital assets to identify known CVEs and security misconfigurations.' },
    ].map(p => `
      <div class="phase-card">
        <div class="phase-icon">${p.icon}</div>
        <div><strong>${escapeHtml(p.phase)}</strong><p style="margin:4px 0 0;font-size:8.5pt;color:#475569;line-height:1.5">${escapeHtml(p.desc)}</p></div>
      </div>`).join('')}
  </div>
</div>`;

  /* ── Asset Inventory ────────────────────────────────────── */
  const assetRows = subdomains.map((sub, idx) => {
    const sc = statusColor(sub.status);
    const subPorts = ports.filter(p => p.host === sub.domain);
    const portList = subPorts.slice(0, 6).map(p => `<code style="background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:3px;font-size:7pt">${p.port}/${(p.protocol || 'tcp').replace('/', '').toLowerCase()}</code>`).join(' ');
    const ip = Array.isArray(sub.ip) ? sub.ip[0] : (sub.ip || '—');
    const techList = technologies.filter(t => t.hosts && t.hosts.includes(sub.domain));
    return `<tr>
      <td class="td-num">${idx + 1}</td>
      <td class="td-title"><code>${escapeHtml(sub.domain)}</code></td>
      <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:7pt;font-weight:800;background:${sc.bg};color:${sc.color};border:1px solid ${sc.border}">${sc.label}</span></td>
      <td style="font-family:monospace;font-size:8pt;color:#475569">${escapeHtml(ip)}</td>
      <td style="font-size:7.5pt">${portList || '<span style="color:#94a3b8">—</span>'}</td>
      <td style="font-size:7.5pt;color:#475569">${techList.map(t => escapeHtml(t.name)).slice(0, 3).join(', ') || '—'}</td>
      <td style="text-align:center;font-size:8pt;color:#475569">${sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}</td>
    </tr>`;
  }).join('');

  const assetInventoryPage = `
<div class="page">
  <div class="page-header"><span>3. ASSET INVENTORY</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">3. Asset Inventory</h2>
  <p class="narrative">
    The following table lists all <strong>${subdomains.length}</strong> subdomains discovered during the assessment,
    along with their IP addresses, status, open ports, and detected technologies.
  </p>
  <table class="findings-summary-table">
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Domain / Asset</th>
        <th style="width:70px">Status</th>
        <th style="width:110px">IP Address</th>
        <th>Open Ports</th>
        <th>Technologies</th>
        <th style="width:80px">Discovered</th>
      </tr>
    </thead>
    <tbody>
      ${subdomains.length > 0 ? assetRows : `<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">No subdomains discovered in this scan.</td></tr>`}
    </tbody>
  </table>
</div>`;

  /* Helper to resolve all affected assets as an array */
  const resolveAssetList = (v) => {
    if (Array.isArray(v?.affected_assets) && v.affected_assets.length > 0) {
      return v.affected_assets.filter(Boolean);
    }
    const list = [v?.subdomain, v?.domain, v?.url].filter(Boolean);
    if (list.length > 0) return [...new Set(list)];
    return scope ? [scope] : ['Target Domain'];
  };

  /* ── Vulnerability Findings ─────────────────────────────── */
  const vulnRows = vulnerabilities.map((v, idx) => {
    const sev = (v.severity || 'LOW').toUpperCase();
    const c = getSC(sev);
    const cvss = cvssOf(sev, v.cvss_score);
    const assets = resolveAssetList(v);
    const assetChips = assets.map(a => `<code>${escapeHtml(a)}</code>`).join(' ');
    return `<tr>
      <td class="td-num">${idx + 1}</td>
      <td class="td-title">${escapeHtml(v.finding || v.vulnerability_id || 'Security Finding')}</td>
      <td>${badgeHtml(sev)}</td>
      <td class="td-cvss" style="color:${c.fg};font-weight:800">${cvss.toFixed(1)}</td>
      <td class="td-asset" style="max-width:260pt">${assetChips}</td>
      <td class="td-cve">${escapeHtml([v.cve, v.cwe].filter(Boolean).join(' / ') || '—')}</td>
    </tr>`;
  }).join('');

  const findingsSummaryPage = `
<div class="page">
  <div class="page-header"><span>4. VULNERABILITY FINDINGS</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">4. Vulnerability Findings</h2>
  <p class="narrative">
    The following <strong>${totalVulns}</strong> vulnerabilities were identified across the discovered attack surface.
    Findings are ordered from most critical to least critical.
  </p>
  <table class="findings-summary-table">
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Finding / Vulnerability</th>
        <th style="width:80px">Severity</th>
        <th style="width:44px">CVSS</th>
        <th>Affected Assets (${vulnerabilities.reduce((acc, curr) => acc + (curr.affected_assets?.length || 1), 0)})</th>
        <th style="width:100px">CVE / CWE</th>
      </tr>
    </thead>
    <tbody>
      ${totalVulns > 0 ? vulnRows : `<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">No vulnerabilities identified in this scan.</td></tr>`}
    </tbody>
  </table>
</div>`;

  /* Detailed finding blocks */
  const findingBlocks = vulnerabilities.map((v, idx) => {
    const sev = (v.severity || 'LOW').toUpperCase();
    const c = getSC(sev);
    const cvss = cvssOf(sev, v.cvss_score);
    const cvssLabel = cvss >= 9 ? 'Critical' : cvss >= 7 ? 'High' : cvss >= 4 ? 'Medium' : cvss >= 0.1 ? 'Low' : 'Info';
    const assets = resolveAssetList(v);
    return `
<div class="finding-block">
  <div class="finding-header" style="border-left:5px solid ${c.dot};background:${c.bg}">
    <div class="finding-header-top">
      <span class="finding-num" style="color:${c.fg}">FINDING ${String(idx + 1).padStart(3, '0')}</span>
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <span class="finding-title-h">${escapeHtml(v.finding || v.vulnerability_id || 'Security Finding')}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${badgeHtml(sev)}
        <div style="display:flex;align-items:center;gap:4px">
          ${cvssCircle(cvss, sev)}
          <span style="font-size:8pt;color:#64748b">CVSS ${cvssLabel}</span>
        </div>
      </div>
    </div>
    <div class="finding-header-meta">
      ${v.cve ? `<span class="meta-tag" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5">CVE: ${escapeHtml(v.cve)}</span>` : ''}
      ${v.cwe ? `<span class="meta-tag" style="background:#f3e8ff;color:#6b21a8;border-color:#d8b4fe">CWE: ${escapeHtml(v.cwe)}</span>` : ''}
      <span class="meta-tag" style="background:#dbeafe;color:#1e40af;border-color:#bfdbfe;font-weight:700">🎯 ${assets.length} Affected Asset(s)</span>
      ${v.category ? `<span class="meta-tag">Category: ${escapeHtml(v.category)}</span>` : ''}
    </div>
  </div>
  <div class="finding-body">
    <div class="finding-two-col">
      ${v.description ? `
      <div class="finding-section">
        <div class="finding-section-label">📋 Description</div>
        <p class="finding-text">${escapeHtml(v.description)}</p>
      </div>` : ''}
      ${v.remediation ? `
      <div class="finding-section" style="border-left:3px solid #22c55e;background:#f0fdf4">
        <div class="finding-section-label" style="color:#15803d">✅ Remediation</div>
        <p class="finding-text" style="color:#166534">${escapeHtml(v.remediation)}</p>
      </div>` : ''}
      <div class="finding-section" style="grid-column:1/-1;border-left:3px solid #3b82f6;background:#eff6ff;padding:8px 12px;margin-top:6px">
        <div class="finding-section-label" style="color:#1d4ed8;margin-bottom:4px">🛡 Affected Assets (${assets.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${assets.map(a => `<code style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-size:7.5pt;border:1px solid #bfdbfe">${escapeHtml(a)}</code>`).join(' ')}
        </div>
      </div>
    </div>
    <div class="finding-attrs">
      <div class="attr-item" style="grid-column:1/-1"><span class="attr-label">Affected Assets (${assets.length})</span><span class="attr-value" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">${assets.map(a => `<code>${escapeHtml(a)}</code>`).join(' ')}</span></div>
      <div class="attr-item"><span class="attr-label">CVSS Score</span><span class="attr-value" style="color:${c.fg};font-weight:800">${cvss.toFixed(1)} / 10.0 (${cvssLabel})</span></div>
      ${v.cve ? `<div class="attr-item"><span class="attr-label">CVE ID</span><span class="attr-value"><code>${escapeHtml(v.cve)}</code></span></div>` : ''}
      ${v.cwe ? `<div class="attr-item"><span class="attr-label">CWE ID</span><span class="attr-value"><code>${escapeHtml(v.cwe)}</code></span></div>` : ''}
    </div>
  </div>
</div>`;
  }).join('');

  const detailedFindingsPage = vulnerabilities.length > 0 ? `
<div class="page">
  <div class="page-header"><span>4. DETAILED FINDINGS</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">4. Detailed Findings</h2>
  <p class="narrative">
    This section provides a detailed analysis of all ${totalVulns} vulnerabilities identified during the assessment.
  </p>
  ${findingBlocks}
</div>` : '';

  /* ── Technology Fingerprint ─────────────────────────────── */
  const techSection = hasTech ? (() => {
    const techNum = toc.find(t => t.title.startsWith('Technology'))?.n || 5;
    const techCards = technologies.map(tech => {
      const iconMap = { 'Web servers': '🌐', 'JavaScript libraries': '📦', 'Programming languages': '⚙️', 'CDN': '🚀', 'Analytics': '📊', 'Security': '🛡️', 'CMS': '📝', 'Database': '🗄️', 'Miscellaneous': '🔧' };
      const icon = iconMap[tech.category] || '🔧';
      return `<div class="rec-card">
        <span class="rec-icon">${icon}</span>
        <div>
          <strong style="font-size:9pt">${escapeHtml(tech.name)}</strong>
          ${tech.version ? `<span style="font-size:7.5pt;color:#64748b;margin-left:6px">v${escapeHtml(tech.version)}</span>` : ''}
          <p style="margin:3px 0 0;font-size:7.5pt;color:#475569">
            ${escapeHtml(tech.category || 'Technology')} &nbsp;·&nbsp;
            Found on ${(tech.hosts || []).length} host${(tech.hosts || []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>`;
    }).join('');

    // Category summary table
    const catCounts = technologies.reduce((acc, t) => { acc[t.category || 'Other'] = (acc[t.category || 'Other'] || 0) + 1; return acc; }, {});
    const catRows = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) =>
      `<tr><td>${escapeHtml(cat)}</td><td style="text-align:center;font-weight:800">${cnt}</td></tr>`
    ).join('');

    return `
<div class="page">
  <div class="page-header"><span>${techNum}. TECHNOLOGY FINGERPRINT</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">${techNum}. Technology Fingerprint</h2>
  <p class="narrative">
    The following <strong>${technologies.length}</strong> technologies were detected across the attack surface.
    Outdated or vulnerable technologies may introduce security risks.
  </p>

  <div class="two-col" style="margin-bottom:16px">
    <div>
      <h3 class="sub-heading">📊 Category Breakdown</h3>
      <table class="meta-table">
        <thead><tr style="background:#f8fafc"><th style="padding:5px 8px;font-size:8pt">Category</th><th style="padding:5px 8px;font-size:8pt;text-align:center">Count</th></tr></thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>
    <div>
      <h3 class="sub-heading">⚠️ Security Note</h3>
      <div class="callout callout-high" style="margin-top:0">
        <div class="callout-icon">⚠️</div>
        <div>Review all detected technologies for known CVEs. Ensure software versions are current.
        Outdated components are a leading cause of successful attacks (OWASP A06).</div>
      </div>
    </div>
  </div>

  <h3 class="sub-heading">🛠 All Detected Technologies</h3>
  <div class="rec-grid">${techCards}</div>
</div>`;
  })() : '';

  /* ── SSL / TLS Overview ─────────────────────────────────── */
  const certSection = hasCerts ? (() => {
    const certNum = toc.find(t => t.title.startsWith('SSL'))?.n || (hasTech ? 6 : 5);
    const certRows = certificates.map((cert, idx) => {
      const h = certHealth(cert.expiry_date || cert.valid_till, cert.is_valid);
      return `<tr>
        <td class="td-num">${idx + 1}</td>
        <td class="td-title"><code>${escapeHtml(cert.domain || '—')}</code></td>
        <td style="font-size:7.5pt">${escapeHtml(cert.issuer || '—')}</td>
        <td style="font-family:monospace;font-size:7.5pt">${escapeHtml(cert.tls || '—')}</td>
        <td style="font-size:7.5pt">${cert.expiry_date || cert.valid_till ? new Date(cert.expiry_date || cert.valid_till).toLocaleDateString() : '—'}</td>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:7pt;font-weight:800;background:${h.bg};color:${h.color};border:1px solid ${h.border}">${h.label}</span></td>
      </tr>`;
    }).join('');

    return `
<div class="page">
  <div class="page-header"><span>${certNum}. SSL / TLS OVERVIEW</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">${certNum}. SSL / TLS Overview</h2>
  <p class="narrative">
    The following <strong>${certificates.length}</strong> SSL/TLS certificates were analysed.
    ${(certStats['Expired'] || 0) > 0 ? `<strong style="color:#dc2626">${certStats['Expired']} expired certificate${certStats['Expired'] > 1 ? 's' : ''}</strong> require immediate renewal.` : ''}
    ${(certStats['Expiring Soon'] || 0) > 0 ? `<strong style="color:#ea580c">${certStats['Expiring Soon']} certificate${certStats['Expiring Soon'] > 1 ? 's are' : ' is'} expiring within 30 days.</strong>` : ''}
  </p>

  <!-- Summary strip -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
    ${[
      { label: '✅ Healthy', value: certStats['Healthy'] || 0, color: '#14532d', bg: '#dcfce7', border: '#86efac' },
      { label: '⏳ Expiring Soon', value: certStats['Expiring Soon'] || 0, color: '#9a3412', bg: '#ffedd5', border: '#fdba74' },
      { label: '❌ Expired', value: certStats['Expired'] || 0, color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
    ].map(s => `<div class="info-box" style="border:1px solid ${s.border};background:${s.bg}">
      <div class="info-box-title" style="color:${s.color}">${s.label}</div>
      <div class="info-box-num" style="color:${s.color}">${s.value}</div>
    </div>`).join('')}
  </div>

  <table class="findings-summary-table">
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Domain</th>
        <th>Issuer</th>
        <th style="width:80px">TLS Version</th>
        <th style="width:90px">Expiry Date</th>
        <th style="width:100px">Health Status</th>
      </tr>
    </thead>
    <tbody>${certRows}</tbody>
  </table>
</div>`;
  })() : '';

  /* ── Hardening Recommendations ──────────────────────────── */
  const remNum = toc[toc.length - 1].n;
  const remediationPage = `
<div class="page">
  <div class="page-header"><span>${remNum}. HARDENING RECOMMENDATIONS</span><span>${escapeHtml(reportTitle)}</span></div>
  <h2 class="section-heading">${remNum}. Hardening Recommendations</h2>
  <p class="narrative">
    The following remediation roadmap prioritises findings based on risk severity and provides
    recommended timelines. All timelines should be treated as maximum deadlines.
  </p>

  <div class="roadmap-grid">
    ${[
      { icon: '🚨', label: 'IMMEDIATE',   sub: '0 – 48 hours',   color: '#dc2626', bg: '#fee2e2', cnt: countBySev.CRITICAL || 0,
        desc: `Patch or take offline all Critical vulnerabilities. These are actively exploitable and pose immediate risk. Escalate to leadership immediately.` },
      { icon: '⚠️', label: 'SHORT TERM',  sub: '7 – 14 days',    color: '#ea580c', bg: '#ffedd5', cnt: (countBySev.HIGH || 0) + (certStats['Expired'] || 0),
        desc: `Resolve all High severity vulnerabilities and renew expired SSL certificates. Implement compensating controls where patching is delayed.` },
      { icon: '🔶', label: 'MEDIUM TERM', sub: '30 – 90 days',   color: '#ca8a04', bg: '#fef9c3', cnt: (countBySev.MEDIUM || 0) + ports.filter(p => [21, 22, 23, 3306, 5432].includes(Number(p.port))).length,
        desc: `Address Medium severity findings and restrict sensitive open ports (SSH, FTP, DB) to allow-lists. Renew certificates expiring within 30 days.` },
      { icon: '📌', label: 'LONG TERM',   sub: '3 – 6 months',   color: '#15803d', bg: '#dcfce7', cnt: (countBySev.LOW || 0) + (countBySev.INFO || 0),
        desc: `Update outdated technology stacks, audit third-party dependencies, and incorporate findings into the regular security review cycle.` },
    ].map(item => `
      <div class="roadmap-card" style="border-left:5px solid ${item.color}">
        <div class="roadmap-header" style="background:${item.bg}">
          <span class="roadmap-icon">${item.icon}</span>
          <div>
            <div class="roadmap-label" style="color:${item.color}">${item.label}</div>
            <div class="roadmap-sub">${item.sub}</div>
          </div>
          <div class="roadmap-count" style="color:${item.color}">${item.cnt}<span style="font-size:8pt;font-weight:600"> items</span></div>
        </div>
        <p class="roadmap-desc">${item.desc}</p>
      </div>`).join('')}
  </div>

  <h3 class="sub-heading" style="margin-top:20px">General Asset Hardening Recommendations</h3>
  <div class="rec-grid">
    ${[
      { icon: '🔒', title: 'Reduce Attack Surface', desc: 'Decommission unused subdomains, close unnecessary ports, and remove stale endpoints.' },
      { icon: '🔑', title: 'Authentication Controls', desc: 'Enforce MFA on all exposed management interfaces and admin panels.' },
      { icon: '🛡️', title: 'Security Headers', desc: 'Deploy HSTS, CSP, X-Frame-Options, and Referrer-Policy on all web assets.' },
      { icon: '📦', title: 'Dependency Management', desc: 'Audit and update all detected technology stacks. Subscribe to CVE advisories.' },
      { icon: '🔒', title: 'TLS Hygiene', desc: 'Enforce TLS 1.2+. Disable TLS 1.0/1.1 and SSLv3. Automate certificate renewal.' },
      { icon: '🔍', title: 'Continuous Monitoring', desc: 'Schedule recurring ASM scans to detect new assets and configuration drift.' },
      { icon: '🚪', title: 'Port Restriction', desc: 'Restrict sensitive ports (22, 3306, 27017) to VPN or specific IP allow-lists only.' },
      { icon: '📋', title: 'Asset Inventory', desc: 'Maintain a live inventory of all discovered assets and their risk classification.' },
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

    /* ══ TECH / CERT / ROADMAP ═══════════════════════════════ */
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


  /* ── Assemble full HTML ──────────────────────────────────── */
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
  ${assetInventoryPage}
  ${findingsSummaryPage}
  ${detailedFindingsPage}
  ${techSection}
  ${certSection}
  ${remediationPage}
</body>
</html>`;
}
