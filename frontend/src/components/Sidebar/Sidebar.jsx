import React, { useState, useEffect } from 'react'; 
import { 
  Home, Globe, Search, Crosshair, PlusSquare, ShieldCheck,
  Eye, Activity, AlertCircle, FileText, Settings,
  ChevronDown, Shield, Mail, Smartphone, User, Store
} from 'lucide-react';
import './Sidebar.css';

const menuGroups = [
  {
    title: 'ASSET DISCOVERY',
    items: [
      { name: 'Asset Discovery Dashboard', icon: <Activity size={16} /> },
      { name: 'Subdomain Discovery', icon: <Search size={16} /> },
      { name: 'Endpoints',           icon: <Globe size={16} /> },
      { name: 'Open Ports',          icon: <Crosshair size={16} /> },
      { name: 'Directories',         icon: <FileText size={16} /> },
      { name: 'Technologies',        icon: <PlusSquare size={16} /> },
      { name: 'Vulnerabilities',     icon: <Eye size={16} /> },
      { name: 'SSL Certificates',    icon: <ShieldCheck size={16} /> },
    ]
  },
  {
    title: 'ATTACK PATH ANALYSIS',
    items: [
      { name: 'Attack Path Analysis Dashboard', icon: <Activity size={16} /> },
    ]
  },
  {
    title: 'INTERNAL ASSET',
    items: [
      { name: 'Dashboard',           icon: <Activity size={16} /> },
      { name: 'Network Discovery',   icon: <Globe size={16} /> },
      { name: 'Service Discovery',   icon: <Search size={16} /> },
      { name: 'Web Asset Discovery', icon: <FileText size={16} /> },
      { name: 'SSL/TLS Discovery',   icon: <ShieldCheck size={16} /> },
      { name: 'Active Directory',    icon: <User size={16} /> },
    ]
  },
  {
    title: 'EMAIL SECURITY',
    items: [
      { name: 'Email Security',      icon: <Mail size={16} /> },
    ]
  },
  {
    title: 'MOBILE APP MONITORING',
    items: [
      { name: 'Mobile VAPT', icon: <Smartphone size={16} /> },
    ]
  },
  {
    title: 'SURFACE WEB MONITORING',
    items: [
      { name: 'Surface Web',           icon: <Globe size={16} /> },
    ]
  },
  {
    title: 'BRAND MONITORING',
    items: [
      { name: 'Brand Monitoring Dashboard', icon: <Activity size={16} /> },
      { name: 'Suspicious Domain',     icon: <Search size={16} /> },
      { name: 'Phishing Domain',       icon: <Shield size={16} /> },
      { name: 'Impersonating Account', icon: <User size={16} /> },
      { name: 'Anti Malware',          icon: <AlertCircle size={16} /> },
    ]
  },
  {
    title: 'MANAGE',
    items: [
      { name: 'Marketplace', icon: <Store size={16} /> },
      { name: 'Settings',    icon: <Settings size={16} /> },
    ]
  }
];

const Sidebar = ({ activePage, setActivePage, onLogout, user }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    'ASSET DISCOVERY': true,
    'INTERNAL ASSET': false,
    'EMAIL SECURITY': false,
    'SURFACE WEB MONITORING': false,
    'BRAND MONITORING': false,
    'MANAGE': false,
    'MOBILE APP MONITORING': false,
  });

  useEffect(() => {
    const activeGroup = menuGroups.find(g => g.items.some(item => item.name === activePage));
    if (activeGroup) {
      setExpandedGroups({
        'ASSET DISCOVERY': false,
        'INTERNAL ASSET': false,
        'EMAIL SECURITY': false,
        'SURFACE WEB MONITORING': false,
        'BRAND MONITORING': false,
        'MANAGE': false,
        'MOBILE APP MONITORING': false,
        [activeGroup.title]: true
      });
    }
  }, [activePage]);

  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => {
      const isAlreadyExpanded = prev[groupTitle];
      const nextExpanded = {
        'ASSET DISCOVERY': false,
        'INTERNAL ASSET': false,
        'EMAIL SECURITY': false,
        'SURFACE WEB MONITORING': false,
        'BRAND MONITORING': false,
        'MANAGE': false,
        'MOBILE APP MONITORING': false,
      };
      if (!isAlreadyExpanded) {
        nextExpanded[groupTitle] = true;
      }
      return nextExpanded;
    });
  };

  const orgName = user?.organization || 'Infotech Sentinel';
  const orgLogo = user?.logo_url || null;

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-header" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        {orgLogo ? (
          <img src={orgLogo} alt="Org Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'contain' }} />
        ) : (
          <Shield className="brand-logo" size={28} />
        )}
        <span className="brand-name" style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: '1.2', color: 'var(--text-primary)' }}>
          {orgName}
        </span>
      </div>

      <div className="sidebar-scrollable">
        {/* Executive Dashboard */}
        <div className="nav-menu" style={{ marginBottom: '0.25rem' }}>
          <div
            className={`nav-item ${activePage === 'Executive Dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('Executive Dashboard')}
          >
            <span className="nav-icon"><Home size={16} /></span>
            <span>Executive Dashboard</span>
          </div>
        </div>

        {/* Groups */}
        {menuGroups.map((group, gi) => {
          const isExpanded = expandedGroups[group.title];
          return (
            <div key={gi} className="nav-group">
              <div
                className="nav-group-title"
                onClick={() => toggleGroup(group.title)}
              >
                <span>{group.title}</span>
                <ChevronDown
                  size={12}
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                />
              </div>
              {isExpanded && (
                <div className="nav-menu">
                  {group.items.map((item, ii) => (
                    <div
                      key={ii}
                      className={`nav-item ${activePage === item.name ? 'active' : ''}`}
                      onClick={() => item.action ? item.action() : setActivePage(item.name)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
