import React, { useState, useEffect } from 'react';
import { Activity, GitMerge, ShieldAlert, Target, RefreshCw, ArrowRight, Shield, AlertTriangle, AlertCircle, Key, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import '../InternalDiscovery/InternalDashboard.css';

const AttackPathAnalysisDashboard = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState([]);
  const [stats, setStats] = useState({ criticalPaths: 0, chokepoints: 0, exposedCrownJewels: 0, pathComplexity: 'Low' });

  useEffect(() => {
    const generateAttackPaths = async () => {
      if (!activeScanId) {
        setPaths([]);
        return;
      }
      try {
        setLoading(true);
        // Fetch real data to synthesize paths
        const [vulnsData, portsData, endpointsData] = await Promise.all([
          api.get(`/api/attacksurface/vulnerabilities/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/open-ports/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/endpoints/?scan=${activeScanId}`).catch(() => [])
        ]);

        const vulns = Array.isArray(vulnsData) ? vulnsData : (vulnsData.results || []);
        const ports = Array.isArray(portsData) ? portsData : (portsData.results || []);
        const endpoints = Array.isArray(endpointsData) ? endpointsData : (endpointsData.results || []);

        const generatedPaths = [];
        let chokepointSet = new Set();
        let crownJewels = 0;

        // 1. Path via Vulnerabilities (Highest Risk)
        vulns.filter(v => v.severity === 'critical' || v.severity === 'high').forEach(v => {
          generatedPaths.push({
            id: `path-v-${v.id}`,
            riskScore: v.severity === 'critical' ? 95 : 80,
            severity: v.severity,
            asset: v.url || v.domain,
            chain: [
              { label: 'External Attacker', icon: <ShieldAlert size={16} /> },
              { label: `Asset Exposure (${v.url || v.domain})`, icon: <GlobeIcon size={16} /> },
              { label: `Exploit ${v.vulnerability_name || v.cvss_id || 'CVE'}`, icon: <GitMerge size={16} /> },
              { label: 'System Compromise (Crown Jewel)', icon: <Target size={16} /> }
            ],
            mitigation: `Patch or remediate ${v.vulnerability_name || 'the identified vulnerability'}. Update associated software.`
          });
          chokepointSet.add(v.url || v.domain);
          if (v.severity === 'critical') crownJewels++;
        });

        // 2. Path via Open Ports
        ports.forEach(p => {
          let risk = p.risk_score || 50;
          if (risk > 70) {
            generatedPaths.push({
              id: `path-p-${p.id}`,
              riskScore: risk,
              severity: risk > 85 ? 'critical' : 'high',
              asset: `${p.ip_address}:${p.port}`,
              chain: [
                { label: 'External Scanner', icon: <SearchIcon size={16} /> },
                { label: `Open Port Discovered (${p.port}/${p.service_name || 'tcp'})`, icon: <Activity size={16} /> },
                { label: `Service Brute Force / Exploit`, icon: <AlertTriangle size={16} /> },
                { label: 'Lateral Movement', icon: <Target size={16} /> }
              ],
              mitigation: `Restrict access to port ${p.port}. Implement IP whitelisting or move behind a VPN/Bastion.`
            });
            chokepointSet.add(p.ip_address);
          }
        });

        // Sort by risk score
        generatedPaths.sort((a, b) => b.riskScore - a.riskScore);

        setPaths(generatedPaths);
        setStats({
          criticalPaths: generatedPaths.filter(p => p.severity === 'critical').length,
          chokepoints: chokepointSet.size,
          exposedCrownJewels: crownJewels,
          pathComplexity: generatedPaths.length > 10 ? 'High' : generatedPaths.length > 5 ? 'Medium' : 'Low'
        });

      } catch (err) {
        console.error("Failed to map attack paths", err);
      } finally {
        setLoading(false);
      }
    };
    generateAttackPaths();
  }, [activeScanId]);

  return (
    <div className="internal-dashboard-container">
      <PageHeaderCard
        badgeText="ATTACK PATH ANALYSIS"
        title="Attack Path Analysis Dashboard"
        subtitle="Visualize how attackers could chain existing vulnerabilities to breach your critical assets."
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
        <div className="card" style={{ marginTop: '1.5rem', padding: '3rem', display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={24} style={{ marginRight: '0.5rem' }} /> Mapping attack paths from real-time data...
        </div>
      ) : (
        <>
          <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
            <div className="metric-card-premium">
              <div className="card-icon red"><GitMerge size={24} /></div>
              <div className="card-info">
                <h4>Critical Attack Paths</h4>
                <div className="card-value">{stats.criticalPaths}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon orange"><ShieldAlert size={24} /></div>
              <div className="card-info">
                <h4>Chokepoints Identified</h4>
                <div className="card-value">{stats.chokepoints}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon purple"><Target size={24} /></div>
              <div className="card-info">
                <h4>Exposed Crown Jewels</h4>
                <div className="card-value">{stats.exposedCrownJewels}</div>
              </div>
            </div>
            <div className="metric-card-premium">
              <div className="card-icon blue"><Activity size={24} /></div>
              <div className="card-info">
                <h4>Path Complexity</h4>
                <div className="card-value">{stats.pathComplexity}</div>
              </div>
            </div>
          </div>
          
          <div className="data-section-premium" style={{ marginTop: '1.5rem' }}>
            <div className="section-header">
              <h3>Attack Path Visualizations & Mitigation</h3>
            </div>
            
            {paths.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Shield size={48} color="#22C55E" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                No exploitable attack paths mapped. Your critical assets are secure from identified vectors.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {paths.map((path, idx) => (
                  <div key={path.id} className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: `1px solid ${path.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`, borderRadius: '12px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          background: path.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)', 
                          color: path.severity === 'critical' ? '#EF4444' : '#F97316', 
                          borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' 
                        }}>
                          {path.severity} Risk
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Impact Score: {path.riskScore}/100</h4>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Asset: <strong style={{ color: 'var(--text-primary)' }}>{path.asset}</strong></div>
                    </div>

                    {/* Path Visualizer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                      {path.chain.map((node, nIdx) => (
                        <React.Fragment key={nIdx}>
                          <div style={{ 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', 
                            minWidth: '120px', padding: '1rem', background: 'rgba(15,23,42,0.5)', 
                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px',
                            color: nIdx === path.chain.length - 1 ? '#EF4444' : 'var(--text-primary)'
                          }}>
                            {node.icon}
                            <span style={{ fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{node.label}</span>
                          </div>
                          {nIdx < path.chain.length - 1 && (
                            <ChevronRight size={24} color="#64748B" style={{ flexShrink: 0 }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Mitigation */}
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(34,197,94,0.05)', border: '1px dashed rgba(34,197,94,0.3)', borderRadius: '8px', display: 'flex', gap: '0.75rem' }}>
                      <Key size={18} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: '#22C55E', marginBottom: '0.25rem' }}>Recommended Mitigation</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{path.mitigation}</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const GlobeIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const SearchIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

export default AttackPathAnalysisDashboard;
