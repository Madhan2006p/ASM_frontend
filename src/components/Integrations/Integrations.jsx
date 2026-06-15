import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import './Integrations.css';

const Integrations = () => {
  const scanners = [
    { tool: 'Wappalyzer', sub: 'python-Wappalyzer', cat: 'Technology Detection', time: '10 seconds', status: 'Missing' },
    { tool: 'WhatWeb', sub: 'Built-in Python Scanner', cat: 'Technology Detection', time: '15 seconds', status: 'Active' },
    { tool: 'Subfinder', sub: 'subfinder', cat: 'Subdomain Discovery', time: '10 seconds', status: 'Missing' },
    { tool: 'Assetfinder', sub: 'assetfinder', cat: 'Subdomain Passive Mining', time: '5 seconds', status: 'Missing' },
    { tool: 'Findomain', sub: 'findomain', cat: 'Subdomain Monitoring', time: '10 seconds', status: 'Missing' },
    { tool: 'Naabu', sub: 'naabu', cat: 'Port Scanning', time: '15 seconds', status: 'Missing' },
    { tool: 'Httpx', sub: 'C:\\Users\\...', cat: 'Live Host Detection', time: '12 seconds', status: 'Active' },
    { tool: 'Nmap Scanner', sub: 'nmap', cat: 'Network Service Discovery', time: '30 seconds', status: 'Missing' },
    { tool: 'Nuclei Templates', sub: 'nuclei', cat: 'Active Vulnerability Scan', time: '45 seconds', status: 'Missing' },
    { tool: 'TestSSL.sh', sub: 'testssl.sh', cat: 'SSL/TLS Security Audit', time: '60 seconds', status: 'Missing' },
    { tool: 'Dirsearch', sub: 'dirsearch', cat: 'Web Directory Brute-force', time: '40 seconds', status: 'Missing' },
    { tool: 'Wapiti', sub: 'wapiti', cat: 'Web Vulnerability Scanner', time: '60 seconds', status: 'Missing' },
    { tool: 'Arjun Finder', sub: 'arjun', cat: 'HTTP Parameter Discovery', time: '30 seconds', status: 'Missing' },
    { tool: 'InQL GraphQL Auditor', sub: 'inql', cat: 'GraphQL Security Analysis', time: '15 seconds', status: 'Missing' },
    { tool: 'GAU (GetAllUrls)', sub: 'gau', cat: 'Historical Endpoint Scraping', time: '15 seconds', status: 'Missing' },
    { tool: 'Waybackurls', sub: 'waybackurls', cat: 'Wayback Archive Crawling', time: '10 seconds', status: 'Missing' },
    { tool: 'gRPCurl Lister', sub: 'grpcurl', cat: 'gRPC Service Introspection', time: '15 seconds', status: 'Missing' },
  ];

  return (
    <div className="integrations-container">
      
      {/* Header */}
      <div className="int-header">
        <div className="int-header-left">
          <h1 className="int-title">Core Security Scanners & Estimates</h1>
          <p className="int-subtitle">Diagnostic health mapping and execution duration estimates of all backend tools.</p>
        </div>
        <button className="int-btn-diagnostics">
          <RefreshCw size={14} /> Run Diagnostics
        </button>
      </div>

      {/* Table */}
      <div className="int-table-container">
        <table className="int-table">
          <thead>
            <tr>
              <th>SCANNER TOOL</th>
              <th>INTEL CATEGORY</th>
              <th className="center-col">EST. RUNTIME</th>
              <th className="center-col">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {scanners.map((scanner, idx) => (
              <tr key={idx}>
                <td className="tool-cell">
                  <div className="tool-name">{scanner.tool}</div>
                  <div className="tool-sub">{scanner.sub}</div>
                </td>
                <td className="cat-cell">{scanner.cat}</td>
                <td className="time-cell center-col">
                  <span className="time-badge">{scanner.time}</span>
                </td>
                <td className="status-cell center-col">
                  {scanner.status === 'Active' ? (
                    <span className="status-badge active">
                      <CheckCircle2 size={12} /> {scanner.status}
                    </span>
                  ) : (
                    <span className="status-badge missing">
                      <AlertCircle size={12} /> {scanner.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Integrations;
