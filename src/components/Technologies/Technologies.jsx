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

        if (activeScanId) {
          try {
            const data = await api.get(`/api/attacksurface/technologies/?scan=${activeScanId}`);
            const list = Array.isArray(data) ? data : (data.results || []);
            list.forEach(item => rawItems.push(item));
          } catch (e) { /* skip */ }
        }

        // If no TechnologyResult items, fallback to EndpointResult technologies
        if (rawItems.length === 0 && activeScanId) {
          try {
            const epData = await api.get(`/api/attacksurface/endpoints/?scan=${activeScanId}`);
            const epList = Array.isArray(epData) ? epData : (epData.results || []);
            epList.forEach(item => {
              if (item.technologies && item.technologies.length > 0) {
                rawItems.push({
                  domain: item.subdomain_name || item.http_url || '',
                  technologies: item.technologies
                });
              }
            });
          } catch (e) { /* skip */ }
        }

        if (rawItems.length === 0 && scansList && scansList.length > 0) {
          for (const scan of scansList) {
            try {
              const data = await api.get(`/api/attacksurface/technologies/?scan=${scan.id}`);
              const list = Array.isArray(data) ? data : (data.results || []);
              list.forEach(item => rawItems.push(item));
            } catch (e) { /* skip */ }
          }
        }

        // Flatten domain -> technologies
        const techCounts = {};
        const techHosts = {};
        const techVersions = {};
        const techSubdomains = {};
        const techCategories = {};

        rawItems.forEach(item => {
          const domainName = item.domain || '';
          const techs = Array.isArray(item.technologies) ? item.technologies : [];
          techs.forEach(tech => {
            let name = tech;
            let version = '';
            let explicitCategory = '';

            // Extract category tag e.g. [Analytics], [Web servers], [JavaScript libraries]
            const catMatch = name.match(/\s*\[(.*?)\]$/);
            if (catMatch) {
              const tag = catMatch[1].trim();
              if (tag !== 'Wappalyzer' && tag !== 'HTTPX') {
                explicitCategory = tag;
              }
              name = name.replace(catMatch[0], '').trim();
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
            if (explicitCategory) {
              techCategories[key] = explicitCategory;
            }
            
            if (!techHosts[key]) techHosts[key] = [];
            if (!techHosts[key].includes(domainName)) {
              techHosts[key].push(domainName);
            }

            if (!techSubdomains[key]) techSubdomains[key] = [];
            const existingSub = techSubdomains[key].find(s => s.subdomain === domainName);
            if (!existingSub) {
              techSubdomains[key].push({
                subdomain: domainName,
                parentDomain: domainName,
                version: version || 'Unknown',
                status: 'Active'
              });
            } else if (version && existingSub.version === 'Unknown') {
              existingSub.version = version;
            }

            if (version && version !== '—') {
              techVersions[key] = version;
            }
          });
        });

        const parsedList = Object.keys(techCounts).map((name, idx) => {
          const nameLower = name.toLowerCase();
          let category = techCategories[name] || 'Miscellaneous';
          
          if (category === 'Miscellaneous') {
            if (['google analytics', 'facebook pixel', 'clarity', 'mixpanel', 'hotjar', 'segment', 'cloudflare browser insights'].some(k => nameLower.includes(k))) {
              category = 'Analytics';
            } else if (['recaptcha', 'hcaptcha', 'captcha', 'waf', 'imperva', 'incapsula', 'security', 'hsts'].some(k => nameLower.includes(k))) {
              category = 'Security';
            } else if (['font', 'awesome', 'google font', 'typekit', 'svg support', 'webfontloader'].some(k => nameLower.includes(k))) {
              category = 'Font scripts';
            } else if (['nginx', 'apache', 'iis', 'caddy', 'gunicorn', 'tomcat', 'web server', 'litespeed', 'litespeed cache', 'openresty', 'varnish'].some(k => nameLower.includes(k))) {
              category = 'Web servers';
            } else if (['php', 'python', 'node', 'ruby', 'java', 'go', 'perl', 'django', 'flask', 'express', 'laravel', 'spring', 'codeigniter'].some(k => nameLower.includes(k))) {
              category = 'Programming languages';
            } else if (['cloudflare', 'cdnjs', 'cloudfront', 'fastly', 'cdn', 'akamai', 'jsdelivr', 'unpkg', 'bootstrapcdn', 'jquery cdn'].some(k => nameLower.includes(k))) {
              category = 'CDN';
            } else if (['google tag manager', 'matomo tag manager', 'tag manager'].some(k => nameLower.includes(k))) {
              category = 'Tag managers';
            } else if (['react', 'angular', 'vue', 'jquery', 'next', 'nuxt', 'bootstrap', 'semantic', 'core-js', 'moment', 'lodash', 'three.js', 'owl carousel', 'magnific popup', 'slick', 'lightbox', 'htmx', 'datatables', 'popper', 'modernizr', 'underscore', 'sweetalert', 'select2', 'swiper', 'fitvids', 'stellar.js', 'bxslider', 'webpack'].some(k => nameLower.includes(k))) {
              category = 'JavaScript libraries';
            } else if (['aws', 'amazon', 'heroku', 'vercel', 'netlify', 'azure', 'google cloud', 'gcp', 'paas', 'hostinger'].some(k => nameLower.includes(k))) {
              category = 'PaaS';
            } else if (['wordpress', 'elementor', 'yoast seo', 'contact form 7', 'wp rocket', 'wpbakery', 'slider revolution', 'smart slider', 'twenty twenty', 'wordpress block editor', 'moodle', 'drupal', 'joomla', 'shopify', 'magento', 'ghost', 'wix', 'squarespace', 'conditional fields'].some(k => nameLower.includes(k))) {
              category = 'CMS';
            } else if (['mysql', 'postgresql', 'mongodb', 'redis', 'mariadb', 'sqlite', 'oracle', 'mssql', 'percona'].some(k => nameLower.includes(k))) {
              category = 'Databases';
            }
          }

          let risk = 'LOW';
          if (['jquery', 'apache'].some(k => nameLower.includes(k))) risk = 'HIGH';
          else if (['nginx', 'mysql', 'tomcat'].some(k => nameLower.includes(k))) risk = 'MEDIUM';

          const subs = techSubdomains[name] || [];
          return {
            id: idx + 1,
            name,
            version: techVersions[name] || 'Unknown',
            category,
            eol: nameLower.includes('jquery') ? '2021-05-01' : 'Supported',
            risk,
            assets: subs.length,
            hosts: techHosts[name] || [],
            subdomains: subs
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
