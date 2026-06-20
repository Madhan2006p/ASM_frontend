import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
  Smartphone, Shield, AlertTriangle, CheckCircle, TrendingUp, RefreshCw,
  Activity, Lock, Code, Cpu
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
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

const MobileVAPTDashboard = () => {
  const [db, setDb] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [d, h] = await Promise.all([
          api.get('/api/mobile-vapt/dashboard/').catch(()=>null),
          api.get('/api/mobile-vapt/history/?page_size=10').catch(()=>[])
        ]);
        setDb(d);
        setHistory(Array.isArray(h) ? h : (h?.results||[]));
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const total     = db?.total_scans || 0;
  const critHigh  = (db?.critical||0) + (db?.high||0);
  const medLow    = (db?.medium||0) + (db?.low||0);
  
  let avgScore = '—';
  if (history.length > 0) {
    const sum = history.reduce((acc, h) => acc + (parseInt(h.score) || 50), 0);
    avgScore = Math.round(sum / history.length).toString();
  }

  // Score distribution logic
  const scoreDist = { '0-40':0, '41-60':0, '61-80':0, '81-100':0 };
  let android = 0, ios = 0;
  history.forEach(h => {
    const s = parseInt(h.score)||50;
    if(s<=40) scoreDist['0-40']++;
    else if(s<=60) scoreDist['41-60']++;
    else if(s<=80) scoreDist['61-80']++;
    else scoreDist['81-100']++;

    if(h.source==='ios') ios++; else android++;
  });
  const scoreData = Object.entries(scoreDist).map(([k,v])=>({name:k, value:v, fill:k==='81-100'?'#22C55E':k==='61-80'?'#3B82F6':k==='41-60'?'#F97316':'#EF4444'}));
  
  const catData = Object.entries(db?.category_distribution||{}).map(([k,v])=>({category:k, count:v}));
  
  const sevData = [
    { name:'Critical', value:db?.critical||0, fill:COLORS.critical },
    { name:'High', value:db?.high||0, fill:COLORS.high },
    { name:'Medium', value:db?.medium||0, fill:COLORS.medium },
    { name:'Low', value:db?.low||0, fill:COLORS.low },
    { name:'Info', value:db?.info||0, fill:COLORS.info },
  ].filter(d=>d.value>0);

  const topVulns = db?.top_vulnerabilities || [];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem',paddingBottom:'2rem'}}>
      <PageHeaderCard
        badgeText="MOBILE SECURITY"
        title="Mobile VAPT Dashboard"
        subtitle="Enterprise mobile application security posture overview."
        stats={[
          { label:'Apps Scanned',   value: total.toString() },
          { label:'Critical/High',  value: critHigh.toString(), subtext:'severe issues' },
          { label:'Medium/Low',     value: medLow.toString(), subtext:'warnings' },
          { label:'Avg Score',      value: avgScore, subtext:'/ 100 overall' },
        ]}
        actions={
          <button onClick={()=>window.location.reload()} style={{background:'var(--bg-card-2)',border:'1px solid var(--border-color)',borderRadius:7,padding:'0.4rem 0.6rem',cursor:'pointer',color:'var(--text-muted)'}}>
            <RefreshCw size={14} className={loading?'spin':''}/>
          </button>
        }
      />

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'0.75rem'}}>
        <CT label="Critical" value={db?.critical||0} color={COLORS.critical}/>
        <CT label="High"     value={db?.high||0}     color={COLORS.high}/>
        <CT label="Medium"   value={db?.medium||0}   color={COLORS.medium}/>
        <CT label="Low"      value={db?.low||0}      color={COLORS.low}/>
        <CT label="Info"     value={db?.info||0}     color={COLORS.info}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
        <W title={<><Shield size={12}/> App Security Score Distribution</>}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreData} margin={{top:4,right:8,bottom:0,left:-20}}>
              <CartesianGrid {...gridLine}/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip contentStyle={dark}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {scoreData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </W>

        <W title={<><Activity size={12}/> Findings by Category</>}>
          {catData.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No category data</div> :
          <ResponsiveContainer width="100%" height={200}>
            <BarChart layout="vertical" data={catData.slice(0,6)} margin={{top:4,right:16,bottom:0,left:40}}>
              <CartesianGrid {...gridLine}/>
              <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis dataKey="category" type="category" tick={{fill:'#64748b',fontSize:10}} width={80}/>
              <Tooltip contentStyle={dark}/>
              <Bar dataKey="count" fill="#8B5CF6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>}
        </W>

        <W title={<><Smartphone size={12}/> Platform Distribution</>}>
          <div style={{display:'flex',justifyContent:'center',marginTop:'1rem'}}>
            <PieChart width={160} height={160}>
              <Pie data={[{name:'Android',value:android},{name:'iOS',value:ios}]} cx={80} cy={80} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                <Cell fill="#22C55E"/><Cell fill="#3B82F6"/>
              </Pie>
              <Tooltip contentStyle={dark}/>
            </PieChart>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:'1rem',marginTop:8}}>
            <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}><span style={{color:'#22C55E'}}>●</span> 🤖 Android: {android}</div>
            <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}><span style={{color:'#3B82F6'}}>●</span> 🍏 iOS: {ios}</div>
          </div>
        </W>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:'1rem'}}>
        <W title={<><AlertTriangle size={12}/> Severity Distribution</>}>
          {sevData.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No findings</div> :
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sevData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {sevData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip contentStyle={dark}/>
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'11px'}}/>
            </PieChart>
          </ResponsiveContainer>}
        </W>

        <W title={<><Code size={12}/> Top Vulnerabilities</>}>
          {topVulns.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No top vulnerabilities</div> :
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {topVulns.slice(0,5).map((v,i) => {
              const sevColor = COLORS[(v.severity||'').toLowerCase()] || COLORS.info;
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg-card-2)',padding:'0.6rem 0.8rem',borderRadius:8,borderLeft:`3px solid ${sevColor}`}}>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    <span style={{fontSize:'0.76rem',fontWeight:700,color:'var(--text-primary)'}}>{v.vulnerability||'Unknown Issue'}</span>
                    <span style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{v.category||'General'}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'0.8rem'}}>
                    <span style={{background:`${sevColor}1a`,color:sevColor,padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.6rem',fontWeight:800,textTransform:'uppercase'}}>{v.severity}</span>
                    <span style={{fontSize:'0.85rem',fontWeight:800,color:'var(--text-primary)',minWidth:20,textAlign:'right'}}>{v.count}</span>
                  </div>
                </div>
              );
            })}
          </div>}
        </W>

        <W title={<><Activity size={12}/> Overall Risk Overview</>}>
           <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',paddingBottom:'2rem'}}>
             <div style={{width:130,height:130,borderRadius:'50%',border:`8px solid ${critHigh>0?'#EF4444':medLow>0?'#F97316':'#22C55E'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 0 20px rgba(0,0,0,0.2)'}}>
               <span style={{fontSize:'2rem',fontWeight:900,color:critHigh>0?'#EF4444':medLow>0?'#F97316':'#22C55E',lineHeight:1}}>{avgScore}</span>
               <span style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:4,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase'}}>Avg Score</span>
             </div>
             <div style={{marginTop:'1.2rem',fontSize:'0.75rem',color:'var(--text-secondary)',textAlign:'center'}}>
               Based on <b>{history.length}</b> recent scans
             </div>
           </div>
        </W>
      </div>

      <W title={<><TrendingUp size={12}/> Recent App Scans</>}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                {['App Name','Platform','Version','Status','Score','Date'].map(h=>(
                  <th key={h} style={{padding:'0.5rem 0.75rem',textAlign:'left',color:'var(--text-muted)',fontWeight:700,fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((s,i) => {
                const sc = parseInt(s.score)||50;
                const scCol = sc>=80?'#22C55E':sc>=50?'#F97316':'#EF4444';
                return (
                  <tr key={s.id||i} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'0.6rem 0.75rem',fontWeight:600,color:'var(--text-primary)'}}>
                      <div style={{display:'flex',flexDirection:'column'}}>
                        <span>{s.app_name||s.file_name||'Unknown'}</span>
                        <span style={{fontSize:'0.65rem',color:'var(--text-muted)',fontFamily:'monospace'}}>{s.package_name||'—'}</span>
                      </div>
                    </td>
                    <td style={{padding:'0.6rem 0.75rem'}}>{s.source==='ios'?'🍏 iOS':'🤖 Android'}</td>
                    <td style={{padding:'0.6rem 0.75rem',color:'var(--text-secondary)'}}>{s.version_name||'—'}</td>
                    <td style={{padding:'0.6rem 0.75rem'}}>
                      <span style={{padding:'0.15rem 0.5rem',borderRadius:5,fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',
                        background:s.status==='completed'?'rgba(34,197,94,0.12)':s.status.includes('fail')?'rgba(239,68,68,0.12)':'rgba(59,130,246,0.12)',
                        color:s.status==='completed'?'#22C55E':s.status.includes('fail')?'#EF4444':'#3B82F6'}}>
                        {s.status||'—'}
                      </span>
                    </td>
                    <td style={{padding:'0.6rem 0.75rem'}}>
                      {s.status==='completed' ? <span style={{color:scCol,fontWeight:800}}>{sc}/100</span> : <span style={{color:'var(--text-muted)'}}>—</span>}
                    </td>
                    <td style={{padding:'0.6rem 0.75rem',color:'var(--text-muted)',fontSize:'0.76rem'}}>{s.updated_at?new Date(s.updated_at).toLocaleString():'—'}</td>
                  </tr>
                );
              })}
              {history.length===0 && <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No apps scanned yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </W>
    </div>
  );
};

export default MobileVAPTDashboard;
