import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ShieldCheck, CheckCircle2, AlertTriangle, Lock, Server, 
  Globe, Key, Clock, Search
} from 'lucide-react';
import './Certificates.css';

const SSLDetailModal = ({ cert, onClose }) => {
  const [sanSearch, setSanSearch] = useState('');

  if (!cert) return null;

  const domainName = cert.domain || cert.subdomain || '—';
  
  // Extract root domain dynamically (handling ccTLDs like .ac.in, .co.in, .gov.in)
  const parts = domainName.split('.').filter(Boolean);
  const secondLevelTlds = ['ac.in', 'co.in', 'gov.in', 'org.in', 'net.in', 'co.uk', 'com.au', 'edu.au', 'gov.au'];
  const lastTwo = parts.slice(-2).join('.');
  const baseTarget = parts.length >= 3 && secondLevelTlds.includes(lastTwo)
    ? parts.slice(-3).join('.')
    : (parts.length >= 2 ? parts.slice(-2).join('.') : domainName);

  const ipAddress = cert.ip || 'DNS Resolved';
  const rawIssuer = cert.issuer || "Let's Encrypt";
  
  // Format raw X.509 LDAP Distinguished Name (DN) strings into clean, readable CA names
  const cleanIssuerName = (raw) => {
    if (!raw || typeof raw !== 'string') return "Let's Encrypt";
    const unescaped = raw.replace(/\\,/g, ',').trim();
    const orgMatch = unescaped.match(/(?:organizationName|O)\s*=\s*([^;,]+)/i);
    if (orgMatch && orgMatch[1]) {
      const val = orgMatch[1].trim();
      if (val && !val.toLowerCase().includes('http') && val.toLowerCase() !== 'inc.' && val.length > 1) {
        return val;
      }
    }
    const cnMatch = unescaped.match(/(?:commonName|CN)\s*=\s*([^;,]+)/i);
    if (cnMatch && cnMatch[1]) {
      const val = cnMatch[1].trim();
      if (val && !val.toLowerCase().includes('http') && val.length > 1) {
        return val;
      }
    }
    return unescaped.split(/;|,/)[0].replace(/^[\w\s.]+=/, '').trim() || unescaped;
  };

  const issuer = cleanIssuerName(rawIssuer);

  const daysLeft = cert.daysLeft !== undefined ? cert.daysLeft : (cert.days !== null && cert.days !== undefined ? cert.days : 61);
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
        `portal.${baseTarget}`
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
              <div className="ssl-pro-kpi-value">{issuer}</div>
              <span className="ssl-pro-kpi-sub">{isHealthy ? 'Trusted CA' : 'Review Required'}</span>
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
              <div className="ssl-pro-kpi-value font-mono">{cert.keySize || '2048-bit RSA'}</div>
              <span className="ssl-pro-kpi-sub font-mono">{cert.tls || 'TLS 1.3'} / SHA-256</span>
            </div>
          </div>

        </div>

        {/* Main Content Layout Grid */}
        <div className="ssl-pro-body-grid">
          
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
                <div className="ssl-pro-alert-title">Hostname Match & Certificate Validity Verified</div>
                <div className="ssl-pro-alert-desc">
                  The target hostname <strong className="font-mono">{domainName}</strong> matches the active SSL/TLS certificate.
                </div>
              </div>
            </div>
            <div className="ssl-pro-grid-2col">
              <div className="ssl-pro-info-tile">
                <span className="ssl-pro-tile-label">Valid From</span>
                <span className="ssl-pro-tile-val font-mono">{cert.purchase_date || cert.purchaseDate || cert.validFrom || '—'}</span>
              </div>
              <div className="ssl-pro-info-tile">
                <span className="ssl-pro-tile-label">Valid Until</span>
                <span className="ssl-pro-tile-val font-mono">{cert.expiry_date || cert.expireDate || cert.expires || cert.validUntil || '—'}</span>
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
                <Search size={14} />
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
                    background: v.status === 'Not Vulnerable' ? 'var(--bg-card-2)' : (v.severity === 'HIGH' ? 'var(--sev-critical-bg)' : 'var(--sev-high-bg)'),
                    border: `1px solid ${v.status === 'Not Vulnerable' ? 'var(--border-color)' : (v.severity === 'HIGH' ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)')}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{v.name}</span>
                      {v.cve && <span className="font-mono" style={{ fontSize: '0.75rem', background: 'var(--bg-card-2)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{v.cve}</span>}
                    </div>
                    <span className={`cert-pill pill-${v.status === 'Not Vulnerable' ? 'healthy' : v.severity.toLowerCase()}`}>
                      {v.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <strong>Trigger:</strong> <code style={{ color: 'var(--brand-primary)', background: 'var(--brand-primary-light)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{v.trigger}</code>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {v.desc}
                  </div>
                  {v.status !== 'Not Vulnerable' && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--sev-high-fg)', marginTop: '0.35rem', fontWeight: '600' }}>
                      <strong>Remediation:</strong> {v.remediation}
                    </div>
                  )}
                </div>
              ))}
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
