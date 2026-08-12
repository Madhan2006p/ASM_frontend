import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line
} from 'recharts';
import {
  Globe, Search, AlertTriangle, Shield, TrendingUp, RefreshCw,
  Eye, Activity, Database, List
} from 'lucide-react';
import { api } from '../../utils/api';

const COLORS = { 
  high: '#EF4444', 
  medium: '#F97316', 
  low: '#EAB308', 
  info: '#3B82F6',
  gray: '#475569',
  dark: '#1E293B',
  purple: '#8B5CF6'
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const TopBlock = ({ title, value, color }) => (
  <div style={{
    backgroundColor: color,
    color: '#ffffff',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '100px',
    boxShadow: 'var(--shadow-sm)',
    borderRadius: 'var(--radius-md)'
  }}>
    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: '0.5rem' }}>
      {title}
    </div>
    <div style={{ fontSize: '2.5rem', fontWeight: 300, lineHeight: 1 }}>
      {value}
    </div>
  </div>
);

const Widget = ({ title, children, style = {}, colSpan = 1 }) => (
  <div style={{
    background: 'var(--bg-card)', 
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gridColumn: `span ${colSpan}`,
    ...style
  }}>
    <div style={{
      fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '1rem',
      display: 'flex', alignItems: 'center', gap: '0.4rem'
    }}>
      <div style={{ width: 3, height: 10, background: 'var(--border-color)' }}></div>
      {title}
    </div>
    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      {children}
    </div>
  </div>
);

const darkTheme = { background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '8px', color: '#e2e8f0', fontSize: '0.75rem' };
const gridLine = { stroke: 'rgba(255,255,255,0.05)' };

import TargetDomainTabs from '../common/TargetDomainTabs';

const SurfaceWebDashboard = ({ assignedDomains, selectedDomain, setSelectedDomain }) => {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([
          api.get('/api/surface-monitoring/stats/').catch(()=>null),
          api.get('/api/surface-monitoring/results/?page_size=50').catch(()=>[])
        ]);
        setStats(s);
        setResults(Array.isArray(r) ? r : (r?.results||[]));
      } finally { setLoading(false); }
    };
    load();
  }, []);

const totalResults = stats?.total_results || 0;
  
  // Use module_counts for pie chart
  const modules = stats?.module_counts || {};
  const moduleData = Object.entries(modules).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));

  // Use type_counts for top categories
  const types = stats?.type_counts || {};
  const topTypes = Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([name, value]) => ({ name, value }));

  // Process results to get trend data over days
  const trendMap = {};
  results.forEach(r => {
    // try to get date from created_at
    const dateStr = r.created_at ? r.created_at.split('T')[0] : 'Unknown';
    if (!trendMap[dateStr]) trendMap[dateStr] = { name: dateStr.slice(5), count: 0 };
    trendMap[dateStr].count += 1;
  });
  
  let trendData = Object.values(trendMap).sort((a, b) => a.name.localeCompare(b.name));
  if (trendData.length === 0) trendData = [{ name: 'No Data', count: 0 }];
  const ratioData = trendData;

  // Group findings by source module based on results array
  const sourceMap = {};
  results.forEach(r => {
    const s = r.module || r.source_module || 'Unknown';
    sourceMap[s] = (sourceMap[s] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v], i) => ({ name: k, value: v, fill: PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div className="global-page-container page-animate" style={{ padding: '1rem', background: 'var(--bg-main)', minHeight: '100vh' }}>
      
      {/* Top Controls (Similar to image) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '1rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>
          <Globe size={18} color="var(--brand-primary)" />
          Surface Web Monitoring Dashboard
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* ROW 1: Top Solid Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <TopBlock title="TOTAL DISCOVERED RECORDS" value={totalResults} color="#CA8A04" />
          <TopBlock title="UNIQUE OSINT MODULES" value={Object.keys(modules).length} color={COLORS.info} />
          <TopBlock title="UNIQUE DATA CATEGORIES" value={Object.keys(types).length} color="#8B5CF6" />
        </div>

        <TargetDomainTabs
          assignedDomains={assignedDomains}
          selectedDomain={selectedDomain}
          setSelectedDomain={setSelectedDomain}
        />

        {/* ROW 2: Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', minHeight: '300px' }}>
          
          <Widget title="MODULE DISTRIBUTION">
            {moduleData.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No data</div> :
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={moduleData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                        {moduleData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                      </Pie>
                      <Tooltip contentStyle={darkTheme} cursor={{fill: 'transparent'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                  {moduleData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: 10, height: 10, background: d.fill }}></div>
                      <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            }
          </Widget>

          <Widget title="TOP OSINT CATEGORIES">
            {topTypes.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No data</div> :
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topTypes} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid {...gridLine} vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false} />
                  <YAxis type="number" tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={darkTheme} cursor={{fill: 'rgba(255,255,255,0.05)'}}/>
                  <Bar dataKey="value" fill="#10B981" barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            }
          </Widget>

          <Widget title="DISTRIBUTION BY SOURCE MODULE">
            {sourceData.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No data</div> :
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {sourceData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                  </Pie>
                  <Tooltip contentStyle={darkTheme} cursor={{fill: 'transparent'}}/>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'10px', color: 'var(--text-secondary)'}}/>
                </PieChart>
              </ResponsiveContainer>
            }
          </Widget>
          
          <Widget title="DISCOVERY TREND">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid {...gridLine} vertical={false}/>
                <XAxis dataKey="name" tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={darkTheme}/>
                <Line type="monotone" dataKey="count" stroke={COLORS.info} strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}}/>
              </LineChart>
            </ResponsiveContainer>
          </Widget>

        </div>

        {/* ROW 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', minHeight: '280px' }}>
          
          <Widget title="FINDINGS OVER TIME">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid {...gridLine} vertical={false}/>
                <XAxis dataKey="name" tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={darkTheme} cursor={{fill: 'rgba(255,255,255,0.05)'}}/>
                <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize:'10px', color: 'var(--text-secondary)'}}/>
                <Bar dataKey="count" fill={COLORS.info} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </Widget>

          <Widget title="DATA TYPE PRIORITIZATION">
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                  <div style={{ fontSize: '3rem', color: COLORS.high, fontWeight: 300, lineHeight: 0.9 }}>
                    {topTypes.length > 0 ? topTypes[0].value : 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingBottom: '0.3rem' }}>
                    Instances of <strong>{topTypes.length > 0 ? topTypes[0].name : 'Unknown'}</strong>
                  </div>
                </div>
                <div style={{ flex: 1, borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                       <YAxis tick={{fill:'#64748b', fontSize:9}} axisLine={false} tickLine={false}/>
                       <Area type="monotone" dataKey="count" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </Widget>

          

        </div>

        {/* ROW 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <TopBlock title="!! CRITICAL OSINT EXPOSURES" value={0} color={COLORS.high} />
            <Widget title="DATA TYPE SUMMARY" style={{ flex: 1 }}>
              <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ paddingBottom: '0.5rem' }}>TYPE</th>
                    <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>COUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {topTypes.map(t => (
                    <tr key={t.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0', color: 'var(--text-primary)' }}>{t.name}</td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'right', fontWeight: 600, color: 'var(--brand-primary)' }}>{t.value}</td>
                    </tr>
                  ))}
                  {topTypes.length === 0 && <tr><td colSpan={2} style={{ padding: '1rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>No data</td></tr>}
                </tbody>
              </table>
            </Widget>
          </div>

          <Widget title="RECENT OSINT DISCOVERIES">
             <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Severity', 'Data Type', 'Detail', 'Source', 'Discovered'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 8).map((r, i) => {
                    const rs = (r.risk_score || 'INFO').toUpperCase();
                    const rc = rs === 'HIGH' ? COLORS.high : rs === 'MEDIUM' ? COLORS.medium : rs === 'LOW' ? COLORS.low : COLORS.info;
                    const truncData = (r.data || '').length > 60 ? (r.data || '').substring(0, 60) + '...' : (r.data || '');
                    return (
                      <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <span style={{ background: `${rc}22`, color: rc, padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>{rs}</span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.data_type || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }} title={r.data}>{truncData}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.source_module || '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                  {results.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No recent findings.</td></tr>}
                </tbody>
              </table>
            </div>
          </Widget>

        </div>

      </div>
    </div>
  );
};

export default SurfaceWebDashboard;
