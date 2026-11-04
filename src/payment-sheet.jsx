import {tripGuests} from './trip-guests.js'
import {AddTripGuest} from './trip-guests.jsx'
import React, {useEffect, useRef, useState} from 'react'
import {makeSplit,paymentSplit} from './expense-splits.js'
import {ExpenseSplitEditor} from './expense-split-editor.jsx'
import './expense-splits.css'

const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0)
const key=n=>String(n||'').trim().toLowerCase()
const includePayer=(rows,name)=>{const n=name.trim();if(!n)return rows;return rows.some(r=>key(r.name)===key(n))?rows.map(r=>key(r.name)===key(n)?{...r,selected:true}:r):[...rows,{name:n,amount:'',selected:true}]}

export function PaymentSheet({slot,trip,day,visitor,refresh,api,theme,onClose,plan}){
  const dialog=useRef(null),lastFocus=useRef(null)
  const [entry,setEntry]=useState(null),[editPeople,setEditPeople]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const guests=tripGuests(plan||{days:[{timeslots:[slot]}]}),people=guests.map(g=>g.name),ownShare=(slot.payments||[]).reduce((sum,p)=>sum+(paymentSplit(p,slot)?.shares.find(r=>key(r.name)===key(visitor))?.cents||0),0)/100
  useEffect(()=>{setEntry(current=>current?{...current,rows:[...current.rows,...guests.filter(g=>!current.rows.some(r=>r.person_id===g.id||key(r.name)===key(g.name))).map(g=>({person_id:g.id,name:g.name,amount:'',selected:false}))]}:current)},[guests.map(g=>g.id).join('|')])
  let draftSplit=null,splitError=''
  if(entry)try{draftSplit=makeSplit(entry.amount,entry.mode,entry.rows.filter(r=>r.selected))}catch(e){splitError=e.message}
  const base=`/trips/${trip}/days/${day}/timeslots/${slot.id}`
  useEffect(()=>{
    lastFocus.current=document.activeElement
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    dialog.current.showModal()
    return()=>{document.body.style.overflow=previous;lastFocus.current?.focus()}
  },[])
  const mutate=async(path,body,method='PUT')=>{
    if(busy)return false
    setBusy(true);setError('')
    try{const result=await api(base+path,{method,body:JSON.stringify(body)});refresh(result.trip);return true}
    catch(e){setError(e.message);return false}
    finally{setBusy(false)}
  }
  const addGuest=async name=>{
    setBusy(true)
    try{const result=await api(`/trips/${trip}/guests`,{method:'POST',body:JSON.stringify({name})});refresh(result.trip)
    const guest=result.guest
    setEntry(current=>current?{...current,paid_by:current.paid_by||guest.name,rows:current.rows.some(r=>r.person_id===guest.id)?current.rows.map(r=>r.person_id===guest.id?{...r,selected:true}:r):[...current.rows,{name:guest.name,person_id:guest.id,amount:'',selected:true}]}:current)
    return guest
    }finally{setBusy(false)}
  }
  const startEntry=payment=>{
    const split=payment&&paymentSplit(payment,slot)
    // Keep saved share order: it determines who receives a rounding cent in an equal split.
    const savedGuests=(split?.shares||[]).map(r=>guests.find(g=>r.person_id?r.person_id===g.id:key(r.name)===key(g.name))).filter(Boolean)
    const orderedGuests=[...savedGuests,...guests.filter(g=>!savedGuests.some(saved=>saved.id===g.id))]
    const rows=orderedGuests.map(g=>{const saved=split?.shares.find(r=>r.person_id?r.person_id===g.id:key(r.name)===key(g.name));return {name:g.name,person_id:g.id,amount:saved?(saved.cents/100).toFixed(2):'',selected:payment?!!saved:true}})
    setEntry({...payment,paid_by:payment?.paid_by||guests.find(g=>key(g.name)===key(visitor))?.name||people[0]||'',amount:payment?.amount||'',note:payment?.note||'',mode:split?.mode||'equal',rows});setError('');setEditPeople(!guests.length)
  }
  const saveEntry=async e=>{
    e.preventDefault()
    if(!entry.paid_by.trim()){setError('Enter who paid.');return}
    if(!draftSplit){setError(splitError);setEditPeople(true);return}
    if(await mutate(entry.id?`/payments/${entry.id}`:'/payments',{paid_by:entry.paid_by.trim(),paid_by_id:guests.find(g=>key(g.name)===key(entry.paid_by))?.id,amount:String(entry.amount),note:entry.note,split:draftSplit},entry.id?'PUT':'POST')){setEntry(null);setEditPeople(false)}
  }
  const payerOptions=people
  return <dialog ref={dialog} className={`planr-sheet ${entry?'is-entry':!(slot.payments||[]).length?'is-empty':''} theme-${theme||'blue'}`} aria-labelledby="payment-sheet-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <div className="sheet-content">
      <div className="sheet-handle" aria-hidden="true"/>
      <div className="sheet-navigation">{entry?<button type="button" disabled={busy} onClick={()=>{setEntry(null);setEditPeople(false);setError('')}}>‹ Back</button>:<span/>}<button type="button" className="sheet-close" aria-label="Close payments" disabled={busy} onClick={onClose}>×</button></div>
      <header className={!entry&&!(slot.payments||[]).length?'empty-payment-header':''}><h2 id="payment-sheet-title">{entry?(entry.id?'Edit expense':'Add expense'):slot.title}</h2>{!entry&&slot.location_text&&<p>{slot.location_text}</p>}</header>
      {error&&<p role="alert" className="sheet-error">{error}</p>}
      {entry?<form onSubmit={saveEntry} className="sheet-expense-form">
        <label className="sheet-amount-label">Amount<div className="sheet-amount"><span>$</span><input aria-label="Amount" inputMode="decimal" placeholder="0.00" value={entry.amount} onChange={e=>setEntry({...entry,amount:e.target.value})}/></div></label>
        <label>What for<input placeholder="Dinner, tickets, gas" value={entry.note} onChange={e=>setEntry({...entry,note:e.target.value})}/></label>
        <div className="sheet-form-pair"><label>Paid by<select aria-label="Paid by" value={entry.paid_by} onChange={e=>{const name=e.target.value;setEntry({...entry,paid_by:name,rows:includePayer(entry.rows,name)})}}><option value="" disabled>Choose a guest</option>{payerOptions.map(name=><option key={key(name)} value={name}>{key(name)===key(visitor)?`You (${name})`:name}</option>)}</select></label><label>Split<button className="sheet-split-select" type="button" aria-expanded={editPeople} onClick={()=>setEditPeople(!editPeople)}>{entry.mode==='custom'?'Custom':'Equally'} · {entry.rows.filter(r=>r.selected).length} <span>⌄</span></button></label></div>
        {editPeople&&<><ExpenseSplitEditor entry={entry} setEntry={setEntry} draftSplit={draftSplit}/><AddTripGuest guests={guests} onAdd={addGuest} onChoose={g=>setEntry({...entry,rows:entry.rows.map(r=>r.person_id===g.id?{...r,selected:true}:r)})}/></>}
        <button className="sheet-primary" disabled={busy||!draftSplit} type="submit">{busy?'Saving…':entry.id?'Save changes':'Save expense'}</button>
        {entry.id&&<button className="sheet-delete" disabled={busy} type="button" onClick={async()=>{if(await mutate(`/payments/${entry.id}`,{delete:true})){setEntry(null);setEditPeople(false)}}}>Delete expense</button>}
      </form>:<>
        <div className="sheet-ledger">{(slot.payments||[]).length?slot.payments.map(payment=><div className="sheet-transaction" key={payment.id}><div><strong>{payment.note||'Expense'}</strong><p>{payment.paid_by} paid · <button type="button" className="expense-split-link" onClick={()=>{startEntry(payment);setEditPeople(true)}}>{payment.split?.mode==='custom'?'Custom split':`Equal split · ${paymentSplit(payment,slot)?.shares.length||0}`}</button></p></div><div className="sheet-transaction-amount"><strong>{money(payment.amount)}</strong><button type="button" onClick={()=>startEntry(payment)}>Edit</button></div></div>):<p className="sheet-empty">No expenses yet. Add the first one below.</p>}</div>
        {!!slot.payments?.length&&<div className="sheet-share"><strong>Your share</strong><strong>{money(ownShare)}</strong></div>}
        <button type="button" className="sheet-primary" onClick={()=>startEntry()}>+ Add expense</button>
      </>}
    </div>
  </dialog>
}
