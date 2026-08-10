import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, ShieldAlert, FileText } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';
import './AntiPhishingScan.css';
import AntiPhishingDetail from './AntiPhishingDetail';

const AntiPhishingScan = ({ activeTarget }) => {
  const [reports, setReports] = useState([]);
  const loadReports = async () => {
    try {
      const data = await api.get('/api/brand-monitoring/anti-phishing/');
      let results = Array.isArray(data) ? data : (data.results || []);
      
      if (activeTarget) {
        results = results.filter(r => r.url && r.url.toLowerCase().includes(activeTarget.toLowerCase()));
      }
      
      // Only keep the most recent scan for the active target
      setReports(results.length > 0 ? [results[0]] : []);
    } catch (err) {
      console.error("Failed to load anti-phishing scans", err);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeTarget]);

  return (
    <div className="global-page-container page-animate">
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Anti Phishing Analysis"
        subtitle="Analyze URLs using AlienVault OTX Threat Intelligence, MISP IoC Validation, and Phishing heuristics."
        stats={[
          { label: 'Total Scans', value: reports.length.toString() },
          { label: 'Malicious', value: reports.filter(r => r.classification?.toLowerCase() === 'malicious' || r.ecosystem_classification?.toLowerCase().includes('malicious')).length.toString() },
          { label: 'Suspicious', value: reports.filter(r => r.classification?.toLowerCase() === 'suspicious' || r.ecosystem_classification?.toLowerCase().includes('suspicious')).length.toString() },
        ]}
      />

      <div className="card global-table-wrapper" style={{ marginTop: '2rem' }}>
        <table className="cert-table">
          <thead>
            <tr>
              <th>Target URL</th>
              <th>Status</th>
              <th>Input Risk</th>
              <th>Related Assets</th>
              <th>Ecosystem Score</th>
              <th>Final Classification</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No scans available.</td>
              </tr>
            ) : (
              reports.map((report) => (
                <React.Fragment key={report.id}>
                  <tr>
                    <td className="font-mono">{report.url}</td>
                    <td>
                      <span className={`aps-status-badge aps-status-${report.status}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <div className="aps-score-bar-bg" style={{ width: '60px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                        <div 
                          className={`aps-score-bar-fill ${report.classification?.toLowerCase()}`} 
                          style={{ width: `${report.risk_score}%` }}
                        ></div>
                      </div>
                      <span className="aps-score-text">{report.risk_score}</span>
                    </td>
                    <td>{report.related_assets_found}</td>
                    <td>
                      <div className="aps-score-bar-bg" style={{ width: '60px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                        <div 
                          className={`aps-score-bar-fill ${report.ecosystem_classification?.toLowerCase()?.includes('malicious') ? 'malicious' : report.ecosystem_classification?.toLowerCase()}`} 
                          style={{ width: `${report.ecosystem_score}%` }}
                        ></div>
                      </div>
                      <span className="aps-score-text">{report.ecosystem_score}</span>
                    </td>
                    <td>
                      {report.ecosystem_classification?.includes('Malicious') && <span className="aps-class malicious"><ShieldAlert size={14}/> {report.ecosystem_classification}</span>}
                      {report.ecosystem_classification === 'Suspicious' && <span className="aps-class suspicious"><AlertTriangle size={14}/> Suspicious</span>}
                      {report.ecosystem_classification === 'Safe' && <span className="aps-class safe"><CheckCircle size={14}/> Safe</span>}
                      {!report.ecosystem_classification && <span className="aps-class unknown">Pending</span>}
                    </td>
                  </tr>
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {reports.map((report) => (
          <AntiPhishingDetail 
            key={report.id}
            report={report} 
          />
        ))}
      </div>
    </div>
  );
};

export default AntiPhishingScan;
