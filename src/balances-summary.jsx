import React,{useState} from 'react'
import {expenseBalances,personKey} from './expense-splits.js'
import {tripGuests} from './trip-guests.js'
import {tripFinances} from './trip-finances.js'
import './balances-summary.css'

const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
export function DayPaymentSummary({day,visitor,plan,apiClient,refresh}){
 const [scope,setScope]=useState('day'),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
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
 return <section className="day-payment-summary">
  <div className="balance-banner"><div><span>{scope==='trip'?'Entire trip':day.label} · {headline}</span><strong>{money(visitor?Math.abs(net):Math.round(result.total*100))}</strong></div><button type="button" className="day-payment-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide balances':'View balances'} <i>{open?'⌃':'⌄'}</i></button></div>
  <div className={`balance-disclosure ${open?'is-open':''}`} aria-hidden={!open} inert={open?undefined:''}><div className="balance-disclosure-inner"><div className="day-payment-details">
   <div className="balance-scope" data-scope={scope} role="group" aria-label="Balance scope"><button type="button" aria-pressed={scope==='day'} onClick={()=>changeScope('day')}>This day</button><button type="button" aria-pressed={scope==='trip'} onClick={()=>changeScope('trip')}>Entire trip</button></div>
   {result.incomplete.length>0&&<p className="finance-warning">Some expenses have incomplete splits. Only complete expenses are included; finish those splits before marking payments.</p>}
   {scope==='day'?<>
    <p className="balance-day-label">{day.label} · Before repayments</p>
    <div className="day-payment-balances">{result.transfers.length?result.transfers.map((t,i)=><p key={i}><b>{t.from}</b> should pay <b>{t.to}</b> {money(Math.round(t.amount*100))}</p>):<p className="settled">{hasDayExpenses?'Everyone is settled up for the included expenses.':'No expenses for this day yet.'}</p>}</div>
    <button type="button" className="trip-payment-link" onClick={()=>changeScope('trip')}>Track repayments →</button>
   </>:<>
    <h3 className="finance-heading">Still to pay</h3>
    <p className="finance-help">Check after paying. Uncheck to undo.</p>
    <div className="repayment-list">{whole.transfers.length?whole.transfers.map(t=><label className="repayment-row" key={`${t.from_id}:${t.to_id}`}><input type="checkbox" checked={false} disabled={busy||!viewer||!!whole.incomplete.length||!apiClient} aria-label={`Mark paid: ${t.from} to ${t.to}, ${money(t.amount_cents)}`} onChange={()=>update(t)}/><span><b>{t.from}</b> → <b>{t.to}</b></span><strong>{money(t.amount_cents)}</strong></label>):<p className="settled">{whole.incomplete.length?'No repayments for the completed splits.':'Everyone is settled up.'}</p>}</div>
    {!!whole.repayments.length&&<><h3 className="finance-heading">Marked paid</h3><div className="repayment-list">{whole.repayments.map(r=><label className="repayment-row is-paid" key={r.id}><input type="checkbox" checked disabled={busy||!viewer||!apiClient} aria-label={`Undo paid: ${guestName(r.from_id)} to ${guestName(r.to_id)}, ${money(r.amount_cents)}`} onChange={()=>update(r,true)}/><span><b>{guestName(r.from_id)}</b> → <b>{guestName(r.to_id)}</b></span><strong>{money(r.amount_cents)}</strong></label>)}</div></>}
    {error&&<p className="finance-error" role="alert">{error}</p>}{notice&&<p className="finance-notice" role="status">{notice}</p>}
    <section className="trip-spending" aria-label="Trip spending by person">
     <h3 className="finance-heading">Net spent</h3><p className="finance-help">After recorded repayments</p>
     {whole.people.map(p=><div className="person-spending" key={p.id}><span>{p.name}</span><strong>{money(p.paid+p.sent-p.received)}</strong></div>)}
    </section>
   </>}
  </div></div></div>
 </section>
}
