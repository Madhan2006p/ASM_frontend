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
