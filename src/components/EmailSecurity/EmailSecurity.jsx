import React, { useState, useEffect } from 'react';
import { Mail, Shield, CheckCircle2, AlertTriangle, ShieldCheck, XCircle, Clock, RefreshCw, Key, Server, Lock } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import './EmailSecurity.css';
import { api } from '../../utils/api';

const EmailSecurity = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmailSecurity = async () => {
      if (!activeScanId) {
        setResult(null);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/email-security/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        if (list.length > 0) {
          setResult(list[0]); // load latest email security findings
        } else {
          setResult(null);
        }
      } catch (e) {
        console.error("Failed to load email security findings", e);
        setResult(null);
      } finally {
        setLoading(false);
      }
    };
    loadEmailSecurity();
  }, [activeScanId]);

  const renderStatus = (isValid, label) => {
    if (isValid) {
      return (
        <span className="es-badge-valid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontSize: '0.75rem', fontWeight: 'bold' }}>
          <CheckCircle2 size={12} /> {label || 'Valid'}
        </span>
      );
    }
    return (
      <span className="es-badge-invalid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
        <XCircle size={12} /> {label || 'Missing / Weak'}
      </span>
    );
  };

  const getRecordText = (arr) => {
    if (!arr) return 'None found';
    if (Array.isArray(arr)) {
      return arr.length > 0 ? arr.join('\n') : 'None found';
    }
    if (typeof arr === 'object') {
      return JSON.stringify(arr, null, 2);
    }
    return arr.toString();
  };

  const hasRecord = (arr) => {
    if (!arr) return false;
    if (Array.isArray(arr)) return arr.length > 0;
    return true;
  };

  return (
    <div className="email-security-container">
      
      <PageHeaderCard
        badgeText="EMAIL SECURITY"
        title="Email Security"
        subtitle="SPF, DMARC, DKIM & SMTP security posture for scanned domains."
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

      {loading ? (
        <div className="es-results-panel card" style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Fetching email security posture...
        </div>
      ) : result ? (
        <div className="es-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          
          {/* Overview Banner */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#22C55E" /> Domain Posture: {result.domain}
            </h3>
            
            <div className="es-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SPF STATUS</div>
                <div style={{ marginTop: '0.5rem' }}>{renderStatus(hasRecord(result.spf), 'SPF Present')}</div>
              </div>
              
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DMARC STATUS</div>
                <div style={{ marginTop: '0.5rem' }}>{renderStatus(hasRecord(result.dmarc), 'DMARC Present')}</div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DKIM SELECTOR</div>
                <div style={{ marginTop: '0.5rem' }}>{renderStatus(hasRecord(result.dkim_selector1) || hasRecord(result.dkim_default), 'DKIM Checked')}</div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MX RECORDS</div>
                <div style={{ marginTop: '0.5rem' }}>{renderStatus(hasRecord(result.mx), `${(result.mx || []).length} MX Servers`)}</div>
              </div>
            </div>
          </div>

          {/* DNS Records Detail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            
            {/* SPF Record Card */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={14} color="#3B82F6" /> SPF (Sender Policy Framework)
              </h4>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Specifies which mail servers are authorized to send email on behalf of your domain.</p>
              <pre style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {getRecordText(result.spf)}
              </pre>
            </div>

            {/* DMARC Record Card */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={14} color="#F59E0B" /> DMARC Record
              </h4>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Determines how recipient mail servers handle emails that fail SPF or DKIM checks.</p>
              <pre style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {getRecordText(result.dmarc)}
              </pre>
            </div>

            {/* MX Records */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={14} color="#10B981" /> MX (Mail Exchange) Servers
              </h4>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Discovered mail exchange servers configured to receive incoming mail.</p>
              <pre style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {getRecordText(result.mx)}
              </pre>
            </div>

            {/* SMTP Security */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={14} color="#EF4444" /> SMTP Security Probes
              </h4>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Verifies TLS support (STARTTLS) and checks for SMTP Open Relay vulnerabilities.</p>
              
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>STARTTLS Support</span>
                  <span>{renderStatus(result.smtp_starttls?.supported !== false, result.smtp_starttls?.supported ? 'Supported' : 'Not Enabled')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Open Relay Check</span>
                  <span>{renderStatus(result.smtp_open_relay?.vulnerable === false, result.smtp_open_relay?.vulnerable ? 'Vulnerable' : 'Secure')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="es-results-panel card" style={{ padding: '2rem' }}>
          <div className="es-results-header">
            <Shield size={18} className="text-orange" />
            <h2 className="es-results-title">Email Security Scan Results</h2>
          </div>

          <div className="es-empty-state">
            <Mail size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">No email security results found</h3>
            <p className="empty-state-subtitle">Select a valid scan or run a new scan on a domain to check its email security posture.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmailSecurity;
