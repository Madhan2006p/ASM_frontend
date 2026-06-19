import React, { useState, useEffect } from 'react'; 
import { 
  Home, Globe, Search, Crosshair, PlusSquare, ShieldCheck,
  Eye, Activity, AlertCircle, FileText, Settings,
  ChevronDown, Shield, Mail, Smartphone, User, Store
} from 'lucide-react';
import './Sidebar.css';
import { BASE_URL } from '../../utils/api';

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
    title: 'EMAIL SECURITY',
    items: [
      { name: 'Email Security Dashboard', icon: <Activity size={16} /> },
      { name: 'Email Security',      icon: <Mail size={16} /> },
    ]
  },
  {
    title: 'MOBILE SECURITY',
    items: [
      { name: 'Mobile Security Dashboard', icon: <Activity size={16} /> },
      { name: 'Mobile Security', icon: <Smartphone size={16} /> },
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
      { name: 'VAPT Report',  icon: <FileText size={16} /> },
      { name: 'Marketplace', icon: <Store size={16} /> },
      { name: 'Settings',    icon: <Settings size={16} /> },
    ]
  }
];

const itemFeatureMap = {
  // ASSET DISCOVERY
  'Asset Discovery Dashboard': '1',
  'Subdomain Discovery': '1',
  'Endpoints': '1',
  'Open Ports': '1',
  'Directories': '1',
  'Technologies': '1',
  'Vulnerabilities': '1',
  'SSL Certificates': '1',

  // MOBILE SECURITY
  'Mobile Security Dashboard': '2',
  'Mobile Security': '2',

  // EMAIL SECURITY
  'Email Security Dashboard': '3',
  'Email Security': '3',



  // SURFACE WEB MONITORING
  'Surface Web': '5',

  // BRAND MONITORING
  'Brand Monitoring Dashboard': '6',
  'Suspicious Domain': '6',
  'Phishing Domain': '6',
  'Impersonating Account': '6',
  'Anti Malware': '6',
};

const isItemVisible = (itemName, userFeatures, isSuperuser) => {
  if (isSuperuser) return true;
  
  // If userFeatures is not set or is empty, default to true (all unlocked)
  if (!userFeatures || userFeatures.length === 0) return true;

  // General mapping check
  const featureId = itemFeatureMap[itemName];
  if (!featureId) {
    // If not mapped to a feature ID, it's visible to everyone
    return true;
  }

  return userFeatures.includes(featureId);
};

const Sidebar = ({ activePage, setActivePage, onLogout, user }) => {
  const [expandedGroups, setExpandedGroups] = useState({
    'ASSET DISCOVERY': true,
    'ATTACK PATH ANALYSIS': false,
    'EMAIL SECURITY': false,
    'SURFACE WEB MONITORING': false,
    'BRAND MONITORING': false,
    'MANAGE': false,
    'MOBILE SECURITY': false,
  });

  const filteredMenuGroups = menuGroups.map(group => {
    const visibleItems = group.items.filter(item => isItemVisible(item.name, user?.features, user?.is_superuser));
    return {
      ...group,
      items: visibleItems
    };
  }).filter(group => group.items.length > 0);

  useEffect(() => {
    const activeGroup = filteredMenuGroups.find(g => g.items.some(item => item.name === activePage));
    if (activeGroup) {
      setExpandedGroups({
        'ASSET DISCOVERY': false,
        'ATTACK PATH ANALYSIS': false,
        'EMAIL SECURITY': false,
        'SURFACE WEB MONITORING': false,
        'BRAND MONITORING': false,
        'MANAGE': false,
        'MOBILE SECURITY': false,
        [activeGroup.title]: true
      });
    }
  }, [activePage, user]);

  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => {
      const isAlreadyExpanded = prev[groupTitle];
      const nextExpanded = {
        'ASSET DISCOVERY': false,
        'ATTACK PATH ANALYSIS': false,
        'EMAIL SECURITY': false,
        'SURFACE WEB MONITORING': false,
        'BRAND MONITORING': false,
        'MANAGE': false,
        'MOBILE SECURITY': false,
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
          <img src={orgLogo.startsWith('http') ? orgLogo : `${BASE_URL}${orgLogo}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'contain' }} />
        ) : (
          <Shield className="brand-logo" size={28} />
        )}
        <span className="brand-name" style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: '1.2', color: '#F0F6FF' }}>
          {orgName}
        </span>
      </div>

      <div className="sidebar-scrollable">
        {user?.is_superuser ? (
          <>
            <div className="nav-menu" style={{ marginBottom: '0.25rem' }}>
              <div
                className={`nav-item ${activePage === 'Super Admin Dashboard' ? 'active' : ''}`}
                onClick={() => setActivePage('Super Admin Dashboard')}
              >
                <span className="nav-icon"><Shield size={16} /></span>
                <span>Super Admin Dashboard</span>
              </div>
            </div>
            <div className="nav-menu" style={{ marginBottom: '0.25rem' }}>
              <div
                className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
                onClick={() => setActivePage('Settings')}
              >
                <span className="nav-icon"><Settings size={16} /></span>
                <span>Settings</span>
              </div>
            </div>
          </>
        ) : (
          <>
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

            {/* Menu Groups */}
            {filteredMenuGroups.map((group, idx) => {
              const isExpanded = expandedGroups[group.title];
              return (
                <div key={idx} className="nav-group">
                  <div className="nav-group-title" onClick={() => toggleGroup(group.title)}>
                    <span>{group.title}</span>
                    <ChevronDown size={14} className={`nav-chevron ${isExpanded ? 'expanded' : ''}`} style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }} />
                  </div>
                  {isExpanded && (
                    <div className="nav-menu">
                      {group.items.map((item, i) => (
                        <div 
                          key={i} 
                          className={`nav-item ${activePage === item.name ? 'active' : ''}`}
                          onClick={() => setActivePage(item.name)}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
