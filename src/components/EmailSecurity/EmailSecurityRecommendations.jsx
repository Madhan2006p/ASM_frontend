import React from 'react';
import { ArrowLeft, ShieldAlert, XCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

/**
 * EmailSecurityRecommendations — Full page component (NOT a modal).
 *
 * Rendered by App.jsx when activePage === 'Email Security Recommendation'.
 *
 * Props:
 *   rec          — the recommendation object for the selected module
 *   onBack       — callback to return to 'Email Security' page
 *
 * Also exports:
 *   buildRecommendations(result) — derives per-protocol recs from a live scan result
 */

// ─── Severity metadata ────────────────────────────────────────────────────────
export const SEVERITY_META = {
  critical: {
    label: 'Critical',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.30)',
    icon: <ShieldAlert size={15} />,
  },
  high: {
    label: 'High',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.10)',
    border: 'rgba(249,115,22,0.30)',
    icon: <XCircle size={15} />,
  },
  medium: {
    label: 'Medium',
    color: '#fab333',
    bg: 'rgba(250,179,51,0.10)',
    border: 'rgba(250,179,51,0.30)',
    icon: <AlertTriangle size={15} />,
  },
  low: {
    label: 'Low',
    color: '#00bfff',
    bg: 'rgba(0,191,255,0.10)',
    border: 'rgba(0,191,255,0.25)',
    icon: <Info size={15} />,
  },
  info: {
    label: 'Good',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.25)',
    icon: <CheckCircle2 size={15} />,
  },
};

// ─── Build per-protocol recommendations from live result ──────────────────────
export function buildRecommendations(result) {
  if (!result) return [];

  const recs = [];

  const hasRecord = (val) => {
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  };

  const getRecordText = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join(' ');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  // ── DMARC ─────────────────────────────────────────────────────────────────
  const dmarcText = getRecordText(result.dmarc);

  if (!hasRecord(result.dmarc)) {
    recs.push({
      id: 'dmarc-missing',
      protocol: 'DMARC',
      severity: 'critical',
      finding: 'DMARC record is not configured',
      whyMatters:
        'Without a DMARC record, there is nothing stopping malicious actors from crafting emails that appear to originate from your domain. Phishing campaigns using your domain can damage your brand reputation, compromise your customers, and lead to regulatory consequences.',
      action:
        'Publish a DMARC TXT record at _dmarc.<yourdomain>. Begin with p=none to collect reports without impacting mail flow, then move to p=quarantine and finally p=reject once all legitimate sources pass SPF/DKIM.',
      fix:
        '_dmarc.<yourdomain>  IN TXT\n"v=DMARC1; p=none; rua=mailto:dmarc-reports@<yourdomain>; ruf=mailto:dmarc-failures@<yourdomain>; sp=none; adkim=r; aspf=r"\n\nOnce reports are reviewed and all legitimate sources pass:\n"v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@<yourdomain>; adkim=s; aspf=s"',
      benefit:
        'Prevents spoofed emails from reaching recipients and gives you full visibility into who is sending email on behalf of your domain.',
    });
  } else if (dmarcText && !dmarcText.toLowerCase().includes('p=reject')) {
    const currentPolicy = dmarcText.match(/p=(\w+)/i)?.[1] || 'none/quarantine';
    recs.push({
      id: 'dmarc-weak',
      protocol: 'DMARC',
      severity: 'high',
      finding: `DMARC policy is set to p=${currentPolicy} — not fully enforced`,
      whyMatters:
        `A DMARC policy of p=${currentPolicy} means receiving mail servers will not outright reject emails that fail DMARC authentication. Attackers can still successfully deliver spoofed emails to many recipients under this policy.`,
      action:
        'Review your DMARC aggregate reports (rua) to identify all legitimate mail-sending services. Once they all pass SPF and/or DKIM, change the policy to p=reject.',
      fix:
        `Current record includes: p=${currentPolicy}\n\nTarget record:\n_dmarc.<yourdomain>  IN TXT\n"v=DMARC1; p=reject; sp=reject;\n  rua=mailto:dmarc-reports@<yourdomain>;\n  ruf=mailto:dmarc-failures@<yourdomain>;\n  adkim=s; aspf=s; pct=100"`,
      benefit:
        'Receiving servers will reject emails that fail DMARC, completely preventing spoofed emails from reaching inboxes.',
    });
  } else {
    recs.push({
      id: 'dmarc-ok',
      protocol: 'DMARC',
      severity: 'info',
      finding: 'DMARC is configured with p=reject',
      whyMatters:
        'Your DMARC policy is set to p=reject, which is the strongest enforcement level. Email sources not passing SPF or DKIM will be rejected by receiving servers.',
      action:
        'Regularly review DMARC aggregate reports to track authentication pass rates and catch any new legitimate sending services that may need to be added to SPF/DKIM.',
      fix:
        '• Monitor rua report inbox weekly\n• Ensure new ESP integrations are added to SPF includes\n• Rotate DKIM keys at least annually\n• Keep ruf (forensic) reports enabled for failure analysis',
      benefit:
        'Continued monitoring ensures your email ecosystem remains healthy and new threats are identified early.',
    });
  }

  // ── SPF ───────────────────────────────────────────────────────────────────
  const spfText = getRecordText(result.spf);

  if (!hasRecord(result.spf)) {
    recs.push({
      id: 'spf-missing',
      protocol: 'SPF',
      severity: 'high',
      finding: 'SPF record is not configured',
      whyMatters:
        'Without SPF, any mail server on the internet can claim to send email on behalf of your domain. This makes phishing and spam spoofing trivially easy and hurts your domain reputation with receiving mail providers.',
      action:
        'Create an SPF TXT record at your domain root listing all authorized sending sources, then end with -all to reject all others.',
      fix:
        '<yourdomain>  IN TXT\n"v=spf1 mx ip4:<your-mail-server-IP> include:<your-esp-domain> -all"\n\nExamples:\n"v=spf1 include:_spf.google.com include:sendgrid.net -all"\n"v=spf1 mx ip4:203.0.113.5 -all"',
      benefit:
        'Receiving mail servers can verify that emails are sent from authorized sources, improving deliverability and reducing spoofing.',
    });
  } else if (spfText.includes('+all') || spfText.includes('?all')) {
    recs.push({
      id: 'spf-pass-all',
      protocol: 'SPF',
      severity: 'critical',
      finding: `SPF uses ${spfText.includes('+all') ? '+all' : '?all'} — allows all mail servers`,
      whyMatters:
        'Using "+all" or "?all" tells receiving servers that any mail server is authorized to send on your behalf. This negates the entire purpose of SPF and leaves your domain completely open to spoofing.',
      action:
        'Immediately replace the trailing "+all" or "?all" with "-all" after listing only your authorized mail sources.',
      fix:
        'INCORRECT (current):\n"v=spf1 ... +all"   ← any server allowed\n\nCORRECT (replace with):\n"v=spf1 mx ip4:<authorized-IPs> include:<your-ESPs> -all"',
      benefit:
        'Servers not in your authorized list will be rejected, preventing spoofing of your domain.',
    });
  } else if (spfText.includes('~all')) {
    recs.push({
      id: 'spf-softfail',
      protocol: 'SPF',
      severity: 'medium',
      finding: 'SPF uses ~all (SoftFail) — unauthorized senders may still be delivered',
      whyMatters:
        'The "~all" SoftFail mechanism marks emails from unauthorized sources as suspicious but many receiving servers still deliver them to the inbox. This allows spoofed emails to reach recipients.',
      action:
        'Audit all mail services sending from your domain (ESPs, ticketing systems, CRMs, etc.) and ensure they are in your SPF record. Then switch from "~all" to "-all".',
      fix:
        'Current: "v=spf1 ... ~all"\n\nChange to: "v=spf1 ... -all"\n\nTest first with: mxtoolbox.com/spf or dmarcian.com/spf-survey',
      benefit:
        'Unauthorized senders will be rejected rather than flagged, greatly reducing spoofing risk.',
    });
  } else {
    recs.push({
      id: 'spf-ok',
      protocol: 'SPF',
      severity: 'info',
      finding: 'SPF is configured with -all (HardFail)',
      whyMatters:
        'Your SPF record is correctly configured. Keeping it accurate is important — stale entries for decommissioned mail services waste your 10-lookup limit and can cause legitimate mail failures.',
      action:
        'Review your SPF record quarterly. Remove any include: entries for services no longer in use and add new ESP/CRM integrations.',
      fix:
        '• Keep DNS lookup count below 10 (use SPF flattening tools if needed)\n• Remove obsolete ip4:/ip6: ranges and include: directives\n• Add new authorized services (ESPs, support tools) promptly\n• Test after every change with: mxtoolbox.com/spf',
      benefit:
        'A lean, accurate SPF record improves deliverability and ensures the domain remains protected as your email stack evolves.',
    });
  }

  // ── DKIM ──────────────────────────────────────────────────────────────────
  if (!hasRecord(result.dkim_default) && !hasRecord(result.dkim_selector1)) {
    recs.push({
      id: 'dkim-missing',
      protocol: 'DKIM',
      severity: 'high',
      finding: 'No DKIM record found for default or selector1 selectors',
      whyMatters:
        'Without DKIM, emails from your domain cannot be verified as unaltered in transit. This reduces your domain reputation with receiving providers, increases spam scoring, and means DMARC cannot rely on DKIM as an authentication method.',
      action:
        'Generate a 2048-bit RSA DKIM key pair in your mail server or ESP, publish the public key as a DNS TXT record, and configure your mail server to sign all outbound messages.',
      fix:
        'default._domainkey.<yourdomain>  IN TXT\n"v=DKIM1; k=rsa; p=<base64-encoded-public-key>"\n\nFor Google Workspace: Admin Console → Apps → Gmail → Authenticate email\nFor Microsoft 365: Admin Center → Exchange → DomainKeys\nFor SendGrid: Settings → Sender Authentication',
      benefit:
        'Cryptographic signing proves emails have not been altered in transit and strengthens DMARC authentication.',
    });
  } else {
    recs.push({
      id: 'dkim-ok',
      protocol: 'DKIM',
      severity: 'info',
      finding: 'DKIM record is configured',
      whyMatters:
        'DKIM is configured, which is great. However, long-lived DKIM keys become a liability over time — if the private key is ever compromised, attackers can sign emails that will pass DKIM verification.',
      action:
        'Rotate DKIM keys at least once per year. Publish the new key under a new selector, switch your mail server to sign with the new key, then remove the old DNS record after propagation.',
      fix:
        '• Generate new key pair annually\n• Publish new public key: new-selector._domainkey.<domain>\n• Switch mail server to new selector\n• Wait for TTL to expire, then remove old selector record\n• Verify all outbound streams (ESPs, CRMs, ticketing) are DKIM-signed',
      benefit:
        'Regular key rotation limits exposure if a private key is ever compromised and keeps your signing infrastructure healthy.',
    });
  }

  // ── BIMI ──────────────────────────────────────────────────────────────────
  if (!hasRecord(result.bimi)) {
    recs.push({
      id: 'bimi-missing',
      protocol: 'BIMI',
      severity: 'low',
      finding: 'BIMI record is not configured',
      whyMatters:
        'BIMI (Brand Indicators for Message Identification) increases brand trust by displaying your logo in supported email clients (Gmail, Apple Mail, Yahoo). It also signals a high email security posture to ISPs.',
      action:
        'Ensure DMARC is at p=quarantine or p=reject, prepare an SVG Tiny 1.2 logo, optionally obtain a Verified Mark Certificate (VMC), then publish the BIMI TXT record.',
      fix:
        'Prerequisites:\n• DMARC p=quarantine or p=reject\n• SVG Tiny 1.2 logo at public HTTPS URL\n• (Optional) VMC from DigiCert or Entrust\n\nDNS record:\ndefault._bimi.<yourdomain>  IN TXT\n"v=BIMI1; l=https://<yourdomain>/bimi-logo.svg; a=<VMC-URL>"',
      benefit:
        'Brand logo shown in email clients increases recipient confidence, open rates, and reduces phishing confusion.',
    });
  } else {
    recs.push({
      id: 'bimi-ok',
      protocol: 'BIMI',
      severity: 'info',
      finding: 'BIMI record is configured',
      whyMatters:
        'BIMI is active, which enhances brand trust in email clients. If the logo URL becomes unreachable or DMARC policy is weakened, BIMI will stop working silently.',
      action:
        'Periodically verify the SVG logo URL is publicly accessible over HTTPS and that your DMARC policy remains at p=reject.',
      fix:
        '• Verify logo URL: curl -I https://<yourdomain>/bimi-logo.svg\n• Confirm DMARC stays at p=reject\n• Renew VMC before expiry (if using Verified Mark Certificate)\n• Test BIMI with: bimigroup.org/bimi-lookup',
      benefit:
        'Continuous brand logo display in email clients, reinforcing recipient trust for every email sent.',
    });
  }

  // ── MX ────────────────────────────────────────────────────────────────────
  if (!hasRecord(result.mx)) {
    recs.push({
      id: 'mx-missing',
      protocol: 'MX',
      severity: 'high',
      finding: 'No MX records found for this domain',
      whyMatters:
        'If this domain is not intended to receive email, it is still vulnerable to being used in spoofing attacks. Without a null MX and strict SPF/DMARC, attackers can craft convincing phishing emails from this domain.',
      action:
        'Publish a null MX (priority 0) to signal this domain does not accept email. Combine with v=spf1 -all and a DMARC p=reject record.',
      fix:
        'Null MX:\n<yourdomain>  IN MX  0 .\n\nSPF (no senders):\n<yourdomain>  IN TXT  "v=spf1 -all"\n\nDMARC:\n_dmarc.<yourdomain>  IN TXT\n"v=DMARC1; p=reject; sp=reject"',
      benefit:
        'Clearly signals that no email should originate from this domain, blocking spoofing and protecting your brand.',
    });
  } else {
    const mxCount = Array.isArray(result.mx) ? result.mx.length : 1;
    if (mxCount === 1) {
      recs.push({
        id: 'mx-single',
        protocol: 'MX',
        severity: 'low',
        finding: 'Only one MX server configured — no redundancy',
        whyMatters:
          'With only one MX server, any downtime — planned or unplanned — will cause inbound email to fail delivery. Sending servers will retry for up to 5 days but mail may be lost if the outage is long.',
        action:
          'Configure a backup mail server and publish it as a secondary MX record with a higher priority number.',
        fix:
          '<yourdomain>  IN MX  10 mail.<yourdomain>.    ← primary\n<yourdomain>  IN MX  20 mail2.<yourdomain>.   ← backup\n\nEnsure the backup server accepts and queues mail when the primary is unavailable.',
        benefit:
          'Inbound email continues to be delivered even during primary mail server outages.',
      });
    } else {
      recs.push({
        id: 'mx-ok',
        protocol: 'MX',
        severity: 'info',
        finding: `${mxCount} MX records configured`,
        whyMatters:
          'Multiple MX records provide good redundancy. However, stale or unreachable MX entries can slow mail delivery as sending servers attempt to connect to them before failing over.',
        action:
          'Periodically verify all MX hosts resolve and accept connections on port 25. Remove any decommissioned mail server entries.',
        fix:
          '• Test each MX host: telnet <mx-host> 25\n• Check MX priority ordering is correct\n• Remove any decommissioned servers\n• Verify each host has valid reverse DNS (PTR record)',
        benefit:
          'Reliable, fast inbound email delivery with clean fallback behaviour.',
      });
    }
  }

  // ── STARTTLS ──────────────────────────────────────────────────────────────
  const starttls = result.smtp_starttls;
  if (starttls) {
    if (!starttls.checked) {
      recs.push({
        id: 'starttls-unchecked',
        protocol: 'STARTTLS',
        severity: 'medium',
        finding: 'STARTTLS status could not be verified (server unreachable)',
        whyMatters:
          'STARTTLS encrypts SMTP sessions between mail servers, protecting email content from eavesdropping in transit. Without TLS, all email is transmitted in plaintext between servers.',
        action:
          'Manually test STARTTLS support and ensure your mail server is configured to advertise and require TLS.',
        fix:
          'Test manually:\nopenssl s_client -starttls smtp -connect mail.<yourdomain>:25\n\nIf not supported, configure TLS in your mail server:\n• Postfix: smtpd_tls_security_level = may\n• Exchange: Enable TLS on Receive/Send Connectors\n\nConsider MTA-STS to enforce TLS policy.',
        benefit:
          'Email in transit is encrypted, preventing eavesdropping and man-in-the-middle attacks between mail servers.',
      });
    } else if (!starttls.supported) {
      recs.push({
        id: 'starttls-unsupported',
        protocol: 'STARTTLS',
        severity: 'high',
        finding: 'STARTTLS is not supported — email in transit is unencrypted',
        whyMatters:
          'Without STARTTLS, all email content is exposed in plaintext between mail servers. Any network-level attacker can read or modify email content.',
        action:
          'Enable STARTTLS on your SMTP server and configure it to advertise the STARTTLS capability. Consider also implementing MTA-STS to prevent TLS downgrade attacks.',
        fix:
          'Postfix:\nsmtpd_tls_security_level = may\nsmtpd_tls_cert_file = /etc/ssl/certs/mail.crt\nsmtpd_tls_key_file = /etc/ssl/private/mail.key\n\nExchange: Receive Connector → Auth: TLS\n\nMTA-STS (RFC 8461):\n_mta-sts.<domain>  IN TXT  "v=STSv1; id=<timestamp>"\nhttps://mta-sts.<domain>/.well-known/mta-sts.txt',
        benefit:
          'Email encrypted in transit between mail servers, protecting content from interception and tampering.',
      });
    } else {
      recs.push({
        id: 'starttls-ok',
        protocol: 'STARTTLS',
        severity: 'info',
        finding: 'STARTTLS is supported',
        whyMatters:
          'STARTTLS is supported, which provides opportunistic encryption. However, without MTA-STS, a network attacker could strip the STARTTLS advertisement and force plaintext delivery.',
        action:
          'Publish an MTA-STS policy and TLS-RPT record to enforce TLS for all inbound connections and receive reports on failures.',
        fix:
          'MTA-STS DNS record:\n_mta-sts.<domain>  IN TXT  "v=STSv1; id=<yyyymmddHHMM>"\n\nPolicy file at https://mta-sts.<domain>/.well-known/mta-sts.txt:\nversion: STSv1\nmode: enforce\nmx: mail.<domain>\nmax_age: 86400\n\nTLS-RPT:\n_smtp._tls.<domain>  IN TXT\n"v=TLSRPTv1; rua=mailto:tlsrpt@<domain>"',
        benefit:
          'Sending servers will refuse to deliver mail if TLS cannot be established, preventing downgrade attacks.',
      });
    }
  }

  return recs;
}

// ─── Recommendation Page Component ───────────────────────────────────────────
const EmailSecurityRecommendations = ({ rec, onBack }) => {
  if (!rec) {
    return (
      <div className="es-rec-page">
        <div className="es-rec-page-inner">
          <button className="es-rec-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Email Security
          </button>
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            No recommendation found.
          </div>
        </div>
      </div>
    );
  }

  const meta = SEVERITY_META[rec.severity] || SEVERITY_META.low;

  return (
    <div className="es-rec-page">
      <div className="es-rec-page-inner">
        {/* Back button */}
        <button className="es-rec-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Email Security
        </button>

        {/* Page header */}
        <div className="es-rec-page-header">
          <div className="es-rec-page-title">Security Recommendation</div>
          <div className="es-rec-page-badges">
            <span
              className="es-rec-protocol-badge"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              {rec.protocol}
            </span>
            <span
              className="es-rec-severity-badge"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              {meta.icon}
              <span>{meta.label}</span>
            </span>
          </div>
        </div>

        {/* Content card */}
        <div className="es-rec-page-card">
          {/* Finding */}
          <div className="es-rec-page-section">
            <div className="es-rec-page-section-label">Finding</div>
            <div className="es-rec-page-section-value">{rec.finding}</div>
          </div>

          <div className="es-rec-page-divider" />

          {/* Why this matters */}
          <div className="es-rec-page-section">
            <div className="es-rec-page-section-label">Why This Matters</div>
            <div className="es-rec-page-section-text">{rec.whyMatters}</div>
          </div>

          <div className="es-rec-page-divider" />

          {/* Recommended Action */}
          <div className="es-rec-page-section">
            <div className="es-rec-page-section-label">Recommended Action</div>
            <div className="es-rec-page-section-text">{rec.action}</div>
          </div>

          <div className="es-rec-page-divider" />

          {/* Remediation */}
          <div className="es-rec-page-section">
            <div className="es-rec-page-section-label">Remediation</div>
            <pre className="es-rec-page-code">{rec.fix}</pre>
          </div>

          <div className="es-rec-page-divider" />

          {/* Expected Security Benefit */}
          <div className="es-rec-page-section">
            <div className="es-rec-page-section-label">Expected Security Benefit</div>
            <div className="es-rec-page-section-text">{rec.benefit}</div>
          </div>
        </div>

        {/* Bottom back button */}
        <div style={{ marginTop: '2rem' }}>
          <button className="es-rec-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Email Security
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailSecurityRecommendations;
