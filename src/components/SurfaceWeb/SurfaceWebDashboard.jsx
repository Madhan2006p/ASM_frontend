import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  Globe, Search, AlertTriangle, Shield, TrendingUp, RefreshCw,
  Eye, Activity, Database, List
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';

const COLORS = { high:'#EF4444', medium:'#F97316', low:'#EAB308', info:'#3B82F6' };

const W = ({ title, children, style={} }) => (
  <div style={{
    background:'var(--bg-card)', border:'1px solid var(--border-color)',
    borderRadius:12, padding:'1.1rem', ...style
  }}>
    {title && <div style={{fontSize:'0.68rem',fontWeight:800,textTransform:'uppercase',
      letterSpacing:'0.08em',color:'var(--text-muted)',marginBottom:'0.9rem',
      display:'flex',alignItems:'center',gap:'0.35rem'}}>{title}</div>}
    {children}
  </div>
);

const CT = ({ label, value, color }) => (
  <div style={{
    background:`${color}11`, border:`1px solid ${color}33`, borderRadius:10,
    padding:'0.85rem 1rem', display:'flex', flexDirection:'column', gap:4
  }}>
    <span style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',
      letterSpacing:'0.06em',color:'var(--text-muted)'}}>{label}</span>
    <div style={{fontSize:'1.7rem',fontWeight:900,color,lineHeight:1}}>{value}</div>
  </div>
);

const dark = { background:'#1a1f2e', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'8px 12px', color:'#e2e8f0', fontSize:'0.78rem' };
const gridLine = { stroke:'rgba(255,255,255,0.05)' };

const SurfaceWebDashboard = () => {
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

  const totalScans = stats?.total_scans || 0;
  const totalResults = stats?.total_results || 0;
  
  const risk = stats?.by_risk || {};
  const riskData = [
    { name:'High', value: risk.HIGH||0, fill:COLORS.high },
    { name:'Medium', value: risk.MEDIUM||0, fill:COLORS.medium },
    { name:'Low', value: risk.LOW||0, fill:COLORS.low },
    { name:'Info', value: risk.INFO||0, fill:COLORS.info },
  ].filter(d=>d.value>0);

  const types = stats?.by_type || {};
  const topTypes = Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([k,v])=>({ type:k, count:v }));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem',paddingBottom:'2rem'}}>
      <PageHeaderCard
        badgeText="SURFACE WEB"
        title="OSINT & Surface Web Intelligence"
        subtitle="Open-source intelligence gathering and continuous surface web monitoring."
        stats={[
          { label:'Total Scans',   value: totalScans.toString() },
          { label:'Total Results', value: totalResults.toString() },
          { label:'High Risk',     value: (risk.HIGH||0).toString(), subtext:'findings' },
          { label:'Unique Modules',value: Object.keys(types).length.toString() },
        ]}
        actions={
          <button onClick={()=>window.location.reload()} style={{background:'var(--bg-card-2)',border:'1px solid var(--border-color)',borderRadius:7,padding:'0.4rem 0.6rem',cursor:'pointer',color:'var(--text-muted)'}}>
            <RefreshCw size={14} className={loading?'spin':''}/>
          </button>
        }
      />

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
        <CT label="New Findings" value={totalResults} color={COLORS.info}/>
        <CT label="Active Scans" value={totalScans}   color="#8B5CF6"/>
        <CT label="High Risk"    value={risk.HIGH||0} color={COLORS.high}/>
        <CT label="Data Types"   value={Object.keys(types).length} color={COLORS.low}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'1rem'}}>
        <W title={<><PieChart size={12}/> Results by Risk Level</>}>
          {riskData.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No risk data</div> :
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                {riskData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip contentStyle={dark}/>
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'11px'}}/>
            </PieChart>
          </ResponsiveContainer>}
        </W>

        <W title={<><Activity size={12}/> Top Intelligence Data Types</>}>
          {topTypes.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No data types</div> :
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={topTypes} margin={{top:4,right:16,bottom:0,left:60}}>
              <CartesianGrid {...gridLine}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis dataKey="type" type="category" tick={{fill:'#64748b',fontSize:10}} width={120}/>
              <Tooltip contentStyle={dark}/>
              <Bar dataKey="count" fill="#3B82F6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>}
        </W>
      </div>

      <W title={<><List size={12}/> Recent OSINT Findings</>}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                {['Data Type','Finding Detail','Module','Risk','Date'].map(h=>(
                  <th key={h} style={{padding:'0.5rem 0.75rem',textAlign:'left',color:'var(--text-muted)',fontWeight:700,fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.slice(0,10).map((r,i) => {
                const rs = (r.risk_score||'INFO').toUpperCase();
                const rc = rs==='HIGH'?COLORS.high:rs==='MEDIUM'?COLORS.medium:rs==='LOW'?COLORS.low:COLORS.info;
                const truncData = (r.data||'').length > 80 ? (r.data||'').substring(0,80)+'...' : (r.data||'');
                return (
                  <tr key={r.id||i} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'0.6rem 0.75rem',fontWeight:600,color:'var(--text-primary)',whiteSpace:'nowrap'}}>{r.data_type||'—'}</td>
                    <td style={{padding:'0.6rem 0.75rem',color:'var(--text-secondary)',maxWidth:400}} title={r.data}>{truncData}</td>
                    <td style={{padding:'0.6rem 0.75rem',color:'var(--text-muted)'}}>{r.source_module||'—'}</td>
                    <td style={{padding:'0.6rem 0.75rem'}}>
                      <span style={{padding:'0.15rem 0.5rem',borderRadius:5,fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',background:`${rc}22`,color:rc}}>{rs}</span>
                    </td>
                    <td style={{padding:'0.6rem 0.75rem',color:'var(--text-muted)',fontSize:'0.76rem'}}>{r.created_at?new Date(r.created_at).toLocaleString():'—'}</td>
                  </tr>
                );
              })}
              {results.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No findings. Run a scan first.</td></tr>}
            </tbody>
          </table>
        </div>
      </W>
    </div>
  );
};

export default SurfaceWebDashboard;
