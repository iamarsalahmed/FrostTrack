'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useDispatch,useSelector } from 'react-redux';
import { snapshotReceived,resetMonitor } from '@/store/store';

const ICONS={snow:'❄',grid:'▦',orders:'▤',activity:'◴',logout:'↪',refresh:'↻',bell:'♧',check:'✓',alert:'!',thermo:'°',weight:'kg',wifi:'●'};
function Icon({name}){return <span className="ico" aria-hidden>{ICONS[name]||'•'}</span>}
const fmt=(date)=>date?new Date(date).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const num=(n)=>Number(n||0).toFixed(1);
async function api(path,method='GET',body){const res=await fetch(path,{method,headers:{...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const json=await res.json().catch(()=>({error:'Unexpected server response'}));if(!res.ok)throw Error(json.error||`Request failed (${res.status})`);return json;}

function Metric({name,value,sub,tone="neutral"}){return <div className={`metric metric-${tone}`}><div className="metric-header"><div className="metric-name">{name}</div><span className="metric-indicator"/></div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div></div>}
function Status({level,text}){return <span className={'pill '+level}><span className="status-dot"/>{text}</span>}
const orderTone=status=>status==='placed'?'pending':status==='received'?'ok':'cancelled';
const orderLabel=status=>status==='placed'?'Placed':status==='received'?'Received':'Cancelled';
function CompartmentCard({comp,onEdit,onApprove,busy,hasOrder}){
 const low=comp.weightKg<=comp.thresholdKg;
 const hot=comp.temperatureC!==null&&comp.temperatureC>4;
 const ratio=Math.min(100,Math.max(0,(comp.weightKg/comp.capacityKg)*100));
 const suggested=Math.max(0,comp.capacityKg-comp.weightKg);
 return <article className={`comp-card ${low?"comp-low":hot?"comp-hot":"comp-healthy"}`}>
  <div className="card-top"><div className="meat-icon">{({chicken:'C',beef:'B',mutton:'M',mince:'K'})[comp.code]}</div><div className="card-statuses">{low?<Status level="danger" text="Low stock"/>:null}{hot?<Status level="hot" text="High temp"/>:null}{!low&&!hot?<Status level="ok" text="Healthy"/>:null}</div></div>
  <h3>{comp.label}</h3><p className="muted">Compartment inventory</p>
  <div className="card-weight"><b>{num(comp.weightKg)}</b><span>kg remaining</span></div>
  <div className="meter" role="progressbar" aria-valuenow={comp.weightKg} aria-valuemax={comp.capacityKg} aria-valuemin={0} aria-label={`${comp.label} stock`}><div className={'meter-fill '+(low?'low':ratio<35?'medium':'')} style={{width:`${ratio}%`}}/></div>
  <div className="stock-line"><span>{Math.round(ratio)}% full</span><span>Max {num(comp.capacityKg)} kg</span></div>
  <div className="card-readings"><span>Temperature</span><strong className={hot?'text-danger':''}>{comp.temperatureC===null?'—':num(comp.temperatureC)+'°C'}</strong></div>
  <div className="card-readings"><span>Low-stock threshold</span><strong>{num(comp.thresholdKg)} kg</strong></div>
  {(low||hot)?<div className={`card-attention ${low?'stock':'temperature'}`}>{low?'Stock is below the refill threshold.':'Temperature is above 4°C.'}</div>:null}
  <div className="card-actions"><button className="btn outline small" onClick={()=>onEdit(comp)}>Simulate reading</button>{low?<button className="btn primary small" disabled={busy||hasOrder} onClick={()=>onApprove(comp)}>{hasOrder?'Order active':`Order ${num(suggested)} kg`}</button>:null}</div>
 </article>
}
function Modal({title,subtitle,children,onClose}){return <div className="overlay" role="presentation" onMouseDown={onClose}><section className="dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e=>e.stopPropagation()}><button className="dialog-close" aria-label="Close" onClick={onClose}>×</button><h2>{title}</h2>{subtitle?<p className="muted">{subtitle}</p>:null}{children}</section></div>}
function Simulator({comp,onClose,onSave,saving}){
 const [weight,setWeight]=useState(String(comp.weightKg));const [temperature,setTemperature]=useState(String(comp.temperatureC??2.5));
 const [err,setErr]=useState('');
 async function submit(e){e.preventDefault();const w=Number(weight),t=Number(temperature);if(!Number.isFinite(w)||w<0||w>100||!Number.isFinite(t)||t< -30||t>60){setErr('Weight: 0–100 kg; temperature: -30 to 60°C.');return;}try{await onSave({compartment:comp.code,weightKg:w,temperatureC:t});}catch(error){setErr(error.message)}}
 return <Modal title={`Simulate ${comp.label}`} subtitle="Sends a real API request and stores the reading in PostgreSQL. This is simulated input, not a physical sensor." onClose={onClose}><form onSubmit={submit} className="modal-form"><label>Remaining meat (kg)<input type="number" min="0" max="100" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} required/></label><label>Temperature (°C)<input type="number" min="-30" max="60" step="0.1" value={temperature} onChange={e=>setTemperature(e.target.value)} required/></label><div className="hint">Tip: Set stock below {num(comp.thresholdKg)} kg or temperature above 4°C to trigger an alert.</div>{err?<p className="error-text">{err}</p>:null}<div className="modal-buttons"><button type="button" className="btn outline" onClick={onClose}>Cancel</button><button className="btn primary" disabled={saving}>{saving?'Saving...':'Send sensor reading'}</button></div></form></Modal>
}
function CancelOrderModal({order,onClose,onConfirm,saving,error}){
 const [reason,setReason]=useState('');
 return <Modal title={`Cancel PO-${String(order.id).padStart(4,'0')}?`} subtitle="This will cancel the purchase order in PostgreSQL and preserve it in order history. The stock readings will not change." onClose={saving?undefined:onClose}>
   <div className="cancel-summary"><div><span>Compartment</span><strong>{order.label}</strong></div><div><span>Order quantity</span><strong>{num(order.quantity_kg)} kg</strong></div></div>
   <form className="modal-form" onSubmit={e=>{e.preventDefault();onConfirm(order.id,reason)}}>
     <label>Reason <span className="optional">(optional)</span><input maxLength={240} placeholder="e.g. Ordered from another supplier" value={reason} onChange={e=>setReason(e.target.value)} disabled={saving}/></label>
     <p className="cancel-note">Only orders with <strong>Placed</strong> status can be cancelled. Received orders stay locked.</p>
     {error?<p className="error-text" role="alert">{error}</p>:null}
     <div className="modal-buttons"><button type="button" className="btn outline" disabled={saving} onClick={onClose}>Keep order</button><button type="submit" className="btn destructive" disabled={saving}>{saving?'Cancelling…':'Yes, cancel order'}</button></div>
   </form>
 </Modal>
}
function AlertCard({alert}){
 const isTemp=alert.alert_type==='high_temp';
 return <div className={`alert-row ${isTemp?'alert-temp':'alert-stock'}`}>
  <div className="warn-icon" aria-hidden>{isTemp?'°':'!'}</div>
  <div className="alert-copy"><div className="alert-heading"><b>{isTemp?'Temperature warning':'Low stock warning'}</b><span className={`alert-kind ${isTemp?'kind-temp':'kind-stock'}`}>{isTemp?'TEMPERATURE':'INVENTORY'}</span></div><p>{alert.message}</p></div>
  <small>{fmt(alert.created_at)}</small>
 </div>;
}
function Login({onLogin,busy,error}){const [email,setEmail]=useState('');const [password,setPassword]=useState('');return <div className="login-wrap"><div className="login-card"><div className="brand-badge"><Icon name="snow"/></div><h1>FrostTrack</h1><p className="muted">Smart Refrigeration Management</p><div className="line"/><h2>Manager access</h2><p className="muted">Log in to access live refrigerator stock, alerts and orders.</p><form onSubmit={e=>{e.preventDefault();onLogin(email,password)}}><label className="input-label" htmlFor="email">Manager email</label><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="manager@example.com" required/><label className="input-label" htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required/>{error?<p className="error-text">{error}</p>:null}<button type="submit" disabled={busy} className="btn primary full">{busy?'Signing in...':'Sign in →'}</button></form><p className="login-footer">Arduino Mega 2560 · W5500 Ethernet · PostgreSQL</p></div></div>}

export default function Home(){
 const dispatch=useDispatch();const monitor=useSelector(s=>s.monitor);
 const [auth,setAuth]=useState('checking');const [authBusy,setAuthBusy]=useState(false);const [authError,setAuthError]=useState('');
 const [tab,setTab]=useState('overview'),[orderFilter,setOrderFilter]=useState('all'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[modal,setModal]=useState(null),[cancelModal,setCancelModal]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const ongoing=useRef(false);
 const refresh=useCallback(async(silent=false)=>{if(ongoing.current)return;ongoing.current=true;if(!silent)setLoading(true);try{const data=await api('/api/dashboard');dispatch(snapshotReceived(data));setError('')}catch(err){setError(err.message);if(err.message==='Authentication required')setAuth('login')}finally{ongoing.current=false;setLoading(false)}},[dispatch]);
 useEffect(()=>{api('/api/auth/me').then(x=>setAuth(x.authenticated?'ready':'login')).catch(()=>setAuth('login'))},[]);
 useEffect(()=>{if(auth!=='ready')return;refresh();const interval=setInterval(()=>refresh(true),5000);return()=>clearInterval(interval)},[auth,refresh]);
 async function login(email,password){setAuthBusy(true);setAuthError('');try{await api('/api/auth/login','POST',{email,password});setAuth('ready')}catch(e){setAuthError(e.message)}finally{setAuthBusy(false)}}
 async function logout(){try{await api('/api/auth/logout','POST')}catch{}dispatch(resetMonitor());setAuth('login');setTab('overview')}
 async function mutate(action,success){setBusy(true);setError('');setNotice('');try{await action();setNotice(success);setModal(null);await refresh()}catch(e){setError(e.message);throw e}finally{setBusy(false)}}
 async function saveReading(payload){await mutate(()=>api('/api/demo/update','POST',payload),'Simulated sensor reading saved to PostgreSQL.');}
 async function approve(comp){await mutate(()=>api('/api/orders','POST',{compartment:comp.code}),`Purchase order approved for ${comp.label}. Supplier delivery integration is not connected.`).catch(()=>{})}
 async function received(id){await mutate(()=>api(`/api/orders/${id}/received`,'POST',{}),'Order marked received. Update inventory via the simulator or physical sensor reading.').catch(()=>{})}
 async function cancelOrder(id,reason){await mutate(()=>api(`/api/orders/${id}/cancel`,'POST',{reason}),`PO-${String(id).padStart(4,'0')} cancelled. It remains in order history.`);setCancelModal(null);}
 if(auth==='checking')return <div className="loading-screen"><span className="brand-badge"><Icon name="snow"/></span><p>Loading FrostTrack...</p></div>;
 if(auth==='login')return <Login onLogin={login} busy={authBusy} error={authError}/>;
 const lowCount=monitor.compartments.filter(c=>c.weightKg<=c.thresholdKg).length;
 const hotCount=monitor.compartments.filter(c=>c.temperatureC>4).length;
 const sum=monitor.compartments.reduce((x,c)=>x+c.weightKg,0),capacity=monitor.compartments.reduce((x,c)=>x+c.capacityKg,0);
 const activeOrders=new Set(monitor.orders.filter(x=>x.status==='placed').map(x=>x.compartment_code));
 const displayedOrders=monitor.orders.filter(o=>orderFilter==='all'||o.status===orderFilter);
 const activeAlertCount=monitor.alerts.length;
 return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-badge"><Icon name="snow"/></div><div><strong>FrostTrack</strong><small>MANAGEMENT SYSTEM</small></div></div><p className="sidebar-heading">WORKSPACE</p><nav aria-label="Main navigation">{[['overview','grid','Overview'],['orders','orders','Purchase Orders'],['activity','activity','Sensor Activity']].map(([id,icon,label])=><button key={id} className={'nav-item '+(tab===id?'active':'')} onClick={()=>setTab(id)}><Icon name={icon}/>{label}{id==='orders'&&activeOrders.size?<span className="nav-count">{activeOrders.size}</span>:null}</button>)}</nav><div className="sidebar-bottom"><div className="device-tile"><span className="device-dot"/>Arduino Mega 2560 <small>Demo + API ingestion</small></div><button className="nav-item" onClick={logout}><Icon name="logout"/>Log out</button></div></aside>
  <main className="main-content"><header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> {({overview:'Overview',orders:'Purchase Orders',activity:'Sensor Activity'})[tab]}</div><div className="top-actions"><span className="live-dot"/> <span className="live-label">5 sec refresh</span><button className="btn outline small" onClick={()=>refresh()} disabled={loading}><Icon name="refresh"/>{loading?'Loading':'Refresh'}</button><div className="avatar">M</div></div></header><div className="content-area">
  <div className="page-intro"><div><div className="eyebrow">FROSTTRACK CONTROL CENTER</div><h1>{tab==='overview'?'Refrigerator overview':tab==='orders'?'Purchase orders':'Sensor activity'}</h1><p className="muted">{tab==='overview'?'Monitor stock, temperature and alerts across all four compartments.':tab==='orders'?'Review approved orders and update delivery status.':'Latest readings received from the simulator or Arduino gateway.'}</p></div>{tab==='overview'?<div className="date-chip"><Icon name="activity"/>Updated {fmt(monitor.serverTime)}</div>:null}</div>
  {error?<div className="alert-bar danger-alert" role="alert"><strong>Attention</strong><span>{error}</span><button onClick={()=>setError('')}>×</button></div>:null}
  {notice?<div className="alert-bar success-alert" role="status"><strong>Done</strong><span>{notice}</span><button onClick={()=>setNotice('')}>×</button></div>:null}
  {tab==='overview'?<>
   {activeAlertCount?<div className="alert-overview" role="status"><span className="alert-overview-icon">!</span><div><strong>{activeAlertCount} active {activeAlertCount===1?'alert':'alerts'} need attention</strong><p>{lowCount?`${lowCount} compartment${lowCount===1?'':'s'} below minimum stock. `:''}{hotCount?`${hotCount} temperature warning${hotCount===1?'':'s'}.`:''} Review the alerts below.</p></div><button className="btn outline small" onClick={()=>document.getElementById('active-alerts')?.scrollIntoView({behavior:'smooth',block:'center'})}>View alerts ↓</button></div>:<div className="all-clear"><span>✓</span><div><strong>All systems normal</strong><p>No active inventory or temperature alerts.</p></div></div>}
   <div className="metrics"><Metric name="Total stock" value={`${num(sum)} kg`} sub={`of ${num(capacity)} kg capacity`} tone="stock"/><Metric name="Compartments" value={monitor.compartments.length||'—'} sub="Monitored categories" tone="neutral"/><Metric name="Low stock" value={lowCount} sub="Require replenishment" tone={lowCount?"danger":"good"}/><Metric name="Temperature alerts" value={hotCount} sub="Above 4°C threshold" tone={hotCount?"warning":"good"}/></div>
   <div className="section-title"><div><h2>Compartment status</h2><p className="muted">Sensor readings and refill recommendations</p></div><span className="small-muted">Use “Simulate reading” for the classroom demo.</span></div>
   {!monitor.compartments.length?<div className="empty">{loading?'Loading inventory...':'No inventory found. Run sql/schema.sql in Neon SQL Editor to create compartments.'}</div>:<div className="comp-grid">{monitor.compartments.map(comp=><CompartmentCard key={comp.code} comp={comp} busy={busy} hasOrder={activeOrders.has(comp.code)} onEdit={setModal} onApprove={approve}/>)}</div>}
   <div className="lower-grid"><section className="panel alert-panel" id="active-alerts"><div className="panel-head"><h2>Active alerts</h2><span className={`count-chip ${monitor.alerts.length?"count-critical":""}`}>{monitor.alerts.length}</span></div>{monitor.alerts.length?monitor.alerts.slice(0,5).map(a=><AlertCard key={a.id} alert={a}/>):<div className="panel-empty"><span className="empty-icon">✓</span>No active alerts. Everything looks good.</div>}</section><section className="panel"><div className="panel-head"><h2>Recent orders</h2><button className="text-link" onClick={()=>setTab('orders')}>View all →</button></div>{monitor.orders.length?monitor.orders.slice(0,4).map(o=><div className="order-row" key={o.id}><div><b>PO-{String(o.id).padStart(4,'0')}</b><p>{o.label}</p></div><div className="order-right"><b>{num(o.quantity_kg)} kg</b><Status level={orderTone(o.status)} text={orderLabel(o.status)}/></div></div>):<div className="panel-empty">No purchase orders yet.</div>}</section></div>
  </>:tab==='orders'?<section className="panel table-panel orders-panel">
   <div className="panel-head orders-panel-head"><div><h2>Purchase order history</h2><p className="muted">Approve, receive or cancel orders. Cancelled orders are kept for audit history.</p></div><span className="count-chip">{monitor.orders.length} total</span></div>
   <div className="order-filter-row" role="group" aria-label="Filter orders by status">{[['all','All orders'],['placed','Placed'],['received','Received'],['cancelled','Cancelled']].map(([key,label])=><button key={key} className={`filter-chip ${orderFilter===key?'selected':''}`} onClick={()=>setOrderFilter(key)} aria-pressed={orderFilter===key}>{label}{key==='placed'&&activeOrders.size?<span>{activeOrders.size}</span>:null}</button>)}</div>
   <div className="table-scroll"><table><thead><tr><th>Order</th><th>Compartment</th><th>Quantity</th><th>Approved at</th><th>Status</th><th>Actions</th></tr></thead><tbody>{displayedOrders.map(o=><tr key={o.id}><td>PO-{String(o.id).padStart(4,'0')}</td><td><strong>{o.label}</strong>{o.status==='cancelled'&&o.cancellation_reason?<div className="cancel-detail">Reason: {o.cancellation_reason}</div>:null}</td><td>{num(o.quantity_kg)} kg</td><td>{fmt(o.approved_at)}</td><td><Status level={orderTone(o.status)} text={orderLabel(o.status)}/>{o.status==='cancelled'&&o.cancelled_at?<div className="cancel-detail">{fmt(o.cancelled_at)}</div>:null}</td><td>{o.status==='placed'?<div className="order-actions"><button className="btn outline small" disabled={busy} onClick={()=>received(o.id)}>Mark received</button><button className="btn subtle-danger small" disabled={busy} onClick={()=>{setError('');setCancelModal(o)}}>Cancel order</button></div>:<span className="action-completed">—</span>}</td></tr>)}{!displayedOrders.length?<tr><td colSpan="6" className="empty-table">{orderFilter==='all'?'No orders yet. Create one from a low-stock compartment on Overview.':`No ${orderFilter} orders found.`}</td></tr>:null}</tbody></table></div>
  </section>
  :<section className="panel table-panel"><div className="panel-head"><h2>Recent sensor readings</h2><span className="muted">Latest twelve readings stored in PostgreSQL</span></div><div className="table-scroll"><table><thead><tr><th>Compartment</th><th>Weight</th><th>Temperature</th><th>Source</th><th>Received at</th></tr></thead><tbody>{monitor.history.map((r,i)=><tr key={i}><td>{r.compartment_code}</td><td>{num(r.weight_kg)} kg</td><td>{num(r.temperature_c)}°C</td><td><Status level={r.source==='device'?'ok':'pending'} text={r.source}/></td><td>{fmt(r.received_at)}</td></tr>)}{!monitor.history.length?<tr><td colSpan="5">No readings yet. Try the simulator on Overview.</td></tr>:null}</tbody></table></div></section>}
   <footer>FrostTrack • Arduino Mega 2560 • Next.js + Redux • Neon PostgreSQL <span>Classroom prototype, not a food-safety-certified control system.</span></footer>
  </div></main>
  {modal?<Simulator key={modal.code} comp={modal} saving={busy} onSave={saveReading} onClose={()=>setModal(null)}/>:null}
  {cancelModal?<CancelOrderModal key={cancelModal.id} order={cancelModal} saving={busy} error={error} onClose={()=>setCancelModal(null)} onConfirm={(id,reason)=>cancelOrder(id,reason).catch(()=>{})}/>:null}
 </div>
}
