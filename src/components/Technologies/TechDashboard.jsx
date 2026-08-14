import React, { useMemo } from 'react';
import PageHeaderCard from '../common/PageHeaderCard';
import './Technologies.css';

/* ═════════════════════════════════════════════════════════
   TechDashboard
═════════════════════════════════════════════════════════ */

const TechDashboard = ({ technologies = [], loading = false, techFilter = 'ALL', setTechFilter }) => {
  /* ── Compute stats per subdomain list ── */
  const inventory = useMemo(() => {
    const list = technologies || [];
    const totalCount = list.length;
    const activeCount = list.filter(item => {
      const s = (item.status || 'active').toLowerCase();
      return s === 'live' || s === 'active' || s === 'up';
    }).length;
    const inactiveCount = list.filter(item => {
      const s = (item.status || '').toLowerCase();
      return s === 'inactive' || s === 'down';
    }).length;
    const otherCount = list.filter(item => {
      const s = (item.status || '').toLowerCase();
      return s !== 'live' && s !== 'active' && s !== 'up' && s !== 'inactive' && s !== 'down';
    }).length;

    return {
      totalCount,
      activeCount,
      inactiveCount,
      otherCount
    };
  }, [technologies]);

  const { totalCount, activeCount, inactiveCount, otherCount } = inventory;

  const statCards = [
    { 
      label: 'TOTAL ASSETS', 
      value: totalCount.toString(), 
      subtext: techFilter === 'ALL' ? 'Showing all assets' : 'Click to view all', 
      color: '#3B82F6',
      active: techFilter === 'ALL',
      onClick: () => setTechFilter && setTechFilter('ALL')
    },
    { 
      label: 'ACTIVE SUBDOMAINS', 
      value: activeCount.toString(), 
      subtext: techFilter === 'ACTIVE' ? 'Filter: Active only' : 'Live / up assets', 
      color: '#10B981',
      active: techFilter === 'ACTIVE',
      onClick: () => setTechFilter && setTechFilter(techFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')
    },
    { 
      label: 'INACTIVE SUBDOMAINS', 
      value: inactiveCount.toString(), 
      subtext: techFilter === 'INACTIVE' ? 'Filter: Inactive only' : 'Down / unreachable', 
      color: '#EF4444',
      active: techFilter === 'INACTIVE',
      onClick: () => setTechFilter && setTechFilter(techFilter === 'INACTIVE' ? 'ALL' : 'INACTIVE')
    },
    { 
      label: 'OTHER', 
      value: otherCount.toString(), 
      subtext: techFilter === 'OTHER' ? 'Filter: Other status' : 'Other / unknown status', 
      color: '#8B5CF6',
      active: techFilter === 'OTHER',
      onClick: () => setTechFilter && setTechFilter(techFilter === 'OTHER' ? 'ALL' : 'OTHER')
    },
  ];

  return (
    <div className="tech-dash">
      <PageHeaderCard
        title="Technologies"
        stats={statCards.map(s => ({
          label: s.label,
          value: s.value,
          subtext: s.subtext,
          active: s.active,
          onClick: s.onClick,
          style: { borderLeft: `3px solid ${s.color}` },
        }))}
      />
    </div>
  );
};

export default TechDashboard;
