import {themeOptions} from './plan-themes.js'
import React, { useEffect, useRef, useState } from 'react'
import { outOfOrder, splitPeople, expenseTotal, itineraryPeople } from './activity-helpers.js'
import { calendarDates, planDateRange } from './plan-dates.js'
import { SignIn, AccountSettings, PasswordReset } from './account-forms.jsx'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'
import './overrides.css'
import './interaction.css'
import './social.css'
import './settlement.css'
import './refinement.css'
import './latest.css'
import './final-tuning.css'
import './calendar-fix.css'
import './panel-fix.css'
import './clean-sections.css'
import './header-lines.css'
import './header-spacing.css'
import './payment-button-height.css'
import './payment-row-height.css'
import './payment-flat.css'
import './subtle-shadows.css'
import './mobile-white.css'
import './top-gradient.css'
import './mobile-layout-fix.css'
import './activity-time-mobile-fix.css'
import './v1-polish.css'
import './animations.css'
import './payment-flow.css'
import './mobile-refresh.css'
import './preview-simplification.css'
import './themes.css'
import './accounts.css'
import './fluid-motion.css'
import './preview-flow.css'
import './apple-preview.css'
import './creator-refresh.css'
import {ActivityWindow} from './activity-window.jsx'
import {LiquidChoices} from './liquid-choices.jsx'
import {PaymentSheet} from './payment-sheet.jsx'
import {RsvpSheet} from './rsvp-sheet.jsx'
const API = import.meta.env.VITE_API_URL || '/api'
const supabaseUrl=import.meta.env.VITE_SUPABASE_URL,publicKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const auth=supabaseUrl&&publicKey?createClient(supabaseUrl,publicKey):null
const blankSlot = { time:'', next_day:false, title:'', location_text:'', links:[''], notes:'', attendance_required:false, splitting_payments:false }
const quarterHourTimes=Array.from({length:96},(_,index)=>`${String(Math.floor(index/4)).padStart(2,'0')}:${String(index%4*15).padStart(2,'0')}`)
function ActivityTime({value,onChange}){
  return <select className="activity-time-select" value={value||''} onChange={e=>onChange(e.target.value)}>
    <option value="">Any time</option>
    {value&&!quarterHourTimes.includes(value)&&<option value={value}>{fmt(value)} (current)</option>}
    {quarterHourTimes.map(time=><option key={time} value={time}>{fmt(time)}</option>)}
  </select>
}
if (typeof window !== 'undefined') new MutationObserver(() => {document.querySelectorAll('input[type="url"]').forEach((input) => { if (input.placeholder.includes('link')) input.placeholder = 'https://' });document.querySelectorAll('.payment-form input[placeholder="What was paid for? (optional)"]').forEach(input=>{input.placeholder='For?'})}).observe(document.documentElement, { childList: true, subtree: true })
async function api(path, options={}, token) { const{data:{session}}=auth?await auth.auth.getSession():{data:{session:null}},r=await fetch(`${API}${path}`,{headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.access_token}`}:{}),...(token?{'x-edit-token':token}:{}),...options.headers},...options}),data=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong.');return data }
const fmt=t=>{if(!t)return 'Any time';const[h,m]=t.split(':').map(Number);return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(2000,0,1,h,m))}; const initials=name=>{const words=name.trim().split(/\s+/).filter(Boolean);return words.length<2?(words[0]?.[0]||'').toUpperCase():`${words[0][0]}${words[words.length-1][0]}`.toUpperCase()}; const uniqueNames=names=>{const seen=new Set();return names.map(name=>String(name).trim()).filter(name=>{const key=name.toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true})}; const ordered=d=>[...d.timeslots].sort((a,b)=>a.order-b.order); const Logo=()=> <a className="logo" href="/"><b>●</b> planr</a>;
function range(start,end){if(!start)return[];let a=new Date(`${start}T12:00:00`),b=new Date(`${end||start}T12:00:00`),out=[];if(b<a)return[];for(;a<=b;a.setDate(a.getDate()+1))out.push(new Date(a).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}));return out}
function useCurrentUser(){const[user,setUser]=useState(null),[ready,setReady]=useState(!auth);useEffect(()=>{if(!auth)return;auth.auth.getUser().then(({data})=>{setUser(data.user||null);setReady(true)});const{data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{setUser(session?.user||null);setReady(true)});return()=>subscription.unsubscribe()},[]);return{user,ready}}
function AccountNav(){const{user,ready}=useCurrentUser();if(!auth||!ready)return null;return <a className="account-nav" href="/plans">{user?'My plans':'Sign in'}</a>}
function App(){const p=location.pathname.split('/').filter(Boolean);return p[0]==='reset-password'?<PasswordReset auth={auth}/>:p[0]==='trip'?<View id={p[1]}/>:p[0]==='edit'?<Edit id={p[1]} token={p[2]}/>:p[0]==='plans'?<Plans/>:<Home/>}
function Home(){const {user,ready}=useCurrentUser();const[title,setTitle]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[error,setError]=useState('');const create=async e=>{e.preventDefault();try{const{trip,editToken}=await api('/trips',{method:'POST',body:JSON.stringify({title,dates:range(start,end),day_dates:calendarDates(start,end)})});location.href=`/edit/${trip.id}/${editToken}`}catch(e){setError(e.message)}};if(!ready)return <Loading/>;if(!user)return <main className="home landing"><nav className="home-nav"><Logo/></nav><section className="landing-intro"><h1>welcome to planr</h1><a className="primary landing-cta" href="/plans?mode=signup">Create an account</a><a className="landing-signin" href="/plans">Already have an account? Sign in</a><small>Invited to a plan? Open your shared link—no account needed to join in.</small></section></main>;return <main className="home"><nav className="home-nav"><Logo/><AccountNav/></nav><section className="create"><h2>Start a new trip</h2><form onSubmit={create}><label>What are you planning?<input required autoFocus placeholder="e.g. Saturday with Sarah" value={title} onChange={e=>setTitle(e.target.value)}/></label><CalendarRange start={start} end={end} setStart={setStart} setEnd={setEnd}/>{start&&<p className="range-note">{range(start,end).length} day{range(start,end).length===1?'':'s'} selected</p>}{error&&<p className="error">{error}</p>}<button className="primary">Create trip →</button></form></section></main>}
function Plans(){
  const {user,ready}=useCurrentUser(),[error,setError]=useState(''),[trips,setTrips]=useState([]),[loading,setLoading]=useState(false),[settingsOpen,setSettingsOpen]=useState(false)
  useEffect(()=>{if(!user)return;setLoading(true);api('/me/trips').then(({trips})=>setTrips(trips)).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[user?.id])
  const signOut=async()=>{await auth?.auth.signOut();location.href='/'}
  if(!ready)return <Loading/>
  if(!user)return <main className="account-page"><nav><Logo/></nav><SignIn auth={auth} api={api}/></main>
  const firstName=String(user.user_metadata?.first_name||'').trim().toLowerCase()
  return <main className="account-page"><nav><Logo/><button className="sign-out" onClick={signOut}>Sign out</button></nav><header><p className="eyebrow">YOUR PLANS</p><h1 className="personal-plan-title">{firstName?`${firstName}'s plans`:'my plans'}</h1><div className="account-identity"><span>{user.email}</span><button className="account-gear" type="button" aria-label="Account settings" aria-expanded={settingsOpen} aria-controls="account-settings" onClick={()=>setSettingsOpen(!settingsOpen)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 3 .6-1h4.8l.6 1 .5 2 1.5.9 2-.6 1.2.1 2.4 4.2-.5 1.1-1.5 1.4v1.8l1.5 1.4.5 1.1-2.4 4.2-1.2.1-2-.6-1.5.9-.5 2-.6 1H9l-.6-1-.5-2-1.5-.9-2 .6-1.2-.1-2.4-4.2.5-1.1 1.5-1.4v-1.8L1.3 9.8.8 8.7l2.4-4.2 1.2-.1 2 .6 1.5-.9z" transform="translate(1 0) scale(.92)"/><circle cx="12" cy="12" r="3"/></svg></button></div></header>
    {settingsOpen&&<AccountSettings key={user.id} auth={auth} api={api} user={user}/>}
    <a className="new-plan-link" href="/">+ Create a new plan</a>
    {error&&<p className="error" role="alert">{error}</p>}
    {loading?<p>Loading your plans…</p>:trips.length?<PlanList trips={trips} onDeleted={id=>setTrips(current=>current.filter(trip=>trip.id!==id))}/>:<section className="empty-plans"><b>No saved plans yet.</b><p>Create your next plan while signed in and it will appear here.</p></section>}
  </main>
}
function CalendarRange({start,end,setStart,setEnd}){const[month,setMonth]=useState(()=>new Date());const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,pretty=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Select date',choose=value=>{if(!start||end||value<start){setStart(value);setEnd('')}else setEnd(value)};const days=Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1));return <section className="range-picker"><p className="date-title">Choose your dates <small>{start&&!end?'Now select your end date':''}</small></p><div className="chosen-dates"><span>Start <b>{pretty(start)}</b></span><i>→</i><span>End <b>{pretty(end)}</b></span></div><div className="calendar"><div className="cal-head"><button type="button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><b>{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</b><button type="button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div><div className="cal-grid">{['S','M','T','W','T','F','S'].map((d,i)=><i key={i}>{d}</i>)}{Array.from({length:days[0].getDay()}).map((_,i)=><span key={`x${i}`}/>)}{days.map(d=>{const v=iso(d),inRange=start&&end&&v>=start&&v<=end;return <button type="button" key={v} className={`${v===start||v===end?'picked':''} ${inRange?'in-range':''}`} onClick={()=>choose(v)}>{d.getDate()}</button>})}</div></div></section>}
function Tabs({days,active,onChange}){return <LiquidChoices label="Choose a day" value={active} onChange={onChange} items={[...days].sort((a,b)=>a.order-b.order).map(d=>({value:d.id,label:d.label}))}/>}
function View({id}){
  const[trip,setTrip]=useState(),[active,setActive]=useState(),[error,setError]=useState(''),[visitor,setVisitor]=useState(()=>localStorage.getItem('planr-visitor-name')||''),[changingName,setChangingName]=useState(()=>!localStorage.getItem('planr-visitor-name'))
  useEffect(()=>api(`/trips/${id}`).then(({trip})=>{setTrip(trip);setActive(trip.days[0]?.id)}).catch(e=>setError(e.message)),[id])
  const setName=value=>{setVisitor(value);localStorage.setItem('planr-visitor-name',value)}
  if(error)return <Missing message={error}/>
  if(!trip)return <Loading/>
  const day=trip.days.find(d=>d.id===active)||trip.days[0],people=itineraryPeople(trip.days)
  return <main className={`viewer apple-preview theme-${trip.theme||'blue'}`}>
    <nav><Logo/><button className="visitor-greeting" type="button" onClick={()=>setChangingName(!changingName)}>{visitor?`Hi ${visitor} · change`:'Add your name'}</button></nav>
    <header><h1>{trip.title}</h1><p className="plan-subtitle">{planDateRange(trip.days)}{people.length?` · ${people.length} ${people.length===1?'person':'people'}`:''}</p>
      {(!visitor||changingName)&&<form className="visitor-editor" onSubmit={e=>{e.preventDefault();setChangingName(false)}}><label>Your name<input aria-label="Your name" placeholder="So friends know it’s you" value={visitor} onChange={e=>setName(e.target.value)}/></label><button type="submit">Done</button></form>}
    </header>
    <DayPaymentSummary key={day.id} day={day} visitor={visitor}/>
    {trip.days.length>1&&<Tabs days={trip.days} active={day.id} onChange={setActive}/>}
    <section key={day.id} className="agenda day-surface" aria-label={day.label}>{ordered(day).map(slot=><PublicSlot key={slot.id} slot={slot} allDays={trip.days} theme={trip.theme} trip={id} day={day.id} visitor={visitor} refresh={setTrip}/>)}{!day.timeslots.length&&<div className="empty">Nothing planned yet.</div>}</section>
    <footer>Made with <b>● planr</b></footer>
  </main>
}
function PublicSlot({slot,trip,day,visitor,refresh,allDays,theme}){
  const[body,setBody]=useState(''),[rsvp,setRsvp]=useState(false),[payments,setPayments]=useState(false),[comments,setComments]=useState(false),[message,setMessage]=useState(''),[sending,setSending]=useState(false)
  const send=async(path,payload,method='POST')=>{try{const r=await api(path,{method,body:JSON.stringify(payload)});refresh(r.trip);setMessage('Saved');setTimeout(()=>setMessage(''),1400);return true}catch(e){setMessage(e.message);return false}}
  const links=slot.links||(slot.link?[slot.link]:[]),responses=slot.attendance||[],goingResponses=responses.filter(x=>x.status==='going'),response=responses.find(x=>x.name.toLowerCase()===visitor.trim().toLowerCase())
  const marker={going:'✓','not-going':'×',maybe:'–'}[response?.status],markerClass=response?.status||''
  const total=expenseTotal(slot),totalLabel=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:total%1?2:0,maximumFractionDigits:2}).format(total)
  return <article className="public-slot"><div className="public-card"><time>{fmt(slot.time)}</time>
    <h2>{slot.title}</h2>
    {slot.location_text&&<p className="location">⌖ {slot.location_text}</p>}
    {slot.notes&&<p>{slot.notes}</p>}
    {links.map((link,i)=><a key={i} className="link" href={link} target="_blank" rel="noreferrer">↗ Link {links.length>1?i+1:''}</a>)}
    <div className="activity-actions compact-actions">
      {slot.attendance_required&&<button type="button" className={`action-button rsvp-action ${response?`status-${response.status}`:''}`} aria-expanded={rsvp} onClick={()=>setRsvp(!rsvp)}>{response&&<span className="rsvp-status-mark" aria-hidden="true">{marker}</span>}<span>{response?({going:'Going',maybe:'Maybe','not-going':'Can’t go'})[response.status]:'RSVP'}</span></button>}
      {slot.splitting_payments&&<button type="button" className="action-button payments-action" aria-label={`Expenses: ${totalLabel}`} aria-expanded={payments} onClick={()=>setPayments(!payments)}><span>{total?totalLabel:'+ Add cost'}</span>{total>0&&splitPeople(slot).length>0&&<span className="chip-people">· {splitPeople(slot).length} people</span>}</button>}
      <button type="button" className="action-button comments-action" aria-label={`Comments (${slot.comments?.length||0})`} aria-expanded={comments} onClick={()=>setComments(!comments)}><span className="comment-chip-icon" aria-hidden="true"/>{slot.comments?.length>0&&<span>{slot.comments.length}</span>}</button>
    </div>
    {rsvp&&<RsvpSheet slot={slot} visitor={visitor} theme={theme} onClose={()=>setRsvp(false)} onSave={status=>send(`/trips/${trip}/days/${day}/timeslots/${slot.id}/attendance`,{name:visitor,status})}/>}
    {payments&&<PaymentSheet slot={slot} trip={trip} day={day} visitor={visitor} refresh={refresh} api={api} theme={theme} onClose={()=>setPayments(false)}/>}
    {comments&&<div className="comments">
      {slot.comments?.map(c=><p key={c.id}><b className="comment-author">{c.name}:</b> {c.body}{c.name.toLowerCase()===visitor.trim().toLowerCase()&&<button type="button" className="delete-comment" onClick={()=>send(`/trips/${trip}/days/${day}/timeslots/${slot.id}/comments/${c.id}`,{name:visitor},'DELETE')}>Delete</button>}</p>)}
      <form className="comment-form" onSubmit={async e=>{e.preventDefault();if(sending)return;setSending(true);if(await send(`/trips/${trip}/days/${day}/timeslots/${slot.id}/comments`,{name:visitor,body}))setBody('');setSending(false)}}>
        <input aria-label="Leave a comment" placeholder="Leave a comment" value={body} onChange={e=>setBody(e.target.value)}/>
        <button type="submit" disabled={sending||!body.trim()}>{sending?'Sending…':'Send'}</button>
      </form>
      {!visitor&&<small>Enter your name above to comment.</small>}
    </div>}
    {message&&<small className="saved" role="status">{message}</small>}
  </div></article>
}
function DayPaymentSummary({day,visitor}){
  const [open,setOpen]=useState(false),money=value=>`$${Number(value||0).toFixed(2)}`,amount=value=>parseFloat(String(value||'').replace(/[^0-9.]/g,''))||0,entries=ordered(day).flatMap(slot=>(slot.payments||[]).map(payment=>({...payment,slot}))).filter(payment=>amount(payment.amount)>0)
  if(!entries.length)return null
  const labels=new Map(),key=name=>String(name||'').trim().toLocaleLowerCase(),label=name=>{const cleaned=String(name||'').trim(),id=key(cleaned);if(!labels.has(id))labels.set(id,cleaned);return labels.get(id)},balances=new Map(),add=(name,value)=>{const display=label(name);balances.set(key(display),(balances.get(key(display))||0)+value)},incomplete=[]
  ordered(day).forEach(slot=>{const payments=(slot.payments||[]).filter(payment=>amount(payment.amount)>0),total=payments.reduce((sum,payment)=>sum+amount(payment.amount),0),people=splitPeople(slot);if(!total)return;if(!people.length){incomplete.push(slot.title);return}people.forEach(person=>add(person,-total/people.length));payments.forEach(payment=>add(payment.paid_by,amount(payment.amount)))});
  const creditors=[...balances].filter(([,value])=>value>.005).map(([id,value])=>({name:labels.get(id),value})),debtors=[...balances].filter(([,value])=>value<-.005).map(([id,value])=>({name:labels.get(id),value:-value})),transfers=[]
  debtors.forEach(debtor=>creditors.forEach(creditor=>{const value=Math.min(debtor.value,creditor.value);if(value>.005){transfers.push({from:debtor.name,to:creditor.name,amount:Math.round(value*100)/100});debtor.value-=value;creditor.value-=value}}))
  const net=balances.get(key(visitor))||0,headline=incomplete.length?'Partial day balance':!visitor?'Day expenses':net<-.005?'You owe':net>.005?'You’re owed':'You’re settled up',displayAmount=visitor?Math.abs(net):entries.reduce((sum,p)=>sum+amount(p.amount),0)
  return <section className="day-payment-summary">
    <div className="balance-banner"><div><span>{headline}</span><strong>{money(displayAmount)}</strong></div><button type="button" className="day-payment-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide balances':'View balances'} <i>{open?'⌃':'⌄'}</i></button></div>
    <div className={`balance-disclosure ${open?'is-open':''}`} aria-hidden={!open} inert={open?undefined:''}><div className="balance-disclosure-inner"><div className="day-payment-details"><p className="balance-day-label">{day.label} · Suggested repayments</p><div className="day-payment-balances">{incomplete.length>0&&<small>{incomplete.length===1?`${incomplete[0]} needs people added before it can be included.`:`${incomplete.length} activities need people added before they can be included.`}</small>}{transfers.length?transfers.map((transfer,index)=><p key={index}><b>{transfer.from}</b> should pay <b>{transfer.to}</b> {money(transfer.amount)}</p>):<p className="settled">Everyone is settled up for the included expenses.</p>}</div><small>No money is moved through planr.</small></div></div></div>
  </section>

}
function PlanList({trips,onDeleted}){
  const [deleting,setDeleting]=useState(null),[error,setError]=useState('')
  const remove=async trip=>{
    if(deleting||!window.confirm(`Delete “${trip.title}”? This permanently removes every day, activity, RSVP, comment, and expense. Shared links will stop working. This cannot be undone.`))return
    setDeleting(trip.id);setError('')
    try{await api(`/me/trips/${trip.id}`,{method:'DELETE'});onDeleted(trip.id)}
    catch(e){setError(e.message)}
    finally{setDeleting(null)}
  }
  return <section className="plan-list">
    {error&&<p className="error" role="alert">{error}</p>}
    {trips.map(trip=><article key={trip.id} className={`plan-row theme-${trip.theme||'blue'}`}>
      <a className="plan-open" href={`/edit/${trip.id}`}><span><b>{trip.title}</b><small>{planDateRange(trip.days)}</small></span><i>Open →</i></a>
      <button className="delete-plan" type="button" disabled={deleting!==null} aria-label={`Delete plan: ${trip.title}`} onClick={()=>remove(trip)}>{deleting===trip.id?'Deleting…':'Delete plan'}</button>
    </article>)}
  </section>
}
function ThemePicker({theme,onChange}){return <section className="theme-picker"><span>Palette</span><LiquidChoices swatches label="Plan theme" value={theme} onChange={onChange} items={themeOptions.map(([value,label])=>({value,label}))}/></section>}
function Edit({id,token}){
  const[previewTheme,setPreviewTheme]=useState(null),themeQueue=useRef(Promise.resolve()),themeVersion=useRef(0)
  const[trip,setTrip]=useState(),[active,setActive]=useState(),[error,setError]=useState(''),[notice,setNotice]=useState(''),{user,ready}=useCurrentUser()
  useEffect(()=>{if(!token&&!ready)return;api(`/trips/${id}/edit`,{},token).then(({trip})=>{setTrip(trip);setActive(trip.days[0]?.id)}).catch(e=>setError(e.message))},[id,token,ready,user?.id])
  const mutate=async(path,options)=>{setError('');try{const r=await api(path,options,token);setTrip(r.trip);setNotice('Saved');setTimeout(()=>setNotice(''),1400);return r.trip}catch(e){setError(e.message);return null}}
  const changeTheme=theme=>{
    const version=++themeVersion.current
    setPreviewTheme(theme);setError('');setNotice('Saving palette…')
    themeQueue.current=themeQueue.current.catch(()=>{}).then(async()=>{
      try{
        const result=await api(`/trips/${id}`,{method:'PUT',body:JSON.stringify({theme})},token)
        setTrip(current=>({...current,theme:result.trip.theme}))
        if(version===themeVersion.current){setPreviewTheme(null);setNotice('Palette saved')}
      }catch(e){if(version===themeVersion.current){setPreviewTheme(null);setError(e.message);setNotice('')}}
    })
  }
  if(error&&!trip)return <Missing message={error}/>
  if(!trip)return <Loading/>
  const day=trip.days.find(d=>d.id===active)||trip.days[0],view=`${location.origin}/trip/${id}`,edit=token?`${location.origin}/edit/${id}/${token}`:'',copy=(x,l)=>navigator.clipboard.writeText(x).then(()=>setNotice(`${l} copied`)),claim=async()=>{if(await mutate(`/trips/${id}/claim`,{method:'POST'}))setNotice('Saved to My plans')}
  const deleteDay=async()=>{if(!confirm(`Delete ${day.label} and every activity in it? This cannot be undone.`))return;const updated=await mutate(`/trips/${id}/days/${day.id}`,{method:'DELETE'});if(updated)setActive(updated.days[0]?.id)}
  return <main className={`editor creator-refresh theme-${previewTheme||trip.theme||'blue'}`}><nav><Logo/><span className="nav-actions"><a href={view} target="_blank">Preview ↗</a><AccountNav/></span></nav><header className="edit-header"><input value={trip.title} onChange={e=>setTrip({...trip,title:e.target.value})} onBlur={()=>mutate(`/trips/${id}`,{method:'PUT',body:JSON.stringify({title:trip.title})})}/>{notice&&<small className="saved">✓ {notice}</small>}</header><ThemePicker theme={previewTheme||trip.theme||'blue'} onChange={changeTheme}/><section className="share"><div><b>Share your plan</b><p>View link is public. Edit link is private.</p></div><button onClick={()=>copy(view,'View link')}>Copy view link</button>{edit&&<button onClick={()=>copy(edit,'Edit link')}>Copy edit link</button>}{user&&token&&<button className="save-plan" onClick={claim}>Save to My plans</button>}</section><Tabs days={trip.days} active={day.id} onChange={setActive}/><section key={day.id} className="edit-day day-surface"><div className="day-tools"><input value={day.label} onChange={e=>setTrip({...trip,days:trip.days.map(d=>d.id===day.id?{...d,label:e.target.value}:d)})} onBlur={()=>mutate(`/trips/${id}/days/${day.id}`,{method:'PUT',body:JSON.stringify({label:day.label})})}/>{trip.days.length>1&&<button className="text-danger delete-day" onClick={deleteDay}>Delete day</button>}</div>{ordered(day).map((slot,i)=><EditSlot key={slot.id} slot={slot} timeIssue={outOfOrder(day.timeslots).has(slot.id)} index={i} count={day.timeslots.length} save={v=>mutate(`/trips/${id}/days/${day.id}/timeslots/${slot.id}`,{method:'PUT',body:JSON.stringify({...v,attendance_required:!!v.attendance_required,splitting_payments:!!v.splitting_payments})})} remove={()=>confirm('Delete this activity?')&&mutate(`/trips/${id}/days/${day.id}/timeslots/${slot.id}`,{method:'DELETE'})} move={n=>{const ids=ordered(day).map(x=>x.id);[ids[i],ids[i+n]]=[ids[i+n],ids[i]];mutate(`/trips/${id}/days/${day.id}/reorder`,{method:'PUT',body:JSON.stringify({ids})})}}/>)}<Add save={v=>mutate(`/trips/${id}/days/${day.id}/timeslots`,{method:'POST',body:JSON.stringify(v)})}/></section><AddDay save={label=>mutate(`/trips/${id}/days`,{method:'POST',body:JSON.stringify({label})})}/>{error&&<p className="error">{error}</p>}</main>
}
function AddDay({save}){const[open,setOpen]=useState(false),[label,setLabel]=useState(''),submit=async e=>{e.preventDefault();if(!label.trim())return;if(await save(label.trim())){setLabel('');setOpen(false)}};if(!open)return <button type="button" className="add-new-day" onClick={()=>setOpen(true)}>+ Add new day</button>;return <form className="add-day day-name-form" onSubmit={submit}><input autoFocus placeholder="New day name" value={label} onChange={e=>setLabel(e.target.value)}/><button>Add day</button><button type="button" onClick={()=>{setLabel('');setOpen(false)}}>Cancel</button></form>}
function Fields({form,setForm}){const set=(k,v)=>setForm({...form,[k]:v}),links=form.links||[''];return <><div className="two"><label>Time<ActivityTime value={form.time} onChange={value=>set('time',value)}/></label><label>Activity<input required value={form.title} onChange={e=>set('title',e.target.value)}/></label></div><label className="switch next-day-switch"><span><b>Next day</b><small>After midnight, but part of this day’s plans.</small></span><input type="checkbox" disabled={!form.time} checked={!!form.next_day} onChange={e=>set('next_day',e.target.checked)}/><i/></label><label className="field-label">Location<input placeholder="Location or address" value={form.location_text} onChange={e=>set('location_text',e.target.value)}/></label><div className="section-label">Links</div>{links.map((link,i)=><div className="link-row" key={i}><input type="url" aria-label={`Link ${i+1}`} placeholder="https://" value={link} onChange={e=>set('links',links.map((x,n)=>n===i?e.target.value:x))}/>{links.length>1&&<button type="button" onClick={()=>set('links',links.filter((_,n)=>n!==i))}>×</button>}</div>)}<button type="button" className="add-link" onClick={()=>set('links',[...links,''])}>+ Add another link</button><label className="field-label">Notes<textarea placeholder="Notes (optional)" value={form.notes} onChange={e=>set('notes',e.target.value)}/></label><label className="switch"><span><b>Request attendance</b><small>Guests can reply from the view link.</small></span><input type="checkbox" checked={!!form.attendance_required} onChange={e=>set('attendance_required',e.target.checked)}/><i/></label><label className="switch"><span><b>Splitting payments?</b><small>Track expenses and split costs with your group.</small></span><input type="checkbox" checked={!!form.splitting_payments} onChange={e=>set('splitting_payments',e.target.checked)}/><i/></label></>}
function EditSlot({slot,index,count,save,remove,move,timeIssue}){
  const[editing,setEditing]=useState(false)
  return <><article data-time={slot.time} className="activity-summary">
    <div><b>{fmt(slot.time)}</b><h3>{slot.title}</h3>{slot.location_text&&<p>{slot.location_text}</p>}
      <div className="creator-tags">{slot.attendance_required&&<span>RSVP</span>}{slot.splitting_payments&&<span>Expenses</span>}</div>
      {timeIssue&&<small className="time-warning">This time is earlier than an activity above it.</small>}
    </div>
    <div className="creator-card-actions"><button type="button" aria-label={`Move ${slot.title} earlier`} onClick={()=>move(-1)} disabled={!index}>↑</button><button type="button" aria-label={`Move ${slot.title} later`} onClick={()=>move(1)} disabled={index===count-1}>↓</button><button type="button" className="creator-edit" onClick={()=>setEditing(true)}>Edit</button></div>
  </article>{editing&&<ActivityWindow title="Edit activity" initial={{...slot,links:slot.links||(slot.link?[slot.link]:[''])}} save={save} remove={remove} onClose={()=>setEditing(false)} renderFields={(form,setForm)=><Fields form={form} setForm={setForm}/>}/>}</>
}
function Add({save}){
  const[open,setOpen]=useState(false)
  return <><button type="button" className="add-activity" onClick={()=>setOpen(true)}>+ Add activity</button>{open&&<ActivityWindow title="New activity" initial={blankSlot} save={save} onClose={()=>setOpen(false)} renderFields={(form,setForm)=><Fields form={form} setForm={setForm}/>}/>}</>
}
function Loading(){return <main className="center"><Logo/><p>Loading…</p></main>}function Missing({message}){return <main className="center"><Logo/><h1>We couldn't find that plan.</h1><p>{message}</p><a href="/">Make a new one</a></main>}createRoot(document.getElementById('root')).render(<App/>)
