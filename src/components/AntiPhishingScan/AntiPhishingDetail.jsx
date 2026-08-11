import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity, Globe, Search, Link as LinkIcon, Database, Server, MapPin, ArrowLeft } from 'lucide-react';
import './AntiPhishingDetail.css';

const AntiPhishingDetail = ({ report, onBack }) => {
  if (!report) return null;

  const otx = report.alienvault_reputation || {};
  const general = otx.general || otx || {}; // Fallback in case old data
  const passiveDns = otx.passive_dns || [];
  const urlList = otx.url_list || [];
  const malware = otx.malware || [];

  const whois = general.whois || 'Not available';
  const pulseInfo = general.pulse_info || {};

  const getEcosystemColor = (classification) => {
    if (!classification) return '#9CA3AF';
    const lower = classification.toLowerCase();
    if (lower.includes('malicious')) return '#EF4444';
    if (lower.includes('suspicious')) return '#EAB308';
    return '#10B981';
  };

  // Generate Recommendations
  const getRecommendations = () => {
    if (report.ecosystem_score >= 60) {
      return [
        "Immediate Takedown Action: Initiate takedown requests with the domain registrar and hosting provider.",
        "Block IOCs: Add all associated IPs and domains to firewall blocklists.",
        "Notify Employees/Customers: Issue an advisory regarding this active phishing campaign.",
        "Monitor for Credential Leaks: Watch dark web sources for compromised credentials related to this campaign."
      ];
    } else if (report.ecosystem_score >= 30) {
      return [
        "Monitor Domain: Add to continuous monitoring watchlist.",
        "Block on Email Gateway: Add rules to quarantine emails originating from or linking to this domain.",
        "Investigate Infrastructure: Manually review the associated passive DNS records and subdomains.",
        "Warn Employees: Flag emails containing this domain as highly suspicious."
      ];
    } else {
      return [
        "No immediate action required.",
        "Continue routine monitoring of the domain.",
        "If brand imitation is detected without malicious activity, consider legal notice or brand protection strategies."
      ];
    }
  };

  return (
    <div className="ap-detail-container page-animate">
      <div className="ap-detail-header">
        <div className="ap-detail-title">
          <Shield size={24} color="#3B82F6" />
          <h2>Detailed Anti-Phishing Analysis: <span className="font-mono" style={{color: '#fff'}}>{report.url}</span></h2>
        </div>
      </div>

      <div className="aprm-content">
          
          {/* Section 1 & 6: Summary & Risk Assessment */}
          <div className="aprm-row">
            <div className="aprm-card aprm-summary-card">
              <h3><Globe size={18}/> Domain Summary</h3>
              <div className="aprm-info-grid">
                <div className="aprm-info-item">
                  <span className="aprm-label">Target URL / Domain</span>
                  <span className="aprm-value font-mono">{report.url}</span>
                </div>
                <div className="aprm-info-item">
                  <span className="aprm-label">Scan Status</span>
                  <span className="aprm-value" style={{textTransform: 'capitalize'}}>{report.status}</span>
                </div>
                <div className="aprm-info-item">
                  <span className="aprm-label">Completed At</span>
                  <span className="aprm-value">{new Date(report.completed_at || report.created_at).toLocaleString()}</span>
                </div>
                <div className="aprm-info-item">
                  <span className="aprm-label">Registration/WHOIS</span>
                  <span className="aprm-value font-mono" style={{fontSize: '0.8rem'}}>{typeof whois === 'string' ? whois : 'External Link'}</span>
                </div>
              </div>
            </div>

            <div className="aprm-card aprm-risk-card">
              <h3><Activity size={18}/> Risk Assessment</h3>
              <div className="aprm-risk-scores">
                <div className="aprm-score-box">
                  <span className="aprm-score-label">Input Risk Score</span>
                  <span className="aprm-score-value" style={{color: getEcosystemColor(report.classification)}}>{report.risk_score}/100</span>
                  <span className="aprm-score-class">{report.classification}</span>
                </div>
                <div className="aprm-score-box">
                  <span className="aprm-score-label">Ecosystem Score</span>
                  <span className="aprm-score-value" style={{color: getEcosystemColor(report.ecosystem_classification)}}>{report.ecosystem_score}/100</span>
                  <span className="aprm-score-class">{report.ecosystem_classification || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Phishing Indicators & Reasons */}
          <div className="aprm-card">
            <h3><AlertTriangle size={18}/> Phishing Indicators &amp; Key Findings</h3>
            {report.reasons && report.reasons.length > 0 ? (
              <ul className="aprm-reasons-list">
                {report.reasons.map((reason, idx) => (
                  <li key={idx}><AlertTriangle size={14} color="#EAB308"/> {reason}</li>
                ))}
              </ul>
            ) : (
              <p className="aprm-empty-text">No significant phishing indicators detected.</p>
            )}
          </div>

          {/* Section 2: OTX Intelligence */}
          <div className="aprm-card">
            <h3><Search size={18}/> AlienVault OTX Intelligence</h3>
            <div className="aprm-info-grid">
              <div className="aprm-info-item">
                <span className="aprm-label">OTX Pulse Count</span>
                <span className="aprm-value">{pulseInfo.count || report.alienvault_pulse_count || 0}</span>
              </div>
              <div className="aprm-info-item">
                <span className="aprm-label">Reputation Indicator</span>
                <span className="aprm-value">{general.reputation || 'Unknown'}</span>
              </div>
              <div className="aprm-info-item">
                <span className="aprm-label">Base Indicator Type</span>
                <span className="aprm-value">{general.type_title || 'Domain'}</span>
              </div>
              <div className="aprm-info-item">
                <span className="aprm-label">Malware References</span>
                <span className="aprm-value">{malware.length} samples</span>
              </div>
            </div>
            
            {malware.length > 0 && (
              <div className="aprm-sub-table">
                <h4>Malware Hashes</h4>
                <div className="aprm-tags-container">
                  {malware.map((m, i) => (
                    <span key={i} className="aprm-tag malware-tag" title={m.hash}>{m.hash.substring(0, 12)}...</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: MISP Intelligence */}
          <div className="aprm-card">
            <h3><Database size={18}/> MISP Intelligence</h3>
            <div className="aprm-info-grid">
              <div className="aprm-info-item">
                <span className="aprm-label">MISP IOC Matches</span>
                <span className="aprm-value">{report.misp_iocs_found}</span>
              </div>
              <div className="aprm-info-item">
                <span className="aprm-label">Threat Level</span>
                <span className="aprm-value">{report.misp_iocs_found > 0 ? 'High' : 'Low'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Related Infrastructure */}
          <div className="aprm-card">
            <h3><Server size={18}/> Related Infrastructure (Passive DNS &amp; URLs)</h3>
            
            <div className="aprm-infra-grid">
              <div className="aprm-infra-col">
                <h4><MapPin size={14}/> Passive DNS Records ({passiveDns.length})</h4>
                {passiveDns.length > 0 ? (
                  <ul className="aprm-dns-list">
                    {passiveDns.slice(0, 8).map((p, i) => (
                      <li key={i}>
                        <span className="aprm-ip">{p.address}</span>
                        <span className="aprm-host">{p.hostname}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="aprm-empty-text">No Passive DNS data found.</p>
                )}
              </div>
              
              <div className="aprm-infra-col">
                <h4><LinkIcon size={14}/> Associated URLs ({urlList.length})</h4>
                {urlList.length > 0 ? (
                  <ul className="aprm-url-list">
                    {urlList.slice(0, 8).map((u, i) => (
                      <li key={i} title={u.url}>{u.url}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="aprm-empty-text">No associated URLs found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 7: Recommendations */}
          <div className="aprm-card aprm-recommendations">
            <h3><CheckCircle size={18}/> Recommended Actions</h3>
            <ul className="aprm-rec-list">
              {getRecommendations().map((rec, idx) => (
                <li key={idx}>
                  <div className="aprm-rec-bullet"></div>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

        </div>
    </div>
  );
};

export default AntiPhishingDetail;
