import React from 'react';
import { Filter, ArrowRight } from 'lucide-react';
import './CertDashboard.css';
import PageHeaderCard from '../common/PageHeaderCard';

const CertDashboard = ({ certs = [], loading }) => {
  const activeCount = certs.length;
  const expiringSoonCount = certs.filter(c => c.days !== null && c.days > 0 && c.days <= 30).length;
  const expiredCount = certs.filter(c => c.days === 0).length;
  const weakCount = certs.filter(c => ['C', 'D', 'E', 'F'].includes(c.sslGrade)).length;

  // Calculate dynamic security health score
  let score = 0;
  let healthLabel = 'N/A';
  if (certs.length > 0) {
    score = 100;
    score -= expiredCount * 15;
    score -= expiringSoonCount * 5;
    score -= weakCount * 8;
    score -= certs.filter(c => !c.isTrusted).length * 20;
    score = Math.max(30, score);

    healthLabel = 'HEALTHY';
    if (score < 50) healthLabel = 'CRITICAL';
    else if (score < 80) healthLabel = 'WARNING';
  }

  // Expiring soon or critical list
  const expiringList = [...certs]
    .filter(c => c.days !== null)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  // TLS distributions
  const count13 = certs.filter(c => c.tls === 'TLS 1.3').length;
  const count12 = certs.filter(c => c.tls === 'TLS 1.2').length;
  const count10 = certs.filter(c => c.tls === 'TLS 1.0').length;
  const totalCerts = certs.length || 1;
  const pct13 = Math.round((count13 / totalCerts) * 100);
  const pct12 = Math.round((count12 / totalCerts) * 100);
  const pct10 = Math.round((count10 / totalCerts) * 100);

  // CSV export handler
  const handleExport = () => {
    if (certs.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Domain,Issuer,Cert Type,TLS Version,Expiration Date,Days Left,Health Status,Grade,Trusted\n"
      + certs.map(c => 
          `"${c.domain}","${c.issuer}","${c.type}","${c.tls}","${c.expires}",${c.days},"${c.health}","${c.sslGrade}",${c.isTrusted}`
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ssl_certificates_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="cert-dashboard-wrapper">
      
      <PageHeaderCard 
        badgeText="SECURITY"
        title="SSL Certificates"
        subtitle="Monitor certificate health, expiration dates, issuers, encryption strength, and SSL security posture across your attack surface."
        stats={[
          { label: 'Active Certificates', value: activeCount.toString(), subtext: 'Monitored hostnames' },
          { label: 'Expiring Soon', value: expiringSoonCount.toString(), subtext: 'Next 30 days' },
          { label: 'Expired', value: expiredCount.toString(), subtext: 'Requires immediate action' },
          { label: 'Weak Configurations', value: weakCount.toString(), subtext: 'Protocol or cipher issues' }
        ]}
      />

      {/* Middle Grid: Score & Timeline */}
      <div className="cert-middle-grid">
        
        {/* Dark Score Card */}
        <div className="score-card card-dark">
          <h3 className="score-title">SSL Security Score</h3>
          <p className="score-subtitle">Overall certificate portfolio health.</p>
          
          <div className="gauge-container">
            <div className="score-gauge">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" stroke="#1E293B" strokeWidth="12" fill="none" />
                <circle cx="70" cy="70" r="60" stroke="#3B82F6" strokeWidth="12" fill="none" strokeDasharray="377" strokeDashoffset={377 - (377 * score) / 100} strokeLinecap="round" />
              </svg>
              <div className="gauge-text">
                <span className="score-num">{score}</span>
                <span className="score-lbl">{healthLabel}</span>
              </div>
            </div>
          </div>

          <div className="score-metrics">
            <div className="metric-row">
              <span className="metric-lbl">🗓️ Expiration Health</span>
              <span className={`metric-val ${expiredCount > 0 ? 'val-fair' : expiringSoonCount > 0 ? 'val-good' : 'val-excellent'}`}>
                {expiredCount > 0 ? 'Poor' : expiringSoonCount > 0 ? 'Good' : 'Excellent'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-lbl">🔒 Cipher Strength</span>
              <span className={`metric-val ${weakCount > 0 ? 'val-good' : 'val-excellent'}`}>
                {weakCount > 0 ? 'Fair' : 'Excellent'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-lbl">✅ Certificate Trust</span>
              <span className={`metric-val ${certs.some(c => !c.isTrusted) ? 'val-fair' : 'val-excellent'}`}>
                {certs.some(c => !c.isTrusted) ? 'Untrusted present' : 'Trusted'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-lbl">⚙️ TLS Config</span>
              <span className="metric-val val-excellent">Excellent</span>
            </div>
          </div>
        </div>

        {/* Expiring List */}
        <div className="bottom-card border-orange">
           <h3 className="bottom-card-title">
             <span style={{color: '#F97316'}}>⏱️</span> Expiring Certificates
           </h3>
           <p className="bottom-card-subtitle">Critically close to expiration boundaries.</p>
           
           <div className="expiring-list">
             {expiringList.map((c, i) => (
               <div key={i} className={`expiring-item ${c.days === 0 ? 'critical' : 'warning'}`}>
                 <div>
                   <div className="item-domain">{c.domain}</div>
                   <div className={`item-expires ${c.days === 0 ? 'color-red' : 'color-orange'}`}>
                     {c.days === 0 ? 'Expired' : `Expires in ${c.days} Days`}
                   </div>
                 </div>
                 <ArrowRight size={16} color="#94A3B8" />
               </div>
             ))}
             {expiringList.length === 0 && (
               <div className="text-secondary" style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.85rem' }}>
                 No certificates found.
               </div>
             )}
           </div>
        </div>

        {/* Bar Chart */}
        <div className="bottom-card">
           <h3 className="bottom-card-title">TLS Version</h3>
           <p className="bottom-card-subtitle">Protocol version active.</p>
           
           <div className="tls-bars">
             <div className="bar-row">
               <span className="bar-lbl">TLS 1.3</span>
               <div className="bar-track">
                 <div className="bar-fill" style={{width: `${pct13}%`}}></div>
               </div>
             </div>
             <div className="bar-row">
               <span className="bar-lbl">TLS 1.2</span>
               <div className="bar-track">
                 <div className="bar-fill" style={{width: `${pct12}%`}}></div>
               </div>
             </div>
             <div className="bar-row">
               <span className="bar-lbl">TLS 1.0 / 1.1</span>
               <div className="bar-track">
                 <div className="bar-fill" style={{width: `${pct10}%`}}></div>
               </div>
             </div>
             
             <div className="bar-axis">
               <span>0</span>
               <span>25</span>
               <span>50</span>
               <span>75</span>
               <span>100</span>
             </div>
           </div>
        </div>

      </div>

    </div>
  );
};

export default CertDashboard;
