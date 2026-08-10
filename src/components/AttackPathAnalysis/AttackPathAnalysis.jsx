import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, GitMerge, Crosshair, ShieldAlert, Layers, ShieldCheck,
  FileText, Search, RefreshCw, Filter, Layers as LayersIcon
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import TargetDomainTabs from '../common/TargetDomainTabs';
import { fetchAndAnalyzeAttackPaths } from './attackPathEngine';

import AttackPathOverview from './AttackPathOverview';
import AttackGraph from './AttackGraph';
import AttackPathsTable from './AttackPathsTable';
import CriticalAssetsView from './CriticalAssetsView';
import MitreMappingView from './MitreMappingView';
import RecommendationsView from './RecommendationsView';
import AttackPathReportsView from './AttackPathReportsView';

import './AttackPathAnalysis.css';

const AttackPathAnalysis = ({
  activeScanId,
  assignedDomains,
  selectedDomain,
  setSelectedDomain,
  scansList,
  handleSelectScan,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab]         = useState(initialTab);
  const [loading, setLoading]             = useState(false);
  const [analysisData, setAnalysisData]   = useState(null);
  const [localScanId, setLocalScanId]     = useState(activeScanId);
  const [selectedPathForGraph, setSelectedPathForGraph] = useState(null);

  /* Reusable Filter States */
  const [filters, setFilters] = useState({
    organization: 'ALL',
    domain: 'ALL',
    subdomain: 'ALL',
    severity: 'ALL',
    technology: 'ALL',
    port: 'ALL',
    operatingSystem: 'ALL',
    cve: '',
    mitreTechnique: 'ALL',
    cloudProvider: 'ALL',
    riskLevel: 'ALL',
    dateRange: 'ALL',
    status: 'ALL',
    search: '',
  });

  const resolvedScanId = localScanId || activeScanId || null;

  /* Sync scan id */
  useEffect(() => {
    if (activeScanId && !localScanId) setLocalScanId(activeScanId);
  }, [activeScanId]);

  /* Load Analysis Data */
  const loadData = useCallback(async () => {
    if (!resolvedScanId) return;
    setLoading(true);
    try {
      const target = scansList?.find((s) => s.id === Number(resolvedScanId))?.target || selectedDomain;
      const data = await fetchAndAnalyzeAttackPaths(resolvedScanId, target);
      setAnalysisData(data);
    } catch (err) {
      console.error('Failed to load attack path analysis', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedScanId, scansList, selectedDomain]);

  useEffect(() => {
    loadData();
  }, [resolvedScanId]);

  const handleScanChange = (e) => {
    const id = Number(e.target.value);
    setLocalScanId(id);
    const found = scansList?.find((s) => s.id === id);
    if (handleSelectScan) handleSelectScan(id, found?.target);
  };

  const handleSelectPathForGraph = (path) => {
    setSelectedPathForGraph(path);
    setActiveTab('graph');
  };

  /* Navigation tab items */
  const tabs = [
    { id: 'overview',        label: 'Overview',          icon: <Activity size={15} /> },
    { id: 'graph',           label: 'Attack Graph',      icon: <GitMerge size={15} /> },
    { id: 'paths',           label: 'Attack Paths',      icon: <Crosshair size={15} /> },
    { id: 'critical-assets', label: 'Critical Assets',  icon: <ShieldAlert size={15} /> },
    { id: 'mitre',           label: 'MITRE Mapping',    icon: <Layers size={15} /> },
    { id: 'recommendations', label: 'Recommendations',  icon: <ShieldCheck size={15} /> },
    { id: 'reports',         label: 'Reports',          icon: <FileText size={15} /> },
  ];

  const currentScanMeta = scansList?.find((s) => s.id === Number(resolvedScanId));

  const filteredAnalysisData = useMemo(() => {
    if (!analysisData) return null;
    const sev = filters.severity;
    let filteredPaths = analysisData.attackPaths;
    if (sev === 'CRITICAL') filteredPaths = analysisData.attackPaths.filter(p => p.riskScore >= 80);
    else if (sev === 'HIGH') filteredPaths = analysisData.attackPaths.filter(p => p.riskScore >= 60 && p.riskScore < 80);
    else if (sev === 'MEDIUM') filteredPaths = analysisData.attackPaths.filter(p => p.riskScore >= 40 && p.riskScore < 60);
    else if (sev === 'LOW') filteredPaths = analysisData.attackPaths.filter(p => p.riskScore < 40);
    
    return {
      ...analysisData,
      attackPaths: filteredPaths
    };
  }, [analysisData, filters.severity]);

  const getPathCount = (sev) => {
    if (!analysisData) return 0;
    if (sev === 'ALL') return analysisData.attackPaths.length;
    if (sev === 'CRITICAL') return analysisData.attackPaths.filter(p => p.riskScore >= 80).length;
    if (sev === 'HIGH') return analysisData.attackPaths.filter(p => p.riskScore >= 60 && p.riskScore < 80).length;
    if (sev === 'MEDIUM') return analysisData.attackPaths.filter(p => p.riskScore >= 40 && p.riskScore < 60).length;
    if (sev === 'LOW') return analysisData.attackPaths.filter(p => p.riskScore < 40).length;
    return 0;
  };

  return (
    <div className="global-page-container page-animate apa-wrapper">
      <div style={{ marginBottom: '1.25rem' }}>
        <TargetDomainTabs
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
        />
      </div>

      {/* ── Page Header ─────────────────────────────────────── */}
      <PageHeaderCard
        badgeText="MODULE"
        title="Attack Path Analysis"
        subtitle="Automated attack chain correlation from Internet entry vectors to critical business crown jewels."
        stats={[
          { label: 'All Paths', value: getPathCount('ALL').toString(), subtext: 'correlated', active: filters.severity === 'ALL', onClick: () => setFilters({ ...filters, severity: 'ALL' }) },
          { label: 'Critical', value: getPathCount('CRITICAL').toString(), subtext: 'score >= 80', active: filters.severity === 'CRITICAL', onClick: () => setFilters({ ...filters, severity: 'CRITICAL' }) },
          { label: 'High', value: getPathCount('HIGH').toString(), subtext: 'score >= 60', active: filters.severity === 'HIGH', onClick: () => setFilters({ ...filters, severity: 'HIGH' }) },
          { label: 'Medium', value: getPathCount('MEDIUM').toString(), subtext: 'score >= 40', active: filters.severity === 'MEDIUM', onClick: () => setFilters({ ...filters, severity: 'MEDIUM' }) },
          { label: 'Low', value: getPathCount('LOW').toString(), subtext: 'score < 40', active: filters.severity === 'LOW', onClick: () => setFilters({ ...filters, severity: 'LOW' }) }
        ]}
        actions={
          <div className="vapt-header-actions no-print">
            {scansList?.length > 0 && (
              <div className="vapt-scan-select-wrap">
                <LayersIcon size={13} />
                <select className="vapt-scan-select" value={resolvedScanId || ''} onChange={handleScanChange}>
                  <option value="">— Select Scan —</option>
                  {scansList.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} · {s.target} · {new Date(s.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="vapt-btn vapt-btn-ghost icon-only" onClick={loadData} title="Refresh Analysis">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        }
      />



      {/* ── Reusable Filter Bar ───────────────────────────────── */}
      <div className="apa-filter-bar no-print">
        <div className="apa-filter-item">
          <Filter size={13} />
          <span>Filters:</span>
        </div>

        <div className="apa-filter-item">
          <select value={filters.riskLevel} onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}>
            <option value="ALL">Risk Score: All</option>
            <option value="80+">Score &ge; 80</option>
            <option value="60+">Score &ge; 60</option>
            <option value="40+">Score &ge; 40</option>
          </select>
        </div>

        <div className="apa-filter-item">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">Status: All</option>
            <option value="Active">Active</option>
            <option value="Monitored">Monitored</option>
          </select>
        </div>

        <div className="apa-filter-item" style={{ marginLeft: 'auto' }}>
          <Search size={13} />
          <input
            type="text"
            placeholder="Quick search asset/CVE..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {/* ── Sub Navigation Tabs ──────────────────────────────── */}
      <div className="apa-subnav no-print">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`apa-subnav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Views ────────────────────────────────────────── */}
      {!resolvedScanId ? (
        <div className="apa-empty-state">
          <GitMerge size={48} style={{ color: 'var(--brand-primary)', opacity: 0.35 }} />
          <h3>No Scan Selected</h3>
          <p>Please select an Attack Surface Management scan from the dropdown above to run Attack Path Analysis.</p>
        </div>
      ) : loading ? (
        <div className="vapt-loading" style={{ marginTop: '2rem' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--brand-primary)' }} />
          <span>Correlating attack path chain vectors for Scan #{resolvedScanId}…</span>
        </div>
      ) : filteredAnalysisData ? (
        <div className="apa-tab-content">
          {activeTab === 'overview' && (
            <AttackPathOverview
              analysisData={filteredAnalysisData}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectPath={handleSelectPathForGraph}
            />
          )}

          {activeTab === 'graph' && (
            <AttackGraph
              analysisData={filteredAnalysisData}
              selectedPath={selectedPathForGraph}
              onClearSelectedPath={() => setSelectedPathForGraph(null)}
            />
          )}

          {activeTab === 'paths' && (
            <AttackPathsTable
              attackPaths={filteredAnalysisData.attackPaths}
              onHighlightPath={handleSelectPathForGraph}
              onExportPath={() => setActiveTab('reports')}
            />
          )}

          {activeTab === 'critical-assets' && (
            <CriticalAssetsView criticalAssets={filteredAnalysisData.criticalAssets} />
          )}

          {activeTab === 'mitre' && (
            <MitreMappingView mitreMapping={filteredAnalysisData.mitreMapping} />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsView recommendations={filteredAnalysisData.recommendations} />
          )}

          {activeTab === 'reports' && (
            <AttackPathReportsView
              analysisData={filteredAnalysisData}
              scanMeta={currentScanMeta}
              selectedDomain={selectedDomain}
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AttackPathAnalysis;
