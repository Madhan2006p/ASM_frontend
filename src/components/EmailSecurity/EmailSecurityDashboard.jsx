import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area
} from 'recharts';
import { Mail, Shield, CheckCircle, XCircle, AlertTriangle, ShieldCheck, ShieldOff, RefreshCw, Lock, Globe } from 'lucide-react';
import PageHeaderCard from '../common/PageHeaderCard';
import ScanSelector from '../common/ScanSelector';
import { api } from '../../utils/api';

const COLORS = { pass:'#22C55E', fail:'#EF4444', warning:'#F97316' };

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

const CT = ({ label, value, sub, good }) => {
  const color = good ? COLORS.pass : COLORS.fail;
  const icon = good ? <CheckCircle size={16}/> : <XCircle size={16}/>;
  return (
    <div style={{
      background:`${color}11`, border:`1px solid ${color}33`, borderRadius:10,
      padding:'0.85rem 1rem', display:'flex', flexDirection:'column', gap:4
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:'0.68rem',fontWeight:700,textTransform:'uppercase',
          letterSpacing:'0.06em',color:'var(--text-muted)'}}>{label}</span>
        <span style={{color,opacity:0.7}}>{icon}</span>
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:6}}>
        <div style={{fontSize:'1.7rem',fontWeight:900,color,lineHeight:1}}>{value}</div>
        <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{sub}</div>
      </div>
    </div>
  );
};

const dark = { background:'#1a1f2e', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'8px 12px', color:'#e2e8f0', fontSize:'0.78rem' };
const gridLine = { stroke:'rgba(255,255,255,0.05)' };

const EmailSecurityDashboard = ({ activeScanId, assignedDomains, selectedDomain, setSelectedDomain, scansList, handleSelectScan }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!activeScanId) { setData([]); return; }
      setLoading(true);
      try {
        const d = await api.get(`/api/attacksurface/email-security/?scan=${activeScanId}`).catch(()=>[]);
        setData(Array.isArray(d) ? d : (d?.results||[]));
      } finally { setLoading(false); }
    };
    load();
  }, [activeScanId]);

  const total = data.length || 1; // avoid /0
  let spf=0, dkim=0, dmarc=0, full=0;
  data.forEach(d => {
    if(d.has_spf) spf++;
    if(d.has_dkim) dkim++;
    if(d.has_dmarc) dmarc++;
    if(d.has_spf && d.has_dkim && d.has_dmarc) full++;
  });

  const authData = [
    { name:'SPF', Pass:spf, Fail:data.length-spf },
    { name:'DKIM', Pass:dkim, Fail:data.length-dkim },
    { name:'DMARC', Pass:dmarc, Fail:data.length-dmarc },
  ];

  let cAll=0, cPartial=0, cNone=0;
  data.forEach(d => {
    const c = (d.has_spf?1:0) + (d.has_dkim?1:0) + (d.has_dmarc?1:0);
    if(c===3) cAll++;
    else if(c>0) cPartial++;
    else cNone++;
  });
  const compData = [
    { name:'Fully Protected', value:cAll, fill:COLORS.pass },
    { name:'Partial', value:cPartial, fill:COLORS.warning },
    { name:'No Protection', value:cNone, fill:COLORS.fail },
  ];

  const radarData = [
    { subject: 'SPF', A: Math.round((spf/total)*100), fullMark: 100 },
    { subject: 'DKIM', A: Math.round((dkim/total)*100), fullMark: 100 },
    { subject: 'DMARC', A: Math.round((dmarc/total)*100), fullMark: 100 },
    { subject: 'MX', A: Math.round((data.filter(d=>d.mx_records?.length>0).length/total)*100), fullMark: 100 },
    { subject: 'Overall', A: Math.round((full/total)*100), fullMark: 100 },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem',paddingBottom:'2rem'}}>
      <PageHeaderCard
        badgeText="EMAIL SECURITY"
        title="Email Security Dashboard"
        subtitle="Domain impersonation protection and email authentication overview."
        stats={[
          { label:'Domains Checked', value: data.length.toString() },
          { label:'SPF Pass Rate',   value: `${Math.round((spf/total)*100)}%` },
          { label:'DKIM Pass Rate',  value: `${Math.round((dkim/total)*100)}%` },
          { label:'DMARC Pass Rate', value: `${Math.round((dmarc/total)*100)}%` },
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

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
        <CT label="SPF Protected"   value={spf}   sub={`/ ${data.length}`} good={spf>0 && spf===data.length} />
        <CT label="DKIM Protected"  value={dkim}  sub={`/ ${data.length}`} good={dkim>0 && dkim===data.length} />
        <CT label="DMARC Protected" value={dmarc} sub={`/ ${data.length}`} good={dmarc>0 && dmarc===data.length} />
        <CT label="Fully Protected" value={full}  sub={`/ ${data.length}`} good={full>0 && full===data.length} />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
        <W title={<><Mail size={12}/> Email Authentication Overview</>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={authData} margin={{top:10,right:10,bottom:0,left:-20}}>
              <CartesianGrid {...gridLine}/>
              <XAxis dataKey="name" tick={{fill:'#64748b',fontSize:11}}/>
              <YAxis tick={{fill:'#64748b',fontSize:11}}/>
              <Tooltip contentStyle={dark}/>
              <Legend wrapperStyle={{fontSize:'11px'}}/>
              <Bar dataKey="Pass" fill={COLORS.pass} radius={[4,4,0,0]}/>
              <Bar dataKey="Fail" fill={COLORS.fail} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </W>

        <W title={<><Shield size={12}/> Protocol Compliance</>}>
          <div style={{display:'flex',justifyContent:'center',marginTop:'1rem'}}>
            <PieChart width={160} height={160}>
              <Pie data={compData} cx={80} cy={80} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                {compData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip contentStyle={dark}/>
            </PieChart>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:'0.8rem',marginTop:8,fontSize:'0.75rem',color:'var(--text-secondary)'}}>
            {compData.map(c=>(
              <span key={c.name}><span style={{color:c.fill}}>●</span> {c.name}</span>
            ))}
          </div>
        </W>

        <W title={<><Globe size={12}/> Security Posture Radar</>}>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)"/>
              <PolarAngleAxis dataKey="subject" tick={{fill:'#64748b',fontSize:10}}/>
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false}/>
              <Radar name="Compliance %" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
              <Tooltip contentStyle={dark}/>
            </RadarChart>
          </ResponsiveContainer>
        </W>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2.5fr 1fr',gap:'1rem'}}>
        <W title={<><Lock size={12}/> Domain Email Security Table</>}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                  {['Domain','SPF','DKIM','DMARC','Risk Level'].map(h=>(
                    <th key={h} style={{padding:'0.5rem 0.75rem',textAlign:'left',color:'var(--text-muted)',fontWeight:700,fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d,i) => {
                  const c = (d.has_spf?1:0) + (d.has_dkim?1:0) + (d.has_dmarc?1:0);
                  const risk = c===3?'Low':c>0?'Medium':'High';
                  const rc = risk==='Low'?COLORS.pass:risk==='Medium'?COLORS.warning:COLORS.fail;
                  const Check = ({ok}) => ok ? <CheckCircle size={14} color={COLORS.pass}/> : <XCircle size={14} color={COLORS.fail}/>;
                  return (
                    <tr key={d.id||i} style={{borderBottom:'1px solid var(--border-color)',borderLeft:`3px solid ${rc}`}}>
                      <td style={{padding:'0.6rem 0.75rem',fontWeight:600,color:'var(--text-primary)'}}>{d.subdomain||'—'}</td>
                      <td style={{padding:'0.6rem 0.75rem'}}><div style={{display:'flex',gap:5,alignItems:'center'}}><Check ok={d.has_spf}/> {d.has_spf?'Pass':'Fail'}</div></td>
                      <td style={{padding:'0.6rem 0.75rem'}}><div style={{display:'flex',gap:5,alignItems:'center'}}><Check ok={d.has_dkim}/> {d.has_dkim?'Pass':'Fail'}</div></td>
                      <td style={{padding:'0.6rem 0.75rem'}}><div style={{display:'flex',gap:5,alignItems:'center'}}><Check ok={d.has_dmarc}/> {d.has_dmarc?'Pass':'Fail'}</div></td>
                      <td style={{padding:'0.6rem 0.75rem'}}>
                        <span style={{padding:'0.15rem 0.5rem',borderRadius:5,fontSize:'0.65rem',fontWeight:800,textTransform:'uppercase',background:`${rc}22`,color:rc}}>{risk}</span>
                      </td>
                    </tr>
                  );
                })}
                {data.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No email security data for this scan.</td></tr>}
              </tbody>
            </table>
          </div>
        </W>

        <W title={<><AlertTriangle size={12}/> Recommendations</>}>
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>
              <b>1. SPF (Sender Policy Framework)</b><br/>
              Prevents unauthorized IP addresses from sending emails on behalf of your domain.
              <div style={{background:'var(--bg-main)',padding:'0.5rem',borderRadius:4,marginTop:4,fontFamily:'monospace',fontSize:'0.65rem',color:'var(--text-muted)'}}>
                v=spf1 include:_spf.google.com ~all
              </div>
            </div>
            <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>
              <b>2. DMARC (Domain-based Message Auth)</b><br/>
              Tells receiving servers what to do with messages that fail SPF/DKIM checks.
              <div style={{background:'var(--bg-main)',padding:'0.5rem',borderRadius:4,marginTop:4,fontFamily:'monospace',fontSize:'0.65rem',color:'var(--text-muted)'}}>
                v=DMARC1; p=quarantine; rua=mailto:admin@domain.com
              </div>
            </div>
            <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>
              <b>3. DKIM (DomainKeys Identified Mail)</b><br/>
              Adds a digital signature to emails to verify they weren't altered in transit.
            </div>
          </div>
        </W>
      </div>
    </div>
  );
};

export default EmailSecurityDashboard;
