import React, { useState, useEffect } from 'react';
import TechDashboard from './TechDashboard';
import TechTable from './TechTable';
import ScanSelector from '../common/ScanSelector';
import './Technologies.css';
import { api } from '../../utils/api';

const Technologies = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [subdomainTechs, setSubdomainTechs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Fetch tech stack results — merged with the subdomain list so EVERY
  // subdomain of the scan is displayed (with its tech stack or a
  // "No technologies" state) instead of only hosts that had techs.
  useEffect(() => {
    const loadTechnologies = async () => {
      if (!activeScanId) {
        setSubdomainTechs([]);
        return;
      }
      try {
        setLoading(true);

        // Helper to extract parent domain (e.g. www.hackersinfotech.com -> hackersinfotech.com)
        const getParentDomain = (host = '') => {
          if (!host) return '';
          const parts = host.split('.');
          if (parts.length >= 2) {
            if (parts.length >= 3 && ['ac', 'edu', 'co', 'gov', 'org'].includes(parts[parts.length - 2])) {
              return parts.slice(-3).join('.');
            }
            return parts.slice(-2).join('.');
          }
          return host;
        };

        // 1) Technology rows (domain -> technologies) from the tech phase
        const [techData, subData] = await Promise.all([
          api.get(`/api/attacksurface/technologies/?scan=${activeScanId}`).catch(() => []),
          api.get(`/api/attacksurface/subdomains/?scan=${activeScanId}`).catch(() => []),
        ]);
        const techList = Array.isArray(techData) ? techData : ((techData && techData.results) || []);
        const subList = Array.isArray(subData) ? subData : ((subData && subData.results) || []);

        // Tech map: domain -> sorted unique technologies
        const techMap = {};
        techList.forEach(item => {
          const host = item.domain || item.subdomain || '';
          if (!host) return;
          const techs = Array.isArray(item.technologies) ? item.technologies : [];
          const cleaned = Array.from(new Set(techs.map(t => (t || '').trim()).filter(Boolean)));
          if (cleaned.length) techMap[host] = cleaned;
        });

        // 2) Build the row list: every subdomain of the scan, plus any
        //    tech-only hosts (e.g. the parent domain) that aren't subdomains.
        const rowsByHost = {};
        const addRow = (host, src) => {
          if (!host || rowsByHost[host]) return;
          const rawTechs = Array.isArray(src.technologies) ? src.technologies : [];
          const cleanedTechs = Array.from(new Set(rawTechs.map(t => (t || '').trim()).filter(Boolean)));

          let dateStr;
          const rawDate = src.created_at || src.created_date || src.discovered_at || src.created;
          if (rawDate) {
            try {
              dateStr = new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch {
              dateStr = String(rawDate);
            }
          } else {
            dateStr = '—';
          }

          rowsByHost[host] = {
            id: src.id || host,
            subdomain: host,
            parentDomain: getParentDomain(host),
            status: src.status || 'Active',
            title: src.title || '-',
            createdDate: dateStr,
            // Tech from the technology phase wins; otherwise use the
            // subdomain's own stored technologies field.
            technologies: techMap[host] || cleanedTechs,
          };
        };

        subList.forEach(s => addRow(s.domain || s.subdomain || '', s));
        // Tech-only hosts that aren't in the subdomain list
        Object.keys(techMap).forEach(host => addRow(host, { technologies: techMap[host] }));

        setSubdomainTechs(Object.values(rowsByHost));
      } catch (e) {
        console.error("Failed to load technologies", e);
        setSubdomainTechs([]);
      } finally {
        setLoading(false);
      }
    };
    loadTechnologies();
  }, [activeScanId]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      alert("No data to export!");
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Subdomain,Technologies\n"
      + filteredData.filter(row => (row.technologies || []).length > 0).map(row => 
          `"${row.subdomain}","${(row.technologies || []).join('; ')}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "technologies_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <TechDashboard onExport={handleExport} technologies={subdomainTechs} loading={loading} />
        
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

        <TechTable 
          onDataFiltered={setFilteredData} 
          subdomainTechs={subdomainTechs} 
          loading={loading} 
          selectedDomain={selectedDomain} 
        />
      </div>
    </div>
  );
};

export default Technologies;
