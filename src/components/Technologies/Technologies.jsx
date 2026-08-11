import React, { useState, useEffect } from 'react';
import TechDashboard from './TechDashboard';
import TechTable from './TechTable';
import ScanSelector from '../common/ScanSelector';
import './Technologies.css';
import { api } from '../../utils/api';

const Technologies = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Fetch tech stack results
  useEffect(() => {
    const loadTechnologies = async () => {
      try {
        setLoading(true);
        let rawItems = [];
        const seenDomains = new Set();

        if (selectedDomain && activeScanId) {
          // Specific domain: fetch from that scan only
          const data = await api.get(`/api/attacksurface/technologies/?scan=${activeScanId}`);
          const list = Array.isArray(data) ? data : (data.results || []);
          list.forEach(item => {
            const domain = item.domain || '';
            if (!seenDomains.has(domain)) { seenDomains.add(domain); rawItems.push(item); }
          });
        } else if (!selectedDomain && scansList && scansList.length > 0) {
          // All Domains: fetch from ALL scans and combine
          for (const scan of scansList) {
            try {
              const data = await api.get(`/api/attacksurface/technologies/?scan=${scan.id}`);
              const list = Array.isArray(data) ? data : (data.results || []);
              list.forEach(item => {
                const domain = item.domain || '';
                if (!seenDomains.has(domain)) { seenDomains.add(domain); rawItems.push(item); }
              });
            } catch (e) { /* skip failed */ }
          }
        }

        // Flatten domain -> technologies
        const techCounts = {};
        const techHosts = {};
        const techVersions = {};

        rawItems.forEach(item => {
          const techs = Array.isArray(item.technologies) ? item.technologies : [];
          techs.forEach(tech => {
            let name = tech;
            let version = '';
            
            // Remove the tool tag e.g. [Wappalyzer], [HTTPX] for clean merging
            const toolMatch = name.match(/\s*\[(.*?)\]$/);
            if (toolMatch) {
              name = name.replace(toolMatch[0], '').trim();
            }

            if (name.includes('/')) {
              const parts = name.split('/');
              name = parts[0];
              version = parts[1];
            } else if (name.includes(' (v')) {
              const parts = name.split(' (v');
              name = parts[0];
              version = parts[1].replace(')', '');
            }
            const key = name.trim();
            techCounts[key] = (techCounts[key] || 0) + 1;
            
            if (!techHosts[key]) techHosts[key] = [];
            if (!techHosts[key].includes(item.domain)) {
              techHosts[key].push(item.domain);
            }

            if (version && version !== '—') {
              techVersions[key] = version;
            }
          });
        });

        const parsedList = Object.keys(techCounts).map((name, idx) => {
          const nameLower = name.toLowerCase();
          let category = 'Miscellaneous';
          
          if (['nginx', 'apache', 'iis', 'caddy', 'gunicorn', 'tomcat', 'web server', 'litespeed', 'openresty'].some(k => nameLower.includes(k))) {
            category = 'Web servers';
          } else if (['react', 'angular', 'vue', 'jquery', 'next', 'nuxt', 'bootstrap', 'semantic', 'core-js', 'moment', 'lodash', 'three.js'].some(k => nameLower.includes(k))) {
            category = 'JavaScript libraries';
          } else if (['django', 'flask', 'express', 'laravel', 'php', 'python', 'node', 'ruby', 'spring', 'go', 'java'].some(k => nameLower.includes(k))) {
            category = 'Programming languages';
          } else if (['cloudflare', 'cloudfront', 'fastly', 'cdn', 'akamai'].some(k => nameLower.includes(k))) {
            category = 'CDN';
          } else if (['google analytics', 'clarity', 'pixel', 'mixpanel', 'hotjar', 'segment', 'analytics', 'tag manager'].some(k => nameLower.includes(k))) {
            category = 'Analytics';
          } else if (['recaptcha', 'captcha', 'hcaptcha', 'waf', 'firewall', 'imperva', 'incapsula', 'security'].some(k => nameLower.includes(k))) {
            category = 'Security';
          } else if (['font', 'awesome', 'google font', 'typekit'].some(k => nameLower.includes(k))) {
            category = 'Font scripts';
          } else if (['aws', 'amazon', 'heroku', 'vercel', 'netlify', 'azure', 'google cloud', 'gcp', 'paas'].some(k => nameLower.includes(k))) {
            category = 'PaaS';
          }

          let risk = 'LOW';
          if (['jquery', 'apache'].some(k => nameLower.includes(k))) risk = 'HIGH';
          else if (['nginx', 'mysql', 'tomcat'].some(k => nameLower.includes(k))) risk = 'MEDIUM';

          return {
            id: idx + 1,
            name,
            version: techVersions[name] || '',
            category,
            eol: nameLower.includes('jquery') ? '2021-05-01' : 'Supported',
            risk,
            assets: techCounts[name],
            hosts: techHosts[name]
          };
        });

        setTechnologies(parsedList);
      } catch (e) {
        console.error("Failed to load technologies", e);
        setTechnologies([]);
      } finally {
        setLoading(false);
      }
    };

    if (!selectedDomain && (!scansList || scansList.length === 0)) {
      setTechnologies([]);
      setLoading(false);
      return;
    }
    if (selectedDomain && !activeScanId) {
      setTechnologies([]);
      setLoading(false);
      return;
    }

    loadTechnologies();
  }, [activeScanId, selectedDomain, scansList]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      alert("No data to export!");
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Technology Name,Version,Category,End of Life,Risk Level,Assets\n"
      + filteredData.map(row => 
          `"${row.name}","${row.version}","${row.category}","${row.eol}","${row.risk}",${row.assets}`
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
        <ScanSelector 
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          scansList={scansList}
          activeScanId={activeScanId}
          handleSelectScan={handleSelectScan}
        />

        <TechDashboard onExport={handleExport} technologies={technologies} loading={loading} />

        <TechTable onDataFiltered={setFilteredData} technologies={technologies} loading={loading} />
      </div>
    </div>
  );
};

export default Technologies;
