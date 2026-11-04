import {PreviewSheet,PreviewAvatar} from './preview-sheet.jsx'
import React,{useState,useRef} from 'react'
import {expenseBalances,personKey} from './expense-splits.js'
import {tripGuests} from './trip-guests.js'
import {tripFinances} from './trip-finances.js'
import './balances-summary.css'
import {dayLabel} from './plan-dates.js'

const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
export function DayPaymentSummary({day,visitor,plan,apiClient,refresh}){
 const [scope,setScope]=useState('day'),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[spending,setSpending]=useState(false)
 const [pending,setPending]=useState(null),saving=useRef(false)
 const trip=plan||{days:[day]},guests=tripGuests(trip),whole=tripFinances(trip)
 const result=scope==='trip'?whole:expenseBalances(day.timeslots||[],guests)
 const viewer=guests.find(g=>personKey(g.name)===personKey(visitor)),net=result.balances.get(viewer?.id)||0
 const hasExpenses=(trip.days||[]).some(d=>(d.timeslots||[]).some(s=>s.payments?.length))
 if(!hasExpenses&&!whole.repayments.length)return null
 const hasDayExpenses=(day.timeslots||[]).some(s=>s.payments?.length)
 const headline=result.incomplete.length?'Partial balance':!visitor?'Total spending':net<0?'You owe':net>0?'You’re owed':'You’re settled up'
 const changeScope=value=>{setScope(value);setError('');setNotice('')}
 const update=async(transfer,undo=false)=>{
  if(saving.current||!apiClient||!viewer)return
  saving.current=true;setPending({from:transfer.from_id,to:transfer.to_id,amount:transfer.amount_cents,id:transfer.id,paid:!undo})
  setBusy(true);setError('');setNotice('')
  try{
   const path=undo?`/trips/${trip.id}/repayments/${transfer.id}/undo`:`/trips/${trip.id}/repayments`
   const body=undo?{recorded_by:viewer.id}:{id:crypto.randomUUID(),from_id:transfer.from_id,to_id:transfer.to_id,amount_cents:transfer.amount_cents,recorded_by:viewer.id}
   const response=await apiClient(path,{method:'POST',body:JSON.stringify(body)})
   refresh(response.trip);setNotice(undo?'Payment undone.':'Marked paid.')
  }catch(e){setError(e.message)}finally{saving.current=false;setPending(null);setBusy(false)}
 }
 const guestName=(id,fallback='Guest')=>guests.find(g=>g.id===id)?.name||fallback
 const fromViewer=t=>scope==='trip'?t.from_id===viewer?.id:personKey(t.from)===personKey(visitor)
 const toViewer=t=>scope==='trip'?t.to_id===viewer?.id:personKey(t.to)===personKey(visitor)
 const paidRows=whole.repayments.map(r=>({...r,from:guestName(r.from_id),to:guestName(r.to_id),paid:true}))
 const rows=scope==='trip'?[...whole.transfers,...paidRows].sort((a,b)=>guests.findIndex(g=>g.id===a.from_id)-guests.findIndex(g=>g.id===b.from_id)||guests.findIndex(g=>g.id===a.to_id)-guests.findIndex(g=>g.id===b.to_id)||a.amount_cents-b.amount_cents):result.transfers
 const transferGroup=(title,transfers,kind)=>!transfers.length?null:<section className="balance-group"><h3>{title}</h3><div className="balance-group-list">{transfers.map((t,i)=>{
  const own=kind!=='others',name=kind==='outgoing'?t.to:t.from,value=t.amount_cents??Math.round(t.amount*100)
  const checked=pending&&pending.from===t.from_id&&pending.to===t.to_id&&pending.amount===value&&pending.id===t.id?pending.paid:!!t.paid
  return <div className={`balance-transfer${checked?' is-paid':''}`} key={`${t.from}:${t.to}:${value}:${i}`}>
   {own?<PreviewAvatar guests={guests} name={name}/>:<span className="preview-avatar-pair"><PreviewAvatar guests={guests} name={t.from} small/><PreviewAvatar guests={guests} name={t.to} small/></span>}
   <div className="balance-transfer-name">{own?<><strong>{name}</strong><small>{kind==='outgoing'?'You pay':'Pays you'}</small></>:<strong>{t.from} pays {t.to}</strong>}</div>
   <strong className="balance-transfer-amount">{money(value)}</strong>
   {scope==='trip'&&<label className="balance-check-control"><input className="balance-paid-check" type="checkbox" checked={checked} disabled={busy||!viewer||(!t.paid&&!!whole.incomplete.length)||!apiClient} aria-label={`${t.paid?'Undo paid':'Mark paid'}: ${t.from} to ${t.to}, ${money(value)}`} onChange={()=>update(t,!!t.paid)}/><span className="balance-check-mark" aria-hidden="true">✓</span></label>}
  </div>
 })}</div></section>
 return <section className="day-payment-summary">
  <div className="balance-banner"><div><span>{scope==='trip'?'Entire trip':dayLabel(day)} · {headline}</span><strong>{money(visitor?Math.abs(net):Math.round(result.total*100))}</strong></div><button type="button" className="day-payment-toggle" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setSpending(false);setOpen(true)}}>Balances <span aria-hidden="true">›</span></button></div>
  {open&&<PreviewSheet title={spending?'Spending':'Balances'} busy={busy} onClose={()=>setOpen(false)} back={spending?()=>setSpending(false):undefined}>
   {spending?<section className="balance-spending-view" aria-label="Trip spending by person"><h2>Trip cost</h2><p>Your total after everyone settles</p>{whole.incomplete.length>0&&<p className="finance-warning">Partial totals — some expense splits still need completing.</p>}<div className="balance-group-list">{whole.people.map(p=><div className="person-spending" key={p.id}><PreviewAvatar guests={guests} name={p.name}/><span>{p.name}</span><strong>{money(p.share)}</strong></div>)}</div></section>:<>
    <div className="balance-scope" data-scope={scope} role="group" aria-label="Balance scope"><button type="button" aria-label="This day" aria-pressed={scope==='day'} onClick={()=>changeScope('day')}>{dayLabel(day)}</button><button type="button" aria-pressed={scope==='trip'} onClick={()=>changeScope('trip')}>Entire trip</button></div>
    <div key={scope} className="balance-scope-content"><div className="balance-sheet-hero"><span>{headline}</span><strong>{money(visitor?Math.abs(net):Math.round(result.total*100))}</strong></div>
    {result.incomplete.length>0&&<p className="finance-warning">Some splits are incomplete. Finish them before marking payments.</p>}
    {transferGroup('Owed to you',rows.filter(toViewer),'incoming')}
    {transferGroup('You owe',rows.filter(fromViewer),'outgoing')}
    {transferGroup('Between others',rows.filter(t=>!fromViewer(t)&&!toViewer(t)),'others')}
    {!rows.length&&<p className="balance-sheet-note settled">{scope==='day'&&!hasDayExpenses?'No expenses for this day yet.':result.incomplete.length?'No repayments for the completed splits.':'Everyone is settled up.'}</p>}

    <p className="balance-sheet-note">{scope==='trip'?'Tap the circle once it’s paid. Tap again to undo.':`${dayLabel(day)}, before repayments.`}</p>
    {scope==='day'?<button type="button" className="trip-payment-link" onClick={()=>changeScope('trip')}>Track repayments →</button>:<section className="balance-group"><h3>Spending</h3><button type="button" className="balance-total-row" onClick={()=>setSpending(true)}><span>Total spent</span><strong>{money(Math.round(whole.total*100))}</strong><span aria-hidden="true">›</span></button></section>}
   </div></>}
   <div className="balance-feedback">{error&&<p className="finance-error" role="alert">{error}</p>}<span className="balance-save-status" role="status">{busy?'Saving…':notice}</span></div>
  </PreviewSheet>}
 </section>
}
