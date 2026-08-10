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

  // Fetch tech stack results
  useEffect(() => {
    const loadTechnologies = async () => {
      if (!activeScanId) {
        setSubdomainTechs([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.get(`/api/attacksurface/technologies/?scan=${activeScanId}`);
        const list = Array.isArray(data) ? data : (data.results || []);

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

        // Each item in list represents a subdomain asset and its detected technologies
        const parsedList = list.map((item, idx) => {
          const rawTechs = Array.isArray(item.technologies) ? item.technologies : [];
          const cleanedTechsSet = new Set();

          rawTechs.forEach(techStr => {
            let name = techStr;
            const toolMatch = name.match(/\s*\[(.*?)\]$/);
            if (toolMatch) {
              name = name.replace(toolMatch[0], '').trim();
            }
            if (name.includes('/')) {
              name = name.split('/')[0];
            } else if (name.includes(' (v')) {
              name = name.split(' (v')[0];
            }
            const key = name.trim();
            if (key) {
              cleanedTechsSet.add(key);
            }
          });

          const sub = item.domain || item.subdomain || '';
          
          let dateStr = '—';
          const rawDate = item.created_at || item.created_date || item.discovered_at || item.created;
          if (rawDate) {
            try {
              dateStr = new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
              dateStr = String(rawDate);
            }
          } else {
            dateStr = '10 Aug 2026';
          }

          return {
            id: item.id || idx + 1,
            subdomain: sub,
            parentDomain: getParentDomain(sub),
            status: item.status || 'Active',
            title: item.title || '-',
            actionTeam: item.action_team || item.actionTeam || 'Unassigned',
            actionStatus: item.action_status || item.actionStatus || 'Open',
            createdDate: dateStr,
            technologies: Array.from(cleanedTechsSet)
          };
        }).filter(item => item.subdomain);

        setSubdomainTechs(parsedList);
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
      + filteredData.map(row => 
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
