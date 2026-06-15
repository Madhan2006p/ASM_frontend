import React, { useState } from 'react';
import { Check, Download, Star, Shield, Globe, Zap, Eye, Search, Lock, Activity, Database, Bell, GitBranch, AlertCircle } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import './Marketplace.css';

const plugins = [
  {
    id: 1,
    name: 'Shodan Integrator',
    category: 'Threat Intelligence',
    description: 'Continuously sync exposed assets and vulnerabilities discovered by Shodan across your monitored domains and IP ranges.',
    icon: <Globe size={22} />,
    iconColor: '#60A5FA',
    iconBg: 'rgba(59,130,246,0.12)',
    rating: 4.8,
    reviews: 142,
    installs: '12.4k',
    tag: 'Popular',
    tagColor: '#3B82F6',
    installed: false,
  },
  {
    id: 2,
    name: 'VirusTotal Scanner',
    category: 'Malware Detection',
    description: 'Scan domains, IPs, and URLs against VirusTotal\'s database of 70+ antivirus engines in real time.',
    icon: <Shield size={22} />,
    iconColor: '#34D399',
    iconBg: 'rgba(52,211,153,0.12)',
    rating: 4.9,
    reviews: 210,
    installs: '18.2k',
    tag: 'Trusted',
    tagColor: '#10B981',
    installed: true,
  },
  {
    id: 3,
    name: 'Nuclei Scanner',
    category: 'Vulnerability',
    description: 'Run automated vulnerability templates from ProjectDiscovery\'s Nuclei engine against your exposed assets.',
    icon: <Zap size={22} />,
    iconColor: '#FBBF24',
    iconBg: 'rgba(251,191,36,0.12)',
    rating: 4.7,
    reviews: 98,
    installs: '8.1k',
    tag: 'New',
    tagColor: '#F59E0B',
    installed: false,
  },
  {
    id: 4,
    name: 'OSINT Framework',
    category: 'Reconnaissance',
    description: 'Automated open-source intelligence gathering for domains, people, emails, and IP addresses using OSINT techniques.',
    icon: <Eye size={22} />,
    iconColor: '#A78BFA',
    iconBg: 'rgba(167,139,250,0.12)',
    rating: 4.6,
    reviews: 76,
    installs: '5.3k',
    tag: 'Beta',
    tagColor: '#8B5CF6',
    installed: false,
  },
  {
    id: 5,
    name: 'DNS Recon Pro',
    category: 'Asset Discovery',
    description: 'Advanced DNS enumeration with zone transfer detection, wildcard bruteforce, and passive DNS correlation.',
    icon: <Search size={22} />,
    iconColor: '#38BDF8',
    iconBg: 'rgba(56,189,248,0.12)',
    rating: 4.5,
    reviews: 54,
    installs: '3.8k',
    tag: 'Popular',
    tagColor: '#0EA5E9',
    installed: false,
  },
  {
    id: 6,
    name: 'SSL Inspector',
    category: 'Certificates',
    description: 'Deep certificate analysis — TLS grades, chain validation, CT log monitoring, and expiry alerts via Slack or email.',
    icon: <Lock size={22} />,
    iconColor: '#FB923C',
    iconBg: 'rgba(251,146,60,0.12)',
    rating: 4.8,
    reviews: 119,
    installs: '9.7k',
    tag: 'Trusted',
    tagColor: '#F97316',
    installed: true,
  },
  {
    id: 7,
    name: 'Slack Alerts',
    category: 'Notifications',
    description: 'Push real-time security alerts, scan results, and asset changes directly to your configured Slack workspace channels.',
    icon: <Bell size={22} />,
    iconColor: '#F472B6',
    iconBg: 'rgba(244,114,182,0.12)',
    rating: 4.7,
    reviews: 88,
    installs: '14.5k',
    tag: 'Popular',
    tagColor: '#EC4899',
    installed: false,
  },
  {
    id: 8,
    name: 'GitHub Secrets Monitor',
    category: 'Surface Web',
    description: 'Continuously monitor public GitHub repositories for leaked API keys, tokens, passwords, and sensitive credentials.',
    icon: <GitBranch size={22} />,
    iconColor: '#94A3B8',
    iconBg: 'rgba(148,163,184,0.12)',
    rating: 4.9,
    reviews: 201,
    installs: '22.1k',
    tag: 'Trending',
    tagColor: '#64748B',
    installed: false,
  },
  {
    id: 9,
    name: 'CVE Enrichment',
    category: 'Vulnerability',
    description: 'Auto-enrich detected vulnerabilities with NVD/EPSS data, CVSS scoring, CISA KEV indicators, and patch advisories.',
    icon: <AlertCircle size={22} />,
    iconColor: '#F87171',
    iconBg: 'rgba(248,113,113,0.12)',
    rating: 4.8,
    reviews: 133,
    installs: '10.2k',
    tag: 'Essential',
    tagColor: '#EF4444',
    installed: true,
  },
  {
    id: 10,
    name: 'Splunk Exporter',
    category: 'SIEM Integration',
    description: 'Forward ASM events, findings, and asset data to Splunk in real time using the Splunk HEC or REST API connector.',
    icon: <Database size={22} />,
    iconColor: '#6EE7B7',
    iconBg: 'rgba(110,231,183,0.12)',
    rating: 4.6,
    reviews: 67,
    installs: '4.9k',
    tag: 'Enterprise',
    tagColor: '#059669',
    installed: false,
  },
  {
    id: 11,
    name: 'Uptime Monitor',
    category: 'Monitoring',
    description: 'Track availability and response time for all discovered web assets with multi-region probing and incident reporting.',
    icon: <Activity size={22} />,
    iconColor: '#67E8F9',
    iconBg: 'rgba(103,232,249,0.12)',
    rating: 4.4,
    reviews: 42,
    installs: '2.6k',
    tag: 'New',
    tagColor: '#06B6D4',
    installed: false,
  },
  {
    id: 12,
    name: 'Cloudflare WAF Bridge',
    category: 'Defense',
    description: 'Automatically push blocklists, IP reputation data, and threat actor indicators to your Cloudflare WAF rulesets.',
    icon: <Shield size={22} />,
    iconColor: '#FDE68A',
    iconBg: 'rgba(253,230,138,0.12)',
    rating: 4.7,
    reviews: 91,
    installs: '7.3k',
    tag: 'Popular',
    tagColor: '#D97706',
    installed: false,
  },
];

const categories = ['All', 'Vulnerability', 'Asset Discovery', 'Threat Intelligence', 'Malware Detection', 'Reconnaissance', 'Certificates', 'Notifications', 'Surface Web', 'SIEM Integration', 'Monitoring', 'Defense'];

const Marketplace = () => {
  const [installedIds, setInstalledIds] = useState(
    plugins.filter(p => p.installed).map(p => p.id)
  );
  const [installing, setInstalling] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const handleInstall = (id) => {
    if (installedIds.includes(id)) return;
    setInstalling(id);
    setTimeout(() => {
      setInstalledIds(prev => [...prev, id]);
      setInstalling(null);
    }, 1400);
  };

  const filtered = plugins.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.category.toLowerCase().includes(search.toLowerCase()) ||
                        p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="global-page-container">
      <div className="global-max-width">
        <PageHeaderCard
          badgeText="MANAGE"
          title="Marketplace"
          subtitle="Extend your attack surface monitoring with powerful integrations and plugins."
          stats={[
            { label: 'Available Plugins', value: `${plugins.length}`, subtext: 'Ready to install' },
            { label: 'Installed',         value: `${installedIds.length}`, subtext: 'Active integrations' },
          ]}
        />

        {/* Search + Category Filter */}
        <div className="mp-controls">
          <div className="mp-search-wrapper">
            <Search size={15} className="mp-search-icon" />
            <input
              type="text"
              className="mp-search"
              placeholder="Search plugins…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mp-category-row">
            {categories.map(cat => (
              <button
                key={cat}
                className={`mp-cat-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Plugin Grid */}
        <div className="mp-grid">
          {filtered.map(plugin => {
            const isInstalled = installedIds.includes(plugin.id);
            const isInstalling = installing === plugin.id;
            return (
              <div key={plugin.id} className="mp-card">
                {/* Icon + Rating/Tag Row */}
                <div className="mp-card-top">
                  <div className="mp-icon" style={{ color: plugin.iconColor, background: plugin.iconBg }}>
                    {plugin.icon}
                  </div>
                  <div className="mp-card-top-right">
                    <div className="mp-tag" style={{ color: plugin.tagColor, background: `${plugin.tagColor}18`, borderColor: `${plugin.tagColor}35` }}>
                      {plugin.tag}
                    </div>
                    <div className="mp-rating">
                      <Star size={12} fill={plugin.iconColor} stroke="none" />
                      <span>{plugin.rating}</span>
                      <span className="mp-rating-count">({plugin.reviews})</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="mp-card-info">
                  <div className="mp-card-category">{plugin.category}</div>
                  <div className="mp-card-name">{plugin.name}</div>
                  <div className="mp-card-desc">{plugin.description}</div>
                </div>

                {/* Footer */}
                <div className="mp-card-footer">
                  <span className="mp-installs">
                    <Download size={11} />
                    {plugin.installs} installs
                  </span>
                  <button
                    className={`mp-install-btn ${isInstalled ? 'installed' : ''} ${isInstalling ? 'installing' : ''}`}
                    onClick={() => handleInstall(plugin.id)}
                    disabled={isInstalled || isInstalling}
                    style={isInstalled ? {} : { borderColor: `${plugin.tagColor}60`, color: plugin.iconColor }}
                  >
                    {isInstalling ? (
                      <span className="mp-spinner" />
                    ) : isInstalled ? (
                      <><Check size={13} /> Installed</>
                    ) : (
                      <><Download size={13} /> Install</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mp-empty">
            <Search size={32} />
            <p>No plugins found for "<strong>{search}</strong>"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
