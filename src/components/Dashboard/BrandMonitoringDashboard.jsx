import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  Shield, AlertTriangle, Globe, Eye, Users, TrendingUp, RefreshCw,
  ExternalLink, Crosshair, FileWarning, Activity, Search
} from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import { api } from '../../utils/api';

const COLORS = { malicious:'#EF4444', suspicious:'#F97316', phishing:'#DC2626', impersonation:'#EAB308', harmless:'#22C55E' };

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

const BrandMonitoringDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const [phishing, setPhishing] = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [impersonations, setImpersonations] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, p, su, im] = await Promise.all([
          api.get('/api/brand-monitoring/targets/stats/').catch(()=>null),
          api.get('/api/brand-monitoring/phishing-domains/?page_size=10').catch(()=>[]),
          api.get('/api/brand-monitoring/suspicious-domains/?page_size=10').catch(()=>[]),
          api.get('/api/brand-monitoring/impersonation-results/?page_size=10').catch(()=>[])
        ]);
        setStats(s);
        setPhishing(Array.isArray(p) ? p : (p?.results||[]));
        setSuspicious(Array.isArray(su) ? su : (su?.results||[]));
        setImpersonations(Array.isArray(im) ? im : (im?.results||[]));
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const totalTargets = stats?.total_targets || 0;
  const mal = stats?.total_malicious || 0;
  const sus = stats?.total_suspicious || 0;
  const phish = stats?.total_phishing_domains || 0;
  const imp = stats?.total_impersonations || 0;

  const rawRiskScore = (mal * 15) + (phish * 10) + (imp * 5) + (sus * 2);
  const riskScore = Math.min(100, rawRiskScore);
  const healthScore = Math.max(0, 100 - riskScore);
  const hColor = healthScore >= 80 ? COLORS.harmless : healthScore >= 50 ? COLORS.suspicious : COLORS.malicious;

  const distData = [
    { name:'Malicious', value:mal, fill:COLORS.malicious },
    { name:'Suspicious', value:sus, fill:COLORS.suspicious },
    { name:'Phishing', value:phish, fill:COLORS.phishing },
    { name:'Impersonations', value:imp, fill:COLORS.impersonation },
  ].filter(d=>d.value>0);

  const reports = stats?.recent_reports || [];
  const vtData = reports.slice(0,5).map(r => ({
    date: r.scan_date ? new Date(r.scan_date).toLocaleDateString() : 'N/A',
    Malicious: r.malicious || 0,
    Suspicious: r.suspicious || 0,
    Harmless: r.harmless || 0
  }));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem',paddingBottom:'2rem'}}>
      <PageHeaderCard
        badgeText="BRAND MONITORING"
        title="Brand Monitoring Overview"
        subtitle="Track domain impersonation, typosquatting, and external brand threats."
        stats={[
          { label:'Monitored Targets', value: totalTargets.toString() },
          { label:'Phishing Detected', value: phish.toString() },
          { label:'Impersonations Found', value: imp.toString() },
          { label:'Malicious Reports', value: mal.toString() },
        ]}
        actions={
          <button onClick={()=>window.location.reload()} style={{background:'var(--bg-card-2)',border:'1px solid var(--border-color)',borderRadius:7,padding:'0.4rem 0.6rem',cursor:'pointer',color:'var(--text-muted)'}}>
            <RefreshCw size={14} className={loading?'spin':''}/>
          </button>
        }
      />

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
        <CT label="Malicious"      value={mal}   color={COLORS.malicious}/>
        <CT label="Suspicious"     value={sus}   color={COLORS.suspicious}/>
        <CT label="Phishing Domains" value={phish} color={COLORS.phishing}/>
        <CT label="Impersonations" value={imp}   color={COLORS.impersonation}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
        <W title={<><Activity size={12}/> Brand Health Score</>}>
           <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',paddingBottom:'2rem'}}>
             <div style={{width:140,height:140,borderRadius:'50%',border:`8px solid ${hColor}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 0 20px rgba(0,0,0,0.2)'}}>
               <span style={{fontSize:'2.5rem',fontWeight:900,color:hColor,lineHeight:1}}>{healthScore}</span>
               <span style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:4,fontWeight:700,letterSpacing:'0.05em',textTransform:'uppercase'}}>/ 100</span>
             </div>
           </div>
        </W>

        <W title={<><PieChart size={12}/> Threat Distribution</>}>
          {distData.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No threats detected</div> :
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {distData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip contentStyle={dark}/>
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'11px'}}/>
            </PieChart>
          </ResponsiveContainer>}
        </W>

        <W title={<><Search size={12}/> VirusTotal Detection Ratio</>}>
          {vtData.length===0 ? <div style={{color:'var(--text-muted)',textAlign:'center',padding:'2rem'}}>No VirusTotal reports</div> :
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vtData} margin={{top:10,right:10,bottom:0,left:-20}}>
              <CartesianGrid {...gridLine}/>
              <XAxis dataKey="date" tick={{fill:'#64748b',fontSize:10}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip contentStyle={dark}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              <Bar dataKey="Malicious" stackId="a" fill={COLORS.malicious}/>
              <Bar dataKey="Suspicious" stackId="a" fill={COLORS.suspicious}/>
              <Bar dataKey="Harmless" stackId="a" fill={COLORS.harmless}/>
            </BarChart>
          </ResponsiveContainer>}
        </W>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
        <W title={<><AlertTriangle size={12}/> Suspicious Domains</>}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                  <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Domain</th>
                  <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Risk</th>
                  <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Method</th>
                </tr>
              </thead>
              <tbody>
                {suspicious.slice(0,5).map((s,i) => (
                  <tr key={i} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'0.6rem 0.5rem',fontWeight:600}}>{s.domain_name}</td>
                    <td style={{padding:'0.6rem 0.5rem'}}>
                      <span style={{padding:'0.15rem 0.4rem',borderRadius:4,fontSize:'0.65rem',fontWeight:800,background:`${COLORS.suspicious}22`,color:COLORS.suspicious}}>{s.risk_score}</span>
                    </td>
                    <td style={{padding:'0.6rem 0.5rem',color:'var(--text-secondary)'}}>{s.detection_method}</td>
                  </tr>
                ))}
                {suspicious.length===0 && <tr><td colSpan={3} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No suspicious domains</td></tr>}
              </tbody>
            </table>
          </div>
        </W>

        <W title={<><FileWarning size={12}/> Phishing Domains</>}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                  <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Domain</th>
                  <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Status</th>
                  <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>IP</th>
                </tr>
              </thead>
              <tbody>
                {phishing.slice(0,5).map((p,i) => (
                  <tr key={i} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'0.6rem 0.5rem',fontWeight:600,color:COLORS.phishing}}>{p.domain}</td>
                    <td style={{padding:'0.6rem 0.5rem'}}>
                      {p.is_active ? <span style={{color:COLORS.malicious,fontWeight:800,fontSize:'0.65rem'}}>ACTIVE</span> : <span style={{color:'var(--text-muted)',fontSize:'0.65rem'}}>INACTIVE</span>}
                    </td>
                    <td style={{padding:'0.6rem 0.5rem',color:'var(--text-secondary)'}}>{p.ip_address||'—'}</td>
                  </tr>
                ))}
                {phishing.length===0 && <tr><td colSpan={3} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No phishing domains</td></tr>}
              </tbody>
            </table>
          </div>
        </W>
      </div>
      
      <W title={<><Users size={12}/> Impersonating Accounts</>}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Platform</th>
                <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Account Name</th>
                <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Confidence</th>
                <th style={{padding:'0.5rem',textAlign:'left',color:'var(--text-muted)'}}>Link</th>
              </tr>
            </thead>
            <tbody>
              {impersonations.slice(0,8).map((imp,i) => {
                const conf = imp.confidence_score || 0;
                const cColor = conf > 80 ? COLORS.malicious : conf > 50 ? COLORS.suspicious : COLORS.impersonation;
                return (
                  <tr key={i} style={{borderBottom:'1px solid var(--border-color)'}}>
                    <td style={{padding:'0.6rem 0.5rem',fontWeight:600}}>{imp.platform}</td>
                    <td style={{padding:'0.6rem 0.5rem'}}>{imp.account_name}</td>
                    <td style={{padding:'0.6rem 0.5rem',width:'200px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:6,background:'var(--bg-main)',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',background:cColor,width:`${conf}%`}}/>
                        </div>
                        <span style={{fontSize:'0.65rem',fontWeight:800,color:cColor}}>{conf}%</span>
                      </div>
                    </td>
                    <td style={{padding:'0.6rem 0.5rem'}}>
                      {imp.account_url && <a href={imp.account_url} target="_blank" rel="noreferrer" style={{color:'var(--brand-primary)'}}><ExternalLink size={14}/></a>}
                    </td>
                  </tr>
                );
              })}
              {impersonations.length===0 && <tr><td colSpan={4} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No impersonating accounts</td></tr>}
            </tbody>
          </table>
        </div>
      </W>

    </div>
  );
};

export default BrandMonitoringDashboard;
