import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import Overview from './components/Dashboard/Overview';
import SubdomainDiscovery from './components/SubdomainDiscovery/SubdomainDiscovery';
import Endpoints from './components/Endpoints/Endpoints';
import Vulnerabilities from './components/Vulnerabilities/Vulnerabilities';
import Certificates from './components/Certificates/Certificates';
import OpenPorts from './components/OpenPorts/OpenPorts';
import Directories from './components/Directories/Directories';
import Technologies from './components/Technologies/Technologies';
import AntiPhishing from './components/AntiPhishing/AntiPhishing';
import AntiMalware from './components/AntiMalware/AntiMalware';
import SuspiciousDomains from './components/SuspiciousDomains/SuspiciousDomains';
import EmailSecurity from './components/EmailSecurity/EmailSecurity';
import EmailSecurityDashboard from './components/EmailSecurity/EmailSecurityDashboard';
import MobileVAPT from './components/MobileVAPT/MobileVAPT';
import MobileVAPTDashboard from './components/MobileVAPT/MobileVAPTDashboard';
import SurfaceWeb from './components/SurfaceWeb/SurfaceWeb';
import ImpersonatingAccount from './components/ImpersonatingAccount/ImpersonatingAccount';
import LandingPage from './components/Auth/LandingPage';
import Login from './components/Auth/Login';
import Settings from './components/Settings/Settings';
import Marketplace from './components/Marketplace/Marketplace';
import SuperAdminDashboard from './components/AdminPanel/SuperAdminDashboard';
import GlobalAlert from './components/common/GlobalAlert';
import ScanProgressPanel from './components/ScanProgress/ScanProgressPanel';
import InternalDashboard from './components/InternalDiscovery/InternalDashboard';
import NetworkDiscovery from './components/InternalDiscovery/NetworkDiscovery';
import ServiceDiscovery from './components/InternalDiscovery/ServiceDiscovery';
import WebAssetDiscovery from './components/InternalDiscovery/WebAssetDiscovery';
import SSLTLSDiscovery from './components/InternalDiscovery/SSLTLSDiscovery';
import ActiveDirectory from './components/InternalDiscovery/ActiveDirectory';
import AssetDiscoveryDashboard from './components/Dashboard/AssetDiscoveryDashboard';
import ExecutiveDashboard from './components/Dashboard/ExecutiveDashboard';
import BrandMonitoringDashboard from './components/Dashboard/BrandMonitoringDashboard';
import AttackPathAnalysisDashboard from './components/AttackPathAnalysis/AttackPathAnalysisDashboard';
import VaptReport from './components/VaptReport/VaptReport';
import { api } from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRoute, setAuthRoute] = useState('landing');
  const [activePage, setActivePage] = useState('Executive Dashboard');
  const [user, setUser] = useState(null);

  const [activeScanId, setActiveScanId] = useState(null);
  const [activeTarget, setActiveTarget] = useState('');
  const [scansList, setScansList] = useState([]);
  const [assignedDomains, setAssignedDomains] = useState([]);

  const handleLogin = (userData) => {
    if (userData) {
      setUser({
        id: userData.id,
        name: userData.name || userData.email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        email: userData.email,
        organization: userData.organization || 'Infotech Sentinel',
        organization_id: userData.organization_id || '1',
        logo_url: userData.logo_url || null,
        is_superuser: userData.is_superuser || false,
        role: userData.role || 'member',
        features: userData.features || [],
        profile_photo_url: userData.profile_photo_url || null,
      });
      // Store admin-assigned domains from login payload
      if (Array.isArray(userData.assigned_domains)) {
        setAssignedDomains(userData.assigned_domains);
      }
      
      if (userData.is_superuser) {
        setActivePage('Super Admin Dashboard');
      } else if (activePage === 'Super Admin Dashboard') {
        setActivePage('Executive Dashboard');
      }
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.setTokens(null, null);
    setIsAuthenticated(false);
    setUser(null);
    setActivePage('Executive Dashboard');
    setAuthRoute('landing');
    setActiveScanId(null);
    setActiveTarget('');
    setScansList([]);
    setAssignedDomains([]);
  };

  const fetchScans = async (selectLatest = false) => {
    try {
      const data = await api.get('/api/attacksurface/scans/');
      const list = Array.isArray(data) ? data : (data?.results || []);
      setScansList(list);
      if (list.length > 0) {
        const latest = list[0];
        if (selectLatest || !activeScanId) {
          setActiveScanId(latest.id);
          setActiveTarget(latest.target);
        }
      }
    } catch (e) {
      console.error("Failed to fetch scans history", e);
    }
  };

  const handleSelectScan = (scanId, target) => {
    const match = scansList.find(s => s.id === Number(scanId));
    if (match) {
      setActiveScanId(match.id);
      setActiveTarget(match.target);
    } else if (scanId && target) {
      // Direct set when scan is fresh (not yet in scansList)
      setActiveScanId(Number(scanId));
      setActiveTarget(target);
    }
  };

  // Check auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await api.get('/api/auth/profile/');
          // profile endpoint returns user data directly (not nested under 'user')
          handleLogin(userData);
        } catch (e) {
          console.error("Session restoration failed", e);
          api.setTokens(null, null);
        }
      }
    };
    checkSession();
  }, []);

  // Fetch scans once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchScans();
    }
  }, [isAuthenticated]);

  const [selectedDomain, setSelectedDomain] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // When selected domain changes, auto-select the latest scan for that domain
    if (selectedDomain) {
      const filtered = scansList.filter(s => s.target === selectedDomain);
      if (filtered.length > 0 && (!activeScanId || !filtered.some(s => s.id === activeScanId))) {
        setActiveScanId(filtered[0].id);
        setActiveTarget(filtered[0].target);
      } else if (filtered.length === 0) {
        setActiveScanId(null);
        setActiveTarget(selectedDomain);
      }
    } else {
      // If no domain is selected, select the absolute latest scan in scansList
      if (scansList.length > 0 && (!activeScanId || !scansList.some(s => s.id === activeScanId))) {
        setActiveScanId(scansList[0].id);
        setActiveTarget(scansList[0].target);
      }
    }
  }, [selectedDomain, scansList]);

  const filteredScansList = selectedDomain 
    ? scansList.filter(s => s.target === selectedDomain)
    : scansList;

  if (!isAuthenticated) {
    if (authRoute === 'login')  return <Login  onLogin={handleLogin} onNavigate={setAuthRoute} />;
    return <LandingPage onNavigate={setAuthRoute} />;
  }

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} user={user} />
      <div className="main-content">
        <Header
          activePage={activePage}
          setActivePage={setActivePage}
          onLogout={handleLogout}
          user={user}
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <div key={activePage} className="page-animate">
          {activePage === 'Super Admin Dashboard' && (
            <SuperAdminDashboard currentUser={user} />
          )}
          {activePage === 'Executive Dashboard' && (
            <ExecutiveDashboard 
              activeScanId={activeScanId} 
              assignedDomains={assignedDomains}
              selectedDomain={selectedDomain}
              setSelectedDomain={setSelectedDomain}
              scansList={filteredScansList} 
              handleSelectScan={handleSelectScan} 
            />
          )}
          {activePage === 'Subdomain Discovery'   && (
            <SubdomainDiscovery 
              activeScanId={activeScanId} 
              activeTarget={activeTarget} 
              scansList={filteredScansList} 
              handleSelectScan={handleSelectScan} 
              fetchScans={fetchScans} 
              assignedDomains={assignedDomains}
              selectedDomain={selectedDomain}
              setSelectedDomain={setSelectedDomain}
            />
          )}
          {activePage === 'Endpoints'             && <Endpoints activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Open Ports'            && <OpenPorts activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Directories'           && <Directories activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Technologies'          && <Technologies activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Dashboard'             && <InternalDashboard />}
          {activePage === 'Network Discovery'     && <NetworkDiscovery />}
          {activePage === 'Service Discovery'     && <ServiceDiscovery />}
          {activePage === 'Web Asset Discovery'   && <WebAssetDiscovery />}
          {activePage === 'SSL/TLS Discovery'     && <SSLTLSDiscovery />}
          {activePage === 'Active Directory'      && <ActiveDirectory />}
          {activePage === 'Email Security Dashboard' && <EmailSecurityDashboard activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Email Security'        && <EmailSecurity activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}

          {activePage === 'Asset Discovery Dashboard' && <AssetDiscoveryDashboard activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Brand Monitoring Dashboard'&& <BrandMonitoringDashboard />}
          {activePage === 'Attack Path Analysis Dashboard' && <AttackPathAnalysisDashboard activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}

          {activePage === 'Mobile Security Dashboard' && <MobileVAPTDashboard />}
          {activePage === 'Mobile Security'       && <MobileVAPT />}
          {activePage === 'Vulnerabilities'       && <Vulnerabilities activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'SSL Certificates'      && <Certificates activeScanId={activeScanId} assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} scansList={filteredScansList} handleSelectScan={handleSelectScan} />}
          {activePage === 'Surface Web'           && <SurfaceWeb activeTarget={activeTarget} />}
          {activePage === 'Suspicious Domain'     && <SuspiciousDomains activeTarget={activeTarget} />}
          {activePage === 'Phishing Domain'       && <AntiPhishing activeTarget={activeTarget} />}
          {activePage === 'Impersonating Account' && <ImpersonatingAccount activeTarget={activeTarget} />}
          {activePage === 'Anti Malware'          && <AntiMalware activeTarget={activeTarget} />}
          {activePage === 'VAPT Report'  && (
            <VaptReport
              activeScanId={activeScanId}
              scansList={filteredScansList}
              selectedDomain={selectedDomain}
              handleSelectScan={handleSelectScan}
            />
          )}
          {activePage === 'Marketplace' && <Marketplace />}
          {activePage === 'Settings'    && <Settings user={user} setUser={setUser} />}
        </div>
      </div>
      <ScanProgressPanel
        activeScanId={activeScanId}
        scansList={filteredScansList}
        fetchScans={fetchScans}
      />
      <GlobalAlert />
    </div>
  );
}

export default App;
