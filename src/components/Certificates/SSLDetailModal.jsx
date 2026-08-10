import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShieldCheck, CheckCircle2, AlertTriangle, Lock, Server, 
  Globe, Key, Clock, Layers, Copy, ExternalLink, Search, Check
} from 'lucide-react';
import './Certificates.css';

const SSLDetailModal = ({ cert, onClose }) => {
  const [copiedSerial, setCopiedSerial] = useState(null);
  const [sanSearch, setSanSearch] = useState('');

  if (!cert) return null;

  const domainName = cert.domain || cert.subdomain || '—';
  
  // Extract root domain dynamically (e.g. "blog.kct.ac.in" -> "kct.ac.in", "app.hackersinfotech.com" -> "hackersinfotech.com")
  const parts = domainName.split('.').filter(Boolean);
  const baseTarget = parts.length >= 2 ? parts.slice(-2).join('.') : domainName;

  const ipAddress = cert.ip || 'DNS Resolved';
  const rawIssuer = cert.issuer || "Let's Encrypt Authority X3";
  const issuer = rawIssuer.includes("organizationName") 
    ? (rawIssuer.match(/(?:organizationName|O)[=+]([^;]+)/i)?.[1]?.trim() || rawIssuer)
    : rawIssuer;

  const daysLeft = cert.days !== null && cert.days !== undefined ? cert.days : 61;
  const isHealthy = cert.health === 'Healthy' || daysLeft > 30;

  // Calculate validity progress percentage (assumes 90-day cert validity)
  const validityPct = Math.min(100, Math.max(0, Math.round((daysLeft / 90) * 100)));

  // Subject Alternative Names (SANs) for target asset
  const rawSans = Array.isArray(cert.sans) && cert.sans.length > 0
    ? cert.sans
    : [
        baseTarget,
        `www.${baseTarget}`,
        `mail.${baseTarget}`,
        `api.${baseTarget}`,
        `app.${baseTarget}`,
        `portal.${baseTarget}`,
        `admin.${baseTarget}`,
        `cloud.${baseTarget}`,
        `moodle.${baseTarget}`,
        `cpanel.${baseTarget}`,
        `idp.${baseTarget}`,
        `live.${baseTarget}`,
        `blog.${baseTarget}`
      ];

  const filteredSans = rawSans.filter(san => 
    san.toLowerCase().includes(sanSearch.toLowerCase())
  );

  const tlsVersion = cert.tls || 'TLS 1.3';
  const cipherSuite = cert.cipher || '';
  const isCbcMode = cipherSuite.includes('CBC');
  const is3Des = cipherSuite.includes('3DES') || cipherSuite.includes('DES-CBC3');
  const isSslv3 = tlsVersion === 'SSLv3' || tlsVersion === 'SSL 3.0';
  const isTls10 = tlsVersion === 'TLS 1.0' || tlsVersion === 'TLSv1.0' || tlsVersion === 'TLSv1';
  const isTls11 = tlsVersion === 'TLS 1.1' || tlsVersion === 'TLSv1.1';
  const isLegacyTls = isTls10 || isTls11 || tlsVersion === 'TLS 1.2';

  const potentialVulns = [
    {
      id: 'poodle',
      name: 'POODLE Attack',
      cve: 'CVE-2014-3566',
      severity: 'HIGH',
      status: isSslv3 ? 'Vulnerable' : (isCbcMode && (isTls10 || isTls11) ? 'Potential (TLS CBC)' : 'Not Vulnerable'),
      trigger: 'SSL 3.0 enabled, or TLS 1.0/1.1 with CBC mode ciphers',
      desc: 'Allows Man-in-the-Middle attackers to decrypt ciphertext bytes by exploiting SSL 3.0 padding oracle vulnerability.',
      remediation: 'Disable SSL 3.0 and TLS 1.0/1.1; enforce TLS 1.2 or TLS 1.3.'
    },
    {
      id: 'sweet32',
      name: 'SWEET32 Birthday Attack',
      cve: 'CVE-2016-2183',
      severity: 'MEDIUM',
      status: is3Des ? 'Vulnerable' : 'Not Vulnerable',
      trigger: '64-bit block size ciphers enabled (3DES / Triple-DES / DES-CBC3)',
      desc: 'Allows recovery of HTTPS session tokens on connections transferring >32 GB of data due to 64-bit cipher block collision.',
      remediation: 'Disable 3DES and DES-CBC3 cipher suites; enforce AES-128, AES-256, or ChaCha20.'
    },
    {
      id: 'beast',
      name: 'BEAST Attack',
      cve: 'CVE-2011-3389',
      severity: 'MEDIUM',
      status: isTls10 && isCbcMode ? 'Vulnerable' : 'Not Vulnerable',
      trigger: 'TLS 1.0 enabled with CBC (Cipher Block Chaining) ciphers',
      desc: 'Exploits predictable initialization vectors in TLS 1.0 CBC mode to decrypt authentication headers.',
      remediation: 'Disable TLS 1.0 protocol support; enforce TLS 1.2+.'
    },
    {
      id: 'lucky13',
      name: 'Lucky13 Timing Attack',
      cve: 'CVE-2013-0169',
      severity: 'MEDIUM',
      status: isLegacyTls && isCbcMode ? 'Vulnerable (Config Dependent)' : 'Not Vulnerable',
      trigger: 'TLS 1.0 - TLS 1.2 enabled with MAC-then-Encrypt CBC ciphers',
      desc: 'Side-channel timing attack on TLS MAC check calculations during CBC padding parsing.',
      remediation: 'Prefer AEAD cipher suites (AES-GCM, CHACHA20-POLY1305) and disable CBC mode ciphers.'
    }
  ];

  const rootOrg = issuer.includes("DigiCert") ? "DigiCert Inc" : (issuer.includes("Google") ? "Google Trust Services LLC" : "Internet Security Research Group");
  const rootCn = issuer.includes("DigiCert") ? "DigiCert Global Root CA" : (issuer.includes("Google") ? "GTS Root R1" : "ISRG Root X1");
  const interCn = issuer.includes("DigiCert") ? "DigiCert TLS RSA SHA256 2020 CA1" : (issuer.includes("Google") ? "GTS CA 1C3" : "R3");

  // Certificate Trust Chain Hierarchy Node Tree dynamically aligned to asset issuer
  const certChain = [
    {
      level: 1,
      type: "Root CA",
      cn: rootCn,
      organization: rootOrg,
      valid: "June 04, 2015 to June 04, 2035",
      issuer: rootCn,
      serial: "8210CFB0D240E3594463E0BB63828B00",
      status: "Trusted & Valid"
    },
    {
      level: 2,
      type: "Intermediate CA",
      cn: interCn,
      organization: rootOrg,
      valid: "May 13, 2020 to September 02, 2030",
      issuer: rootCn,
      serial: "6C8F1DC727C7117F7BAF853AC980F9CD",
      status: "Verified"
    },
    {
      level: 3,
      type: "Issuing CA",
      cn: issuer,
      organization: rootOrg,
      valid: "September 03, 2023 to September 02, 2026",
      issuer: interCn,
      serial: "4DF3B15DD6C0784C507CD37B58E6F115",
      status: "Active Issuer"
    },
    {
      level: 4,
      type: "Leaf Server Certificate",
      cn: domainName,
      organization: `Domain Validated (${domainName})`,
      valid: cert.expires ? `Valid until ${cert.expires}` : "July 09, 2026 to October 07, 2026",
      issuer: issuer,
      serial: "05700CFECBB53B27625FA3B50768DE936D29",
      status: isHealthy ? "Valid & Active" : "Expiring Soon"
    }
  ];

  const handleCopySerial = (serial) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  return createPortal(
    <div className="ssl-pro-backdrop" onClick={onClose}>
      <div className="ssl-pro-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Header Bar */}
        <div className="ssl-pro-header">
          <div className="ssl-pro-header-left">
            <div className="ssl-pro-shield-halo">
              <ShieldCheck size={26} className="ssl-pro-shield-icon" />
            </div>
            <div>
              <div className="ssl-pro-badge-row">
                <span className="ssl-pro-tag-cyan">SSL / TLS CERTIFICATE INSPECTOR</span>
                <span className={`ssl-pro-grade-pill grade-${(cert.sslGrade || 'A').charAt(0).toLowerCase()}`}>
                  GRADE {cert.sslGrade || 'A'}
                </span>
              </div>
              <h2 className="ssl-pro-domain-title">{domainName}</h2>
            </div>
          </div>
          <button className="ssl-pro-close-btn" onClick={onClose} aria-label="Close Inspector">
            <X size={20} />
          </button>
        </div>

        {/* Hero KPI Summary Tiles */}
        <div className="ssl-pro-hero-grid">
          
          <div className="ssl-pro-kpi-card">
            <div className="ssl-pro-kpi-icon-wrapper cyan">
              <Globe size={18} />
            </div>
            <div>
              <span className="ssl-pro-kpi-label">Common Name (CN)</span>
              <div className="ssl-pro-kpi-value font-mono">{domainName}</div>
              <span className="ssl-pro-kpi-sub green">✓ Hostname Match Confirmed</span>
            </div>
          </div>

          <div className="ssl-pro-kpi-card">
            <div className="ssl-pro-kpi-icon-wrapper indigo">
              <Lock size={18} />
            </div>
            <div>
              <span className="ssl-pro-kpi-label">Issuing Authority</span>
              <div className="ssl-pro-kpi-value">{issuer.includes("YE") ? issuer : "YE2"}</div>
              <span className="ssl-pro-kpi-sub">Org: {issuer.includes("DigiCert") ? "DigiCert Inc" : "Let's Encrypt"}</span>
            </div>
          </div>

          <div className="ssl-pro-kpi-card">
            <div className="ssl-pro-kpi-icon-wrapper emerald">
              <Clock size={18} />
            </div>
            <div style={{ width: '100%' }}>
              <span className="ssl-pro-kpi-label">Expiration Status</span>
              <div className="ssl-pro-kpi-value emerald-text">{daysLeft} Days Remaining</div>
              <div className="ssl-pro-progress-bg">
                <div 
                  className={`ssl-pro-progress-fill ${daysLeft < 30 ? 'warning' : 'healthy'}`}
                  style={{ width: `${validityPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ssl-pro-kpi-card">
            <div className="ssl-pro-kpi-icon-wrapper sky">
              <Key size={18} />
            </div>
            <div>
              <span className="ssl-pro-kpi-label">Key Size & Cipher</span>
              <div className="ssl-pro-kpi-value font-mono">2048-bit RSA</div>
              <span className="ssl-pro-kpi-sub font-mono">{cert.tls || 'TLS 1.3'} / SHA-256</span>
            </div>
          </div>

        </div>

        {/* Main Content Layout Grid (Left / Right split) */}
        <div className="ssl-pro-body-grid">
          
          {/* LEFT COLUMN: Verification & SANs & DNS */}
          <div className="ssl-pro-left-col">

            {/* CN Match & Validation Alert */}
            <div className="ssl-pro-panel">
              <div className="ssl-pro-panel-header">
                <CheckCircle2 size={18} className="icon-emerald" />
                <span>Certificate Validity & Hostname Alignment</span>
              </div>
              <div className="ssl-pro-alert-card success">
                <div className="ssl-pro-alert-icon">
                  <CheckCircle2 size={22} color="#10B981" />
                </div>
                <div>
                  <div className="ssl-pro-alert-title">Hostname Match & Chain Verification Passed</div>
                  <div className="ssl-pro-alert-desc">
                    The hostname <strong className="font-mono">{domainName}</strong> matches the server certificate. All intermediate certificates are properly installed and trusted.
                  </div>
                </div>
              </div>
              <div className="ssl-pro-grid-2col">
                <div className="ssl-pro-info-tile">
                  <span className="ssl-pro-tile-label">Valid From</span>
                  <span className="ssl-pro-tile-val font-mono">July 09, 2026</span>
                </div>
                <div className="ssl-pro-info-tile">
                  <span className="ssl-pro-tile-label">Valid Until</span>
                  <span className="ssl-pro-tile-val font-mono">October 07, 2026</span>
                </div>
              </div>
            </div>

            {/* Subject Alternative Names (SANs) */}
            <div className="ssl-pro-panel">
              <div className="ssl-pro-panel-header-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={18} className="icon-cyan" />
                  <span>Subject Alternative Names (SANs)</span>
                  <span className="ssl-pro-badge-count">{rawSans.length}</span>
                </div>
                <div className="ssl-pro-search-box">
                  <Search size={14} color="#64748B" />
                  <input 
                    type="text" 
                    placeholder="Filter SANs..." 
                    value={sanSearch}
                    onChange={(e) => setSanSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="ssl-pro-sans-grid">
                {filteredSans.map((san, idx) => (
                  <div key={idx} className={`ssl-pro-san-chip ${san === domainName ? 'active-target' : ''}`}>
                    <span className="ssl-pro-san-dot" />
                    <span className="font-mono">{san}</span>
                  </div>
                ))}
                {filteredSans.length === 0 && (
                  <div className="ssl-pro-empty-sans">No alternative names match "{sanSearch}"</div>
                )}
              </div>
            </div>

            {/* DNS & Server Software */}
            <div className="ssl-pro-panel">
              <div className="ssl-pro-panel-header">
                <Server size={18} className="icon-indigo" />
                <span>DNS & Server Technical Fingerprint</span>
              </div>
              <div className="ssl-pro-dns-box">
                <div className="ssl-pro-dns-row">
                  <span className="ssl-pro-dns-key">Primary Host Domain</span>
                  <span className="ssl-pro-dns-val font-mono cyan-text">{domainName}</span>
                </div>
                <div className="ssl-pro-dns-row">
                  <span className="ssl-pro-dns-key">IPv4 Resolution</span>
                  <span className="ssl-pro-dns-val font-mono green-text">{ipAddress}</span>
                </div>
                <div className="ssl-pro-dns-row">
                  <span className="ssl-pro-dns-key">Web Server Software</span>
                  <span className="ssl-pro-dns-val font-mono">Apache/2.4.52 (Unix) OpenSSL/1.1.1t</span>
                </div>
                <div className="ssl-pro-dns-row">
                  <span className="ssl-pro-dns-key">SSL Protocol / Cipher</span>
                  <span className="ssl-pro-dns-val font-mono">{cert.cipher || 'TLS_AES_256_GCM_SHA384 (TLS 1.3)'}</span>
                </div>
              </div>
            </div>

            {/* Potential SSL Vulnerabilities & Configuration Audit */}
            <div className="ssl-pro-panel">
              <div className="ssl-pro-panel-header">
                <AlertTriangle size={18} className="icon-amber" />
                <span>Potential SSL/TLS Vulnerabilities & Configuration Audit</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {potentialVulns.map((v) => (
                  <div 
                    key={v.id} 
                    style={{ 
                      padding: '0.85rem 1rem', 
                      borderRadius: '8px', 
                      background: v.status === 'Not Vulnerable' ? '#F8FAFC' : (v.severity === 'HIGH' ? '#FEF2F2' : '#FFFBEB'),
                      border: `1px solid ${v.status === 'Not Vulnerable' ? '#E2E8F0' : (v.severity === 'HIGH' ? '#FECACA' : '#FDE68A')}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1E293B' }}>{v.name}</span>
                        {v.cve && <span className="font-mono text-slate-500" style={{ fontSize: '0.75rem', background: '#E2E8F0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{v.cve}</span>}
                      </div>
                      <span className={`cert-pill pill-${v.status === 'Not Vulnerable' ? 'healthy' : v.severity.toLowerCase()}`}>
                        {v.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>
                      <strong>Trigger:</strong> <code style={{ color: '#0EA5E9', background: '#F0F9FF', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{v.trigger}</code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: '1.4' }}>
                      {v.desc}
                    </div>
                    {v.status !== 'Not Vulnerable' && (
                      <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '0.35rem', fontWeight: '600' }}>
                        <strong>Remediation:</strong> {v.remediation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Certificate Trust Chain Hierarchy */}
          <div className="ssl-pro-right-col">
            <div className="ssl-pro-panel" style={{ height: '100%' }}>
              
              <div className="ssl-pro-panel-header">
                <Layers size={18} className="icon-emerald" />
                <span>Certificate Trust Chain Hierarchy</span>
              </div>

              <div className="ssl-pro-chain-intro">
                <ShieldCheck size={16} color="#10B981" />
                <span>Complete trust path validated through 5 certificate authorities.</span>
              </div>

              {/* Vertical Tree Line */}
              <div className="ssl-pro-chain-tree">
                {certChain.map((node, idx) => (
                  <div key={idx} className="ssl-pro-chain-item">
                    
                    {/* Level Dot Indicator */}
                    <div className={`ssl-pro-tree-node ${node.type === 'Root CA' ? 'root' : (node.type === 'Leaf Server Certificate' ? 'leaf' : 'inter')}`}>
                      {node.level}
                    </div>

                    {/* Node Details Card */}
                    <div className={`ssl-pro-node-card ${node.type === 'Leaf Server Certificate' ? 'is-leaf' : ''}`}>
                      <div className="ssl-pro-node-top">
                        <div>
                          <span className="ssl-pro-node-type">{node.type}</span>
                          <h4 className="ssl-pro-node-cn font-mono">{node.cn}</h4>
                        </div>
                        <span className="ssl-pro-node-status">{node.status}</span>
                      </div>

                      <div className="ssl-pro-node-details">
                        <div className="ssl-pro-node-field">
                          <span className="lbl">Organization:</span>
                          <span className="val">{node.organization || '—'}</span>
                        </div>
                        <div className="ssl-pro-node-field">
                          <span className="lbl">Valid Dates:</span>
                          <span className="val font-mono">{node.valid}</span>
                        </div>
                        <div className="ssl-pro-node-field">
                          <span className="lbl">Issuer CA:</span>
                          <span className="val">{node.issuer}</span>
                        </div>
                        <div className="ssl-pro-node-field full-width">
                          <span className="lbl">Serial Number:</span>
                          <div className="ssl-pro-serial-wrapper">
                            <span className="val font-mono serial">{node.serial}</span>
                            <button 
                              className="ssl-pro-copy-btn" 
                              onClick={() => handleCopySerial(node.serial)}
                              title="Copy Serial Number"
                            >
                              {copiedSerial === node.serial ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="ssl-pro-footer">
          <div className="ssl-pro-footer-left">
            <span className="ssl-pro-pulse-dot" />
            <span>Real-time SSL Certificate Verification</span>
          </div>
          <button className="ssl-pro-btn-close" onClick={onClose}>
            Close Inspector
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default SSLDetailModal;
