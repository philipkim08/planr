import {PreviewSheet,PreviewAvatar} from './preview-sheet.jsx'
import React,{useState} from 'react'
import {expenseBalances,personKey} from './expense-splits.js'
import {tripGuests} from './trip-guests.js'
import {tripFinances} from './trip-finances.js'
import './balances-summary.css'

const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
export function DayPaymentSummary({day,visitor,plan,apiClient,refresh}){
 const [scope,setScope]=useState('day'),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[spending,setSpending]=useState(false)
 const trip=plan||{days:[day]},guests=tripGuests(trip),whole=tripFinances(trip)
 const result=scope==='trip'?whole:expenseBalances(day.timeslots||[],guests)
 const viewer=guests.find(g=>personKey(g.name)===personKey(visitor)),net=result.balances.get(viewer?.id)||0
 const hasExpenses=(trip.days||[]).some(d=>(d.timeslots||[]).some(s=>s.payments?.length))
 if(!hasExpenses&&!whole.repayments.length)return null
 const hasDayExpenses=(day.timeslots||[]).some(s=>s.payments?.length)
 const headline=result.incomplete.length?'Partial balance':!visitor?'Total spending':net<0?'You owe':net>0?'You’re owed':'You’re settled up'
 const changeScope=value=>{setScope(value);setError('');setNotice('')}
 const update=async(transfer,undo=false)=>{
  if(busy||!apiClient||!viewer)return
  setBusy(true);setError('');setNotice('')
  try{
   const path=undo?`/trips/${trip.id}/repayments/${transfer.id}/undo`:`/trips/${trip.id}/repayments`
   const body=undo?{recorded_by:viewer.id}:{id:crypto.randomUUID(),from_id:transfer.from_id,to_id:transfer.to_id,amount_cents:transfer.amount_cents,recorded_by:viewer.id}
   const response=await apiClient(path,{method:'POST',body:JSON.stringify(body)})
   refresh(response.trip);setNotice(undo?'Payment undone.':'Marked paid.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const guestName=(id,fallback='Guest')=>guests.find(g=>g.id===id)?.name||fallback
 const fromViewer=t=>scope==='trip'?t.from_id===viewer?.id:personKey(t.from)===personKey(visitor)
 const toViewer=t=>scope==='trip'?t.to_id===viewer?.id:personKey(t.to)===personKey(visitor)
 const outgoing=result.transfers.filter(fromViewer),incoming=result.transfers.filter(toViewer),others=result.transfers.filter(t=>!fromViewer(t)&&!toViewer(t))
 const related=net<0?outgoing:incoming,partners=related.map(t=>net<0?t.to:t.from)
 const peopleHint=partners.length?`${partners.length} ${partners.length===1?'person':'people'} ${net<0?'to pay':partners.length===1?'owes you':'owe you'}`:result.incomplete.length?'Some splits need attention':'Nothing left to settle'
 const cardHint=partners.length===1?`${net<0?'Pay ':''}${partners[0]}${net>0?' owes you':''}`:partners.length===2?`${net<0?'Pay ':''}${partners.join(' and ')}${net>0?' owe you':''}`:peopleHint
 const transferGroup=(title,transfers,kind)=>!transfers.length?null:<section className="balance-group"><h3>{title}</h3><div className="balance-group-list">{transfers.map((t,i)=>{
  const own=kind!=='others',name=kind==='outgoing'?t.to:t.from,value=t.amount_cents??Math.round(t.amount*100)
  return <div className="balance-transfer" key={`${t.from}:${t.to}:${i}`}>
   {own?<PreviewAvatar name={name}/>:<span className="preview-avatar-pair"><PreviewAvatar name={t.from} small/><PreviewAvatar name={t.to} small/></span>}
   <div className="balance-transfer-name">{own?<><strong>{name}</strong><small>{kind==='outgoing'?'You pay':'Pays you'}</small></>:<strong>{t.from} pays {t.to}</strong>}</div>
   <strong className="balance-transfer-amount">{money(value)}</strong>
   {scope==='trip'&&<input className="balance-paid-check" type="checkbox" checked={false} disabled={busy||!viewer||!!whole.incomplete.length||!apiClient} aria-label={`Mark paid: ${t.from} to ${t.to}, ${money(value)}`} onChange={()=>update(t)}/>}
  </div>
 })}</div></section>
 return <section className="day-payment-summary">
  <div className="balance-banner"><div><span>{scope==='trip'?'Entire trip':day.label} · {headline}</span><strong>{money(visitor?Math.abs(net):Math.round(result.total*100))}</strong><small>{cardHint}</small></div><button type="button" className="day-payment-toggle" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setSpending(false);setOpen(true)}}>Balances <span aria-hidden="true">›</span></button></div>
  {open&&<PreviewSheet title={spending?'Spending':'Balances'} busy={busy} onClose={()=>setOpen(false)} back={spending?()=>setSpending(false):undefined}>
   {spending?<section className="balance-spending-view" aria-label="Trip spending by person"><h2>Net spent</h2><p>After recorded repayments</p><div className="balance-group-list">{whole.people.map(p=><div className="person-spending" key={p.id}><PreviewAvatar name={p.name}/><span>{p.name}</span><strong>{money(p.paid+p.sent-p.received)}</strong></div>)}</div></section>:<>
    <div className="balance-scope" data-scope={scope} role="group" aria-label="Balance scope"><button type="button" aria-label="This day" aria-pressed={scope==='day'} onClick={()=>changeScope('day')}>{day.label}</button><button type="button" aria-pressed={scope==='trip'} onClick={()=>changeScope('trip')}>Entire trip</button></div>
    <div className="balance-sheet-hero"><span>{headline}</span><strong>{money(visitor?Math.abs(net):Math.round(result.total*100))}</strong><p>{peopleHint}</p></div>
    {result.incomplete.length>0&&<p className="finance-warning">Some splits are incomplete. Finish them before marking payments.</p>}
    {transferGroup('Owed to you',incoming,'incoming')}
    {transferGroup('You owe',outgoing,'outgoing')}
    {transferGroup('Between others',others,'others')}
    {!result.transfers.length&&<p className="balance-sheet-note settled">{scope==='day'&&!hasDayExpenses?'No expenses for this day yet.':result.incomplete.length?'No repayments for the completed splits.':'Everyone is settled up.'}</p>}
    {scope==='trip'&&!!whole.repayments.length&&<section className="balance-group"><h3>Paid</h3><div className="balance-group-list">{whole.repayments.map(r=><div className="balance-transfer is-paid" key={r.id}><span className="preview-avatar-pair"><PreviewAvatar name={guestName(r.from_id)} small/><PreviewAvatar name={guestName(r.to_id)} small/></span><strong className="balance-transfer-name">{guestName(r.from_id)} paid {guestName(r.to_id)}</strong><strong className="balance-transfer-amount">{money(r.amount_cents)}</strong><input className="balance-paid-check" type="checkbox" checked disabled={busy||!viewer||!apiClient} aria-label={`Undo paid: ${guestName(r.from_id)} to ${guestName(r.to_id)}, ${money(r.amount_cents)}`} onChange={()=>update(r,true)}/></div>)}</div></section>}
    <p className="balance-sheet-note">{scope==='trip'?'Tap the circle once it’s paid. Tap again to undo.':`${day.label}, before repayments.`}</p>
    {scope==='day'?<button type="button" className="trip-payment-link" onClick={()=>changeScope('trip')}>Track repayments →</button>:<section className="balance-group"><h3>Spending</h3><button type="button" className="balance-total-row" onClick={()=>setSpending(true)}><span>Total spent</span><strong>{money(Math.round(whole.total*100))}</strong><span aria-hidden="true">›</span></button></section>}
   </>}
   {error&&<p className="finance-error" role="alert">{error}</p>}{notice&&<p className="finance-notice" role="status">{notice}</p>}
  </PreviewSheet>}
 </section>
}
