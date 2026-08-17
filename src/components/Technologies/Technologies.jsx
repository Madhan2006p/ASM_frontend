import React, { useState, useEffect } from 'react';
import TechDashboard from './TechDashboard';
import TechTable from './TechTable';
import ScanSelector from '../common/ScanSelector';
import './Technologies.css';
import { api } from '../../utils/api';
import { deduplicateTechnologies } from '../../utils/techUtils';

const Technologies = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [subdomainTechs, setSubdomainTechs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Fetch tech stack results — merged with the subdomain list so EVERY
  // subdomain of the scan is displayed (with its tech stack or a
  // "No technologies" state) instead of only hosts that had techs.
  useEffect(() => {
    const loadTechnologies = async () => {
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

        const techEndpoint = activeScanId
          ? `/api/attacksurface/technologies/?scan=${activeScanId}`
          : (selectedDomain ? `/api/attacksurface/technologies/?domain=${encodeURIComponent(selectedDomain)}` : `/api/attacksurface/technologies/`);
        const subEndpoint = activeScanId
          ? `/api/attacksurface/subdomains/?scan=${activeScanId}`
          : (selectedDomain ? `/api/attacksurface/subdomains/?domain=${encodeURIComponent(selectedDomain)}` : `/api/attacksurface/subdomains/`);

        // 1) Technology rows (domain -> technologies) from the tech phase
        const [techData, subData] = await Promise.all([
          api.get(techEndpoint).catch(() => []),
          api.get(subEndpoint).catch(() => []),
        ]);
        const techList = Array.isArray(techData) ? techData : ((techData && techData.results) || []);
        const subList = Array.isArray(subData) ? subData : ((subData && subData.results) || []);

        // Tech map: domain -> sorted unique technologies (deduplicated by tech name)
        const techMap = {};
        techList.forEach(item => {
          const host = item.domain || item.subdomain || '';
          if (!host) return;
          const techs = Array.isArray(item.technologies) ? item.technologies : [];
          const cleaned = deduplicateTechnologies(techs);
          if (cleaned.length) techMap[host] = cleaned;
        });

        // 2) Build the row list: ONLY subdomains which actually have detected technologies
        const rowsByHost = {};
        const addRow = (host, src) => {
          if (!host || rowsByHost[host]) return;
          const rawTechs = Array.isArray(src.technologies) ? src.technologies : [];
          const combined = [
            ...(techMap[host] || []),
            ...rawTechs
          ];
          const finalTechs = deduplicateTechnologies(combined);

          // Only include subdomains which actually have technologies
          if (!finalTechs || finalTechs.length === 0) return;

          let dateStr = '—';
          const rawDate = src.created_date || src.created_at || src.discovered_at || src.created;
          if (rawDate) {
            try {
              const d = new Date(rawDate);
              dateStr = isNaN(d.getTime()) ? String(rawDate).split('T')[0] : d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);
            } catch {
              dateStr = String(rawDate);
            }
          }

          let updatedStr = '—';
          const rawUpdated = src.updated_date || src.updated_at || src.last_scan || src.updated;
          if (rawUpdated) {
            try {
              const d = new Date(rawUpdated);
              updatedStr = isNaN(d.getTime()) ? String(rawUpdated).split('T')[0] : d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0].substring(0, 5);
            } catch {
              updatedStr = String(rawUpdated);
            }
          }

          rowsByHost[host] = {
            id: src.id || host,
            subdomain: host,
            parentDomain: getParentDomain(host),
            status: src.status || 'Active',
            title: src.title || '-',
            createdDate: dateStr,
            updatedDate: updatedStr,
            technologies: finalTechs,
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
  }, [activeScanId, selectedDomain]);

  const [techFilter, setTechFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE' | 'WITH_VERSION'

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <div style={{ marginBottom: '1.25rem' }}>
          <ScanSelector 
            assignedDomains={assignedDomains}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
            scansList={scansList}
            activeScanId={activeScanId}
            handleSelectScan={handleSelectScan}
          />
        </div>

        <TechDashboard 
          technologies={subdomainTechs} 
          loading={loading} 
          techFilter={techFilter}
          setTechFilter={setTechFilter}
        />

        <div style={{ marginTop: '1.5rem' }}>
          <TechTable 
            onDataFiltered={setFilteredData} 
            subdomainTechs={subdomainTechs} 
            loading={loading} 
            selectedDomain={selectedDomain} 
            techFilter={techFilter}
            setTechFilter={setTechFilter}
          />
        </div>
      </div>
    </div>
  );
};

export default Technologies;
