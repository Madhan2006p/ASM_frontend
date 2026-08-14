import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import { parseTechEntry, getEolInfo } from '../../utils/techUtils';
import './Technologies.css';

/* ═════════════════════════════════════════════════════════
   TechDashboard
═════════════════════════════════════════════════════════ */

const TechDashboard = ({ technologies = [], loading = false, onExport }) => {
  /* ── Aggregate per-subdomain tech rows into a stack inventory ── */
  const inventory = useMemo(() => {
    const map = {};

    (technologies || []).forEach(row => {
      (row.technologies || []).forEach(raw => {
        const { name, version, category } = parseTechEntry(raw);
        if (!name) return;
        const key = `${name.toLowerCase()}||${version.toLowerCase()}`;
        if (!map[key]) {
          const eol = getEolInfo(name, version);
          map[key] = {
            name,
            version,
            category,
            outdated: eol.outdated,
            eolNote: eol.note,
            assets: 0,
          };
        }
        map[key].assets += 1;
      });
    });

    const list = Object.values(map).sort((a, b) => b.assets - a.assets);
    return {
      list,
      totalInstances: list.reduce((s, t) => s + t.assets, 0),
      outdatedCount: list.filter(t => t.outdated).length,
      withVersionCount: list.filter(t => t.version).length,
    };
  }, [technologies]);

  const { list: techList, totalInstances, outdatedCount, withVersionCount } = inventory;

  const statCards = [
    { label: 'TOTAL DETECTIONS', value: totalInstances.toString(), subtext: 'tech instances found', color: '#3B82F6' },
    { label: 'UNIQUE STACK', value: techList.length.toString(), subtext: 'distinct technologies', color: '#8B5CF6' },
    { label: 'VERSIONS DETECTED', value: withVersionCount.toString(), subtext: 'fingerprinted w/ version', color: '#06B6D4' },
    { label: 'OUTDATED / EOL', value: outdatedCount.toString(), subtext: outdatedCount > 0 ? 'needs attention' : 'all supported', color: outdatedCount > 0 ? '#EF4444' : '#10B981' },
  ];

  return (
    <div className="tech-dash">
      <PageHeaderCard
        title="Technologies"
        stats={statCards.map(s => ({
          label: s.label,
          value: s.value,
          subtext: s.subtext,
          style: { borderLeft: `3px solid ${s.color}` },
        }))}
        actions={
          <button className="tech-btn-primary" onClick={onExport} disabled={loading || techList.length === 0}>
            <Download size={15} /> Export CSV
          </button>
        }
      />

    </div>
  );
};

export default TechDashboard;
