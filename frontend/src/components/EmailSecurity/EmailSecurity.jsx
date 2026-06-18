import React, { useState, useEffect } from 'react';
import { Mail, Shield, CheckCircle2, AlertTriangle, ShieldCheck, XCircle, RefreshCw, Key, Server, Lock, HelpCircle, FileText, PieChart, ShieldAlert } from 'lucide-react';
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
          setResult(list[0]); 
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

  const hasRecord = (arr) => {
    if (!arr) return false;
    if (Array.isArray(arr)) return arr.length > 0;
    return true;
  };

  const getRecordText = (arr) => {
    if (!arr) return 'No record published.';
    if (Array.isArray(arr)) {
      return arr.length > 0 ? arr.join('\n') : 'No record published.';
    }
    if (typeof arr === 'object') {
      return JSON.stringify(arr, null, 2);
    }
    return arr.toString();
  };

  // Calculate Security Score
  const calculateScore = () => {
    if (!result) return 0;
    let score = 0;
    if (hasRecord(result.spf)) score += 25;
    if (hasRecord(result.dmarc)) score += 35;
    if (hasRecord(result.dkim_selector1) || hasRecord(result.dkim_default)) score += 25;
    if (result.smtp_starttls?.supported !== false) score += 10;
    if (result.smtp_open_relay?.vulnerable === false) score += 5;
    return score;
  };

  const score = calculateScore();
  const getGrade = (s) => {
    if (s >= 90) return { grade: 'A', color: '#22C55E', text: 'Excellent' };
    if (s >= 75) return { grade: 'B', color: '#3B82F6', text: 'Good' };
    if (s >= 50) return { grade: 'C', color: '#F59E0B', text: 'Fair' };
    if (s >= 25) return { grade: 'D', color: '#F97316', text: 'Poor' };
    return { grade: 'F', color: '#EF4444', text: 'Critical' };
  };
  const healthInfo = getGrade(score);

  const StatusBadge = ({ isValid, trueText, falseText }) => {
    if (isValid) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontSize: '0.75rem', fontWeight: '700' }}>
          <CheckCircle2 size={14} /> {trueText || 'Valid'}
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.75rem', fontWeight: '700' }}>
        <XCircle size={14} /> {falseText || 'Missing / Invalid'}
      </span>
    );
  };

  return (
    <div className="email-security-container">
      <PageHeaderCard
        badgeText="DOMAIN SECURITY"
        title="Email Authentication & Compliance"
        subtitle="DMARC, SPF, and DKIM analysis and domain security rating."
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
        <div className="card" style={{ padding: '4rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Analyzing authentication protocols...
        </div>
      ) : result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          
          {/* Top Overview Panel (Score) */}
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 36 36" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                  <path strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-main)" strokeWidth="3" />
                  <path strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={healthInfo.color} strokeWidth="3" />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 }}>/ 100</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Domain Security Rating</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {result.domain} <span style={{ padding: '0.2rem 0.6rem', background: `${healthInfo.color}15`, color: healthInfo.color, fontSize: '0.8rem', borderRadius: '20px', fontWeight: 700 }}>{healthInfo.text}</span>
                </h2>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
                  This score is based on the presence and validity of DMARC, SPF, and DKIM records to prevent email spoofing.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, maxWidth: '400px' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DMARC STATUS</span>
                <StatusBadge isValid={hasRecord(result.dmarc)} trueText="Protected" falseText="Unprotected" />
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SPF COMPLIANCE</span>
                <StatusBadge isValid={hasRecord(result.spf)} trueText="Compliant" falseText="Action Needed" />
              </div>
            </div>
          </div>

          {/* DMARC Panel */}
          <div className="card" style={{ padding: '0', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>DMARC</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Domain-based Message Authentication, Reporting, and Conformance</div>
                </div>
              </div>
              <StatusBadge isValid={hasRecord(result.dmarc)} trueText="Record Found" falseText="No Record Found" />
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Published Record</div>
                <code style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {getRecordText(result.dmarc)}
                </code>
              </div>
            </div>
          </div>

          {/* SPF Panel */}
          <div className="card" style={{ padding: '0', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                  <Key size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>SPF</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sender Policy Framework</div>
                </div>
              </div>
              <StatusBadge isValid={hasRecord(result.spf)} trueText="Record Found" falseText="No Record Found" />
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Published Record</div>
                <code style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {getRecordText(result.spf)}
                </code>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* DKIM Panel */}
            <div className="card" style={{ padding: '0', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>DKIM</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DomainKeys Identified Mail</div>
                  </div>
                </div>
                <StatusBadge isValid={hasRecord(result.dkim_selector1) || hasRecord(result.dkim_default)} trueText="Configured" falseText="Missing" />
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Selector: default._domainkey</span>
                    <span>{hasRecord(result.dkim_default) ? <span style={{color:'#22C55E', fontWeight:'bold'}}>Found</span> : <span style={{color:'var(--text-secondary)'}}>None</span>}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Selector: selector1._domainkey</span>
                    <span>{hasRecord(result.dkim_selector1) ? <span style={{color:'#22C55E', fontWeight:'bold'}}>Found</span> : <span style={{color:'var(--text-secondary)'}}>None</span>}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SMTP & MTA Panel */}
            <div className="card" style={{ padding: '0', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                    <Server size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Mail Servers & Security</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>MX Records and SMTP Configurations</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>MX Servers Discovered</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Array.isArray(result.mx) ? result.mx.length : 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>STARTTLS Support</span>
                    <StatusBadge isValid={result.smtp_starttls?.supported !== false} trueText="Enabled" falseText="Disabled" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Open Relay Prevented</span>
                    <StatusBadge isValid={result.smtp_open_relay?.vulnerable === false} trueText="Secure" falseText="Vulnerable" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', marginTop: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldAlert size={36} color="var(--text-secondary)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Data Available</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>Select a target domain to generate an authentication and compliance report.</p>
        </div>
      )}
    </div>
  );
};

export default EmailSecurity;
