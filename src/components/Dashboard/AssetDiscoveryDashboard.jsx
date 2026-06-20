import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  Server, Shield, AlertTriangle, Globe, Lock, TrendingUp,
  RefreshCw, Activity, CheckCircle, XCircle, Cpu, Eye
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const COLORS = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#22C55E', info:'#3B82F6' };

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

const CT = ({ label, value, sub, color, icon }) => (
  <div style={{
    background:`${color}11`, border:`1px solid ${color}33`, borderRadius:10,
    padding:'0.85rem 1rem', display:'flex', flexDirection:'column', gap:4
  }}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',
        letterSpacing:'0.06em',color:'var(--text-muted)'}}>{label}</span>
      <span style={{color,opacity:0.7}}>{icon}</span>
    </div>
    <div style={{fontSize:'1.7rem',fontWeight:900,color,lineHeight:1}}>{value}</div>
    {sub && <div style={{fontSize:'0.68rem',color:'var(--text-muted)'}}>{sub}</div>}
  </div>
);

const dark = { background:'#1a1f2e', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'8px 12px', color:'#e2e8f0', fontSize:'0.78rem' };
const gridLine = { stroke:'rgba(255,255,255,0.05)' };

const AssetDiscoveryDashboard = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [exec, setExec]     = useState(null);
  const [techs, setTechs]   = useState([]);
  const [ssl,   setSsl]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const q = selectedDomain ? `?domain=${selectedDomain}` : '';
        const [ed, tc, sc] = await Promise.all([
          api.get(`/api/attacksurface/executive-dashboard/${q}`).catch(()=>null),
          activeScanId ? api.get(`/api/attacksurface/technologies/?scan=${activeScanId}`).catch(()=>[]) : Promise.resolve([]),
          activeScanId ? api.get(`/api/attacksurface/ssl-certificates/?scan=${activeScanId}`).catch(()=>[]) : Promise.resolve([]),
        ]);
        setExec(ed);
        setTechs(Array.isArray(tc) ? tc : (tc?.results||[]));
        setSsl(Array.isArray(sc) ? sc : (sc?.results||[]));
      } finally { setLoading(false); }
    };
    load();
  }, [activeScanId, selectedDomain]);

  const vs     = exec?.vuln_severity || {};
  const total  = exec?.total_assets  || 0;
  const subs   = exec?.subdomains_count || 0;
  const eps    = exec?.endpoints_count  || 0;
  const ports  = exec?.ports_count      || 0;
  const tvulns = exec?.total_vulns      || 0;
  const mgd    = exec?.managed_count    || 0;
  const unmgd  = exec?.unmanaged_count  || 0;
  const sslExpiring = exec?.ssl_expiring_soon || 0;

  const vulnBarData = [
    { name:'Critical', value: vs.critical||0, fill: COLORS.critical },
    { name:'High',     value: vs.high||0,     fill: COLORS.high     },
    { name:'Medium',   value: vs.medium||0,   fill: COLORS.medium   },
    { name:'Low',      value: vs.low||0,       fill: COLORS.low      },
  ];

  const services = (exec?.exposed_services||[]).slice(0,8);

  const techMap = {};
  techs.forEach(t => { if(t.technology) techMap[t.technology]=(techMap[t.technology]||0)+1; });
  const techData = Object.entries(techMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([name,value])=>({ name, value }));
  const PIE_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#F97316','#22C55E','#EAB308'];

  const domains = exec?.domain_distribution||[];
  const trends  = exec?.trends||[];

  const sslValid   = ssl.filter(s=>!s.is_expired).length;
  const sslExpired = ssl.filter(s=>s.is_expired).length;
  const sslData = [
    { name:'Valid', value:sslValid, fill:'#22C55E' },
    { name:'Expiring',value:sslExpiring, fill:'#F97316' },
    { name:'Expired', value:sslExpired, fill:'#EF4444' },
  ];

  const scans = exec?.recent_scans_detail || scansList.slice(0,8);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem',paddingBottom:'2rem'}}>
      <PageHeaderCard
        badgeText="ASSET DISCOVERY"
        title="Asset Discovery Dashboard"
        subtitle="Internet-facing asset inventory, vulnerability exposure, and risk posture overview."
        stats={[
          { label:'Total Assets',   value: total.toString(),      subtext:'subdomains + endpoints + ports' },
          { label:'Critical Vulns', value:(vs.critical||0).toString(), subtext:'immediate action required' },
          { label:'High Vulns',     value:(vs.high||0).toString(),     subtext:'address within 7 days' },
          { label:'SSL Expiring',   value:sslExpiring.toString(),      subtext:'within 90 days' },
        ]}
        actions={
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            <ScanSelector scansList={scansList} activeScanId={activeScanId} handleSelectScan={handleSelectScan}
              assignedDomains={assignedDomains} selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain}/>
            <button onClick={()=>window.location.reload()} style={{background:'var(--bg-card-2)',border:'1px solid var(--border-color)',borderRadius:7,padding:'0.4rem 0.6rem',cursor:'pointer',color:'var(--text-muted)'}}>
              <RefreshCw size={14} className={loading?'spin':''}/>
            </button>
          </div>
        }
      />

      {/* KPI Strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'0.75rem'}}>
        <CT label="Subdomains"  value={subs}   color="#3B82F6" icon={<Globe size={16}/>}    sub="discovered"/>
        <CT label="Endpoints"   value={eps}    color="#8B5CF6" icon={<Server size={16}/>}   sub="mapped"/>
        <CT label="Open Ports"  value={ports}  color="#F97316" icon={<Activity size={16}/>} sub="exposed"/>
        <CT label="Total Vulns" value={tvulns} color="#EF4444" icon={<Shield size={16}/>}   sub="all severity"/>
        <CT label="Managed"     value={mgd}    color="#22C55E" icon={<CheckCircle size={16}/>} sub={`of ${subs} assets`}/>
      </div>

      {/* Row 1: asset panels + risk distribution */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
        <W title={<><Eye size={12}/> Internet Facing Assets</>}>
          <div style={{fontSize:'2.4rem',fontWeight:900,color:'#3B82F6',lineHeight:1,marginBottom:'0.75rem'}}>{total}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:'0.75rem'}}>
            {[['Critical',vs.critical||0,COLORS.critical],['High',vs.high||0,COLORS.high],['Medium',vs.medium||0,COLORS.medium],['Low',vs.low||0,COLORS.low]].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                  <span style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{l}</span>
                </span>
                <span style={{fontWeight:800,fontSize:'0.85rem',color:c}}>{v}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={55}>
            <AreaChart data={trends.length>0?trends:[{date:'',assets:total,vulns:tvulns}]} margin={{top:0,right:0,bottom:0,left:0}}>
              <defs><linearGradient id="adag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient></defs>
              <Area type="monotone" dataKey="assets" stroke="#3B82F6" fill="url(#adag)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:4}}>showing last {trends.length||1} scan(s)</div>
        </W>

        <W title={<><AlertTriangle size={12}/> High Risk Assets</>}>
          <div style={{fontSize:'2.4rem',fontWeight:900,color:'#EF4444',lineHeight:1,marginBottom:'0.75rem'}}>{(vs.critical||0)+(vs.high||0)}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:'0.75rem'}}>
            {[['Critical Severity',vs.critical||0,COLORS.critical],['High Severity',vs.high||0,COLORS.high]].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>
                  <span style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{l}</span>
                </span>
                <span style={{fontWeight:800,fontSize:'0.85rem',color:c}}>{v}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={55}>
            <AreaChart data={trends.length>0?trends:[{date:'',assets:total,vulns:tvulns}]} margin={{top:0,right:0,bottom:0,left:0}}>
              <defs><linearGradient id="hrg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient></defs>
              <Area type="monotone" dataKey="vulns" stroke="#EF4444" fill="url(#hrg)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:4}}>showing last {trends.length||1} scan(s)</div>
        </W>

        <W title={<><Server size={12}/> Asset Management</>}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:'0.75rem'}}>
            <PieChart width={140} height={140}>
              <Pie data={[{name:'Managed',value:mgd},{name:'Unmanaged',value:unmgd||1}]}
                cx={70} cy={70} innerRadius={42} outerRadius={60} paddingAngle={3} dataKey="value">
                <Cell fill="#22C55E"/><Cell fill="#EF4444"/>
              </Pie>
            </PieChart>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[['Managed',mgd,'#22C55E'],['Unmanaged',unmgd,'#EF4444']].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'0.4rem 0.6rem',background:`${c}11`,borderRadius:6}}>
                <span style={{fontSize:'0.78rem',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:c,display:'inline-block'}}/>{l}
                </span>
                <span style={{fontWeight:800,color:c}}>{v}</span>
              </div>
            ))}
          </div>
        </W>
      </div>

      {/* Row 2: vuln distribution + services + technologies */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
        <W title={<><Shield size={12}/> Vulnerability Risk Distribution</>}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={vulnBarData} margin={{top:4,right:8,bottom:0,left:-20}}>
              <CartesianGrid {...gridLine}/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip contentStyle={dark}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {vulnBarData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </W>

        <W title={<><Activity size={12}/> Exposed Services (Top 8)</>}>
          {services.length===0
            ? <div style={{color:'var(--text-muted)',fontSize:'0.8rem',textAlign:'center',padding:'2rem 0'}}>No port data for this scan</div>
            : <ResponsiveContainer width="100%" height={200}>
              <BarChart layout="vertical" data={services} margin={{top:4,right:16,bottom:0,left:40}}>
                <CartesianGrid {...gridLine}/>
                <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
                <YAxis dataKey="service" type="category" tick={{fill:'#64748b',fontSize:11}} width={50}/>
                <Tooltip contentStyle={dark}/>
                <Bar dataKey="count" fill="#3B82F6" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>}
        </W>

        <W title={<><Cpu size={12}/> Top Technologies</>}>
          {techData.length===0
            ? <div style={{color:'var(--text-muted)',fontSize:'0.8rem',textAlign:'center',padding:'2rem 0'}}>No technology data for this scan</div>
            : <>
              <div style={{display:'flex',justifyContent:'center'}}>
                <PieChart width={140} height={140}>
                  <Pie data={techData} cx={70} cy={70} innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                    {techData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={dark}/>
                </PieChart>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:4}}>
                {techData.map((t,i)=>(
                  <div key={t.name} style={{display:'flex',justifyContent:'space-between',fontSize:'0.76rem'}}>
                    <span style={{display:'flex',alignItems:'center',gap:5,color:'var(--text-secondary)'}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:PIE_COLORS[i%PIE_COLORS.length],display:'inline-block'}}/>
                      {t.name}
                    </span>
                    <span style={{fontWeight:700,color:'var(--text-primary)'}}>{t.value}</span>
                  </div>
                ))}
              </div>
            </>}
        </W>
      </div>

      {/* Row 3: SSL + Domain Distribution */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:'1rem'}}>
        <W title={<><Lock size={12}/> SSL Certificate Status</>}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sslData} margin={{top:4,right:8,bottom:0,left:-20}}>
              <CartesianGrid {...gridLine}/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip contentStyle={dark}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {sslData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </W>

        <W title={<><Globe size={12}/> Domain Distribution (Subdomains per Domain)</>}>
          {domains.length===0
            ? <div style={{color:'var(--text-muted)',fontSize:'0.8rem',textAlign:'center',padding:'2rem 0'}}>No domain data available</div>
            : <ResponsiveContainer width="100%" height={180}>
              <BarChart data={domains.slice(0,10)} margin={{top:4,right:8,bottom:0,left:-20}}>
                <CartesianGrid {...gridLine}/>
                <XAxis dataKey="domain" tick={{fill:'#64748b',fontSize:10}} angle={-15} textAnchor="end" height={36}/>
                <YAxis tick={{fill:'#64748b',fontSize:11}}/>
                <Tooltip contentStyle={dark}/>
                <Bar dataKey="count" fill="#8B5CF6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>}
        </W>
      </div>

      {/* Scan History Table */}
      <W title={<><TrendingUp size={12}/> Recent Scan History</>}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                {['Domain/Target','Status','Subdomains','Vulnerabilities','Scan Date'].map(h=>(
                  <th key={h} style={{padding:'0.5rem 0.75rem',textAlign:'left',color:'var(--text-muted)',fontWeight:700,fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(scansList.slice(0,8)||[]).map((s,i)=>(
                <tr key={s.id||i} style={{borderBottom:'1px solid var(--border-color)'}}>
                  <td style={{padding:'0.6rem 0.75rem',fontWeight:600,color:'var(--text-primary)'}}>{s.target||'—'}</td>
                  <td style={{padding:'0.6rem 0.75rem'}}>
                    <span style={{padding:'0.15rem 0.5rem',borderRadius:5,fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',
                      background:s.status==='completed'?'rgba(34,197,94,0.12)':'rgba(59,130,246,0.12)',
                      color:s.status==='completed'?'#22C55E':'#3B82F6'}}>
                      {s.status||'—'}
                    </span>
                  </td>
                  <td style={{padding:'0.6rem 0.75rem',color:'var(--text-secondary)'}}>{s.subdomains_count||'—'}</td>
                  <td style={{padding:'0.6rem 0.75rem',color:'var(--text-secondary)'}}>{s.vulnerabilities_count||'—'}</td>
                  <td style={{padding:'0.6rem 0.75rem',color:'var(--text-muted)',fontSize:'0.76rem'}}>{s.created_at?new Date(s.created_at).toLocaleString():'—'}</td>
                </tr>
              ))}
              {scansList.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No scans found. Run a scan to populate this table.</td></tr>}
            </tbody>
          </table>
        </div>
      </W>
    </div>
  );
};

export default AssetDiscoveryDashboard;
