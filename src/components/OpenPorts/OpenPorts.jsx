import React, { useState, useEffect } from 'react';
import './OpenPorts.css';
import { ArrowRight, CheckCircle2, X, RefreshCw } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const OpenPorts = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [portsList, setPortsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedPort, setSelectedPort] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const mapSeverity = (port) => {
    const p = Number(port);
    if ([21, 22, 23, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017].includes(p)) return 'CRITICAL';
    if ([25, 110, 143, 993, 995].includes(p)) return 'HIGH';
    if ([80, 443, 8080, 8443, 3000, 5000].includes(p)) return 'MEDIUM';
    return 'LOW';
  };

  const mapRiskScore = (port) => {
    const p = Number(port);
    if ([21, 22, 23, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017].includes(p)) return 9.5;
    if ([25, 110, 143, 993, 995].includes(p)) return 8.0;
    if ([80, 443, 8080, 8443, 3000, 5000].includes(p)) return 6.0;
    return 3.0;
  };

  // Fetch open ports on activeScanId change
  useEffect(() => {
    const loadPorts = async () => {
      if (!activeScanId) {
        setPortsList([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/open-ports/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);
        
        // Flatten domain -> ports list
        const flat = [];
        list.forEach((item) => {
          const ports = Array.isArray(item.ports) ? item.ports : [];
          ports.forEach((p, idx) => {
            // Check if p is integer or dict
            const portNum = typeof p === 'object' ? p.port : p;
            const proto = typeof p === 'object' ? p.protocol : 'tcp';
            const service = typeof p === 'object' ? p.service : 'unknown';
            const product = typeof p === 'object' ? p.product : '';
            const version = typeof p === 'object' ? p.version : '';
            
            flat.push({
              id: `${item.id}-${idx}`,
              host: item.domain,
              ip: '—', // backend model does not explicitly store IP on PortResult, default to dash
              port: portNum,
              protocol: `/${(proto || 'tcp').toUpperCase()}`,
              service: service || 'unknown',
              product: product || '',
              version: version || '',
              severity: mapSeverity(portNum),
              risk: mapRiskScore(portNum),
              status: 'Open',
              lastSeen: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Recent'
            });
          });
        });
        setPortsList(flat);
      } catch (e) {
        console.error("Failed to load open ports", e);
        setPortsList([]);
      } finally {
        setLoading(false);
      }
    };
    loadPorts();
  }, [activeScanId]);

  const filteredData = portsList.filter(item => {
    if (severityFilter === 'All') return true;
    return item.severity === severityFilter.toUpperCase();
  });

  const exportToCSV = () => {
    const headers = ['Host', 'IP Address', 'Port', 'Protocol', 'Service', 'Severity', 'Risk Score', 'Status', 'Last Seen'];
    const csvRows = filteredData.map(item => [
      item.host, item.ip, item.port, item.protocol, item.service, item.severity, item.risk, item.status, item.lastSeen
    ].map(val => `"${val}"`).join(','));
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'open_ports_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast(`Successfully exported ${filteredData.length} open ports to CSV.`);
  };

  // Stats calculation
  const criticalCount = portsList.filter(p => p.severity === 'CRITICAL').length;
  const highCount = portsList.filter(p => p.severity === 'HIGH').length;
  const uniqueHosts = [...new Set(portsList.map(p => p.host))].length;
  const totalOpen = portsList.length;

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        
        <PageHeaderCard 
          badgeText="SECURITY"
          title="Open Ports"
          subtitle="Monitor exposed services, identify risky ports, and track externally accessible network services across discovered assets."
          actions={
            <button className="op-btn-primary" onClick={exportToCSV}>
              Export
            </button>
          }
          stats={[
            { label: 'Critical Ports', value: criticalCount.toString(), subtext: 'Requires immediate review' },
            { label: 'High Risk Services', value: highCount.toString(), subtext: 'Elevated exposure' },
            { label: 'Unique Hosts', value: uniqueHosts.toString(), subtext: 'With externally facing ports' },
            { label: 'Open Services', value: totalOpen.toString(), subtext: 'Total detected' }
          ]}
        />

        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        {/* Severity Filters */}
        <div className="global-filter-row">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(sev => (
            <div 
              key={sev}
              className={`global-filter-pill ${severityFilter === sev ? 'active' : ''}`}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="global-table-wrapper">
          <table className="op-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>IP Address</th>
                <th>Port / Protocol</th>
                <th>Service</th>
                <th>Severity</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                    Loading open ports from database...
                  </td>
                </tr>
              ) : filteredData.map(item => (
                <tr key={item.id}>
                  <td className="op-host">{item.host}</td>
                  <td className="op-ip">{item.ip}</td>
                  <td>
                    <span className="op-port">{item.port}</span> <span className="op-protocol">{item.protocol}</span>
                  </td>
                  <td className="op-service">{item.service}</td>
                  <td>
                    <span className={`op-sev-pill ${
                      item.severity === 'CRITICAL' ? 'sev-crit' : 
                      item.severity === 'HIGH' ? 'sev-high' : 
                      item.severity === 'MEDIUM' ? 'sev-med' : 'sev-low'
                    }`}>
                      <div className="dot"></div> {item.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`op-risk-score ${
                      item.risk >= 9.0 ? 'risk-c' : 
                      item.risk >= 7.0 ? 'risk-h' : 'risk-m'
                    }`}>
                      {item.risk.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <span className="op-status-pill">{item.status}</span>
                  </td>
                  <td className="op-last-seen">{item.lastSeen}</td>
                </tr>
              ))}
              {!loading && filteredData.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                    No open ports found for this scan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="ep-toast">
          <CheckCircle2 size={18} color="#10B981" />
          {toastMessage}
        </div>
      )}

      {/* Investigate Modal */}
      {selectedPort && (
        <div className="ep-modal-overlay">
          <div className="ep-modal-content" style={{ width: '550px' }}>
            <div className="ep-modal-header">
              <div>
                <h2 className="ep-modal-title">Port Details</h2>
                <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.25rem' }}>{selectedPort.host}</div>
              </div>
              <button className="ep-modal-close" onClick={() => setSelectedPort(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="ep-modal-body">
              
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', wordBreak: 'break-all' }}>
                Port {selectedPort.port}{selectedPort.protocol} is {selectedPort.status.toUpperCase()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <div className="ep-form-label">Service Name</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedPort.service.toUpperCase()}</div>
                </div>
                <div>
                  <div className="ep-form-label">Severity Level</div>
                  <span className={`op-sev-pill ${
                    selectedPort.severity === 'CRITICAL' ? 'sev-crit' : 
                    selectedPort.severity === 'HIGH' ? 'sev-high' : 
                    selectedPort.severity === 'MEDIUM' ? 'sev-med' : 'sev-low'
                  }`}>
                    <div className="dot"></div> {selectedPort.severity}
                  </span>
                </div>
                {selectedPort.product && (
                  <div>
                    <div className="ep-form-label">Product</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedPort.product}</div>
                  </div>
                )}
                {selectedPort.version && (
                  <div>
                    <div className="ep-form-label">Version</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedPort.version}</div>
                  </div>
                )}
                <div>
                  <div className="ep-form-label">Risk score</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedPort.risk.toFixed(1)} / 10.0</div>
                </div>
                <div>
                  <div className="ep-form-label">Discovered</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedPort.lastSeen}</div>
                </div>
              </div>

            </div>
            <div className="ep-modal-footer">
              <button className="ep-btn-cancel" onClick={() => setSelectedPort(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OpenPorts;
