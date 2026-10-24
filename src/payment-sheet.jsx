import React, {useEffect, useRef, useState} from 'react'
import {makeSplit,paymentSplit} from './expense-splits.js'
import {ExpenseSplitEditor} from './expense-split-editor.jsx'
import './expense-splits.css'
import {expenseTotal, splitPeople} from './activity-helpers.js'

const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0)
const key=n=>String(n||'').trim().toLowerCase()
const includePayer=(rows,name)=>{const n=name.trim();if(!n)return rows;return rows.some(r=>key(r.name)===key(n))?rows.map(r=>key(r.name)===key(n)?{...r,selected:true}:r):[...rows,{name:n,amount:'',selected:true}]}
const unique=names=>[...new Map(names.filter(n=>key(n)).map(n=>[key(n),n.trim()])).values()]

export function PaymentSheet({slot,trip,day,visitor,refresh,api,theme,onClose}){
  const dialog=useRef(null),lastFocus=useRef(null)
  const [manualPayer,setManualPayer]=useState(false),[entry,setEntry]=useState(null),[editPeople,setEditPeople]=useState(false),[newPerson,setNewPerson]=useState(''),[addingPerson,setAddingPerson]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const people=splitPeople(slot),total=expenseTotal(slot),ownShare=(slot.payments||[]).reduce((sum,p)=>sum+(paymentSplit(p,slot)?.shares.find(r=>key(r.name)===key(visitor))?.cents||0),0)/100
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
  const savePeople=async names=>mutate('/payment-participants',{participants:unique(names)})
  const addPerson=async()=>{if(!newPerson.trim())return;if(await savePeople([...people,newPerson])){setNewPerson('');setAddingPerson(false)}}
  const startEntry=payment=>{const split=payment&&paymentSplit(payment,slot),rows=split?split.shares.map(r=>({name:r.name,amount:(r.cents/100).toFixed(2),selected:true})):people.map(name=>({name,amount:'',selected:true}));setEntry({...payment,paid_by:payment?.paid_by||visitor||people[0]||'',amount:payment?.amount||'',note:payment?.note||'',mode:split?.mode||'equal',rows:payment?rows:includePayer(rows,visitor||people[0]||'')});setManualPayer(!!payment&&!unique([...people,visitor,...(slot.payments||[]).map(p=>p.paid_by)]).includes(payment.paid_by));setError('');setEditPeople(false)}
  const saveEntry=async e=>{
    e.preventDefault()
    if(!entry.paid_by.trim()){setError('Enter who paid.');return}
    if(!draftSplit){setError(splitError);setEditPeople(true);return}
    if(await mutate(entry.id?`/payments/${entry.id}`:'/payments',{paid_by:entry.paid_by.trim(),amount:String(entry.amount),note:entry.note,split:draftSplit},entry.id?'PUT':'POST')){setEntry(null);setEditPeople(false)}
  }
  const payerOptions=unique([...people,visitor,...(slot.payments||[]).map(p=>p.paid_by)])
  const groupEditor=<div className="sheet-people-editor">
    <p>Suggested people for new expenses</p>
    <div className="sheet-people">{people.map(name=><span key={key(name)}>{name}<button type="button" disabled={busy} aria-label={`Remove ${name}`} onClick={()=>savePeople(people.filter(n=>key(n)!==key(name)))}>×</button></span>)}<button type="button" className="sheet-plus" aria-label="Add a person" aria-expanded={addingPerson} onClick={()=>setAddingPerson(!addingPerson)}>+</button></div>
    {addingPerson&&<div className="sheet-add-person"><input autoFocus aria-label="New person's name" placeholder="Name" value={newPerson} onChange={e=>setNewPerson(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPerson()}}}/><button type="button" disabled={busy||!newPerson.trim()} onClick={addPerson}>Add</button></div>}

  </div>
  return <dialog ref={dialog} className={`planr-sheet ${entry?'is-entry':''} theme-${theme||'blue'}`} aria-labelledby="payment-sheet-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <div className="sheet-content">
      <div className="sheet-handle" aria-hidden="true"/>
      <div className="sheet-navigation">{entry?<button type="button" disabled={busy} onClick={()=>{setEntry(null);setEditPeople(false);setError('')}}>‹ Back</button>:<span/>}<button type="button" className="sheet-close" aria-label="Close payments" disabled={busy} onClick={onClose}>×</button></div>
      <header className={!entry&&!(slot.payments||[]).length?'empty-payment-header':''}><h2 id="payment-sheet-title">{entry?(entry.id?'Edit expense':'Add expense'):slot.title}</h2>{!entry&&slot.location_text&&<p>{slot.location_text}</p>}</header>
      {error&&<p role="alert" className="sheet-error">{error}</p>}
      {entry?<form onSubmit={saveEntry} className="sheet-expense-form">
        <label className="sheet-amount-label">Amount<div className="sheet-amount"><span>$</span><input autoFocus aria-label="Amount" inputMode="decimal" placeholder="0.00" value={entry.amount} onChange={e=>setEntry({...entry,amount:e.target.value.replace(/[^0-9.]/g,'')})}/></div></label>
        <label>What for<input placeholder="Dinner, tickets, gas" value={entry.note} onChange={e=>setEntry({...entry,note:e.target.value})}/></label>
        <div className="sheet-form-pair"><label>Paid by<select aria-label="Paid by" value={manualPayer?'':entry.paid_by} onChange={e=>{const name=e.target.value;setManualPayer(!name);setEntry({...entry,paid_by:name,rows:includePayer(entry.rows,name)})}}><option value="">Someone else…</option>{payerOptions.map(name=><option key={key(name)} value={name}>{key(name)===key(visitor)?`You (${name})`:name}</option>)}</select></label><label>Split<button className="sheet-split-select" type="button" aria-expanded={editPeople} onClick={()=>setEditPeople(!editPeople)}>{entry.mode==='custom'?'Custom':'Equally'} · {entry.rows.filter(r=>r.selected).length} <span>⌄</span></button></label></div>
        {manualPayer&&<label>Payer’s name<input aria-label="Payer’s name" placeholder="Name" onBlur={()=>setEntry({...entry,rows:includePayer(entry.rows,entry.paid_by)})} value={entry.paid_by} onChange={e=>setEntry({...entry,paid_by:e.target.value})}/></label>}
        {editPeople&&<ExpenseSplitEditor entry={entry} setEntry={setEntry} draftSplit={draftSplit}/>}
        <button className="sheet-primary" disabled={busy||!draftSplit} type="submit">{busy?'Saving…':entry.id?'Save changes':'Save expense'}</button>
        {entry.id&&<button className="sheet-delete" disabled={busy} type="button" onClick={async()=>{if(await mutate(`/payments/${entry.id}`,{delete:true})){setEntry(null);setEditPeople(false)}}}>Delete expense</button>}
      </form>:<>
        <div className="sheet-ledger">{(slot.payments||[]).length?slot.payments.map(payment=><div className="sheet-transaction" key={payment.id}><div><strong>{payment.note||'Expense'}</strong><p>{payment.paid_by} paid · <button type="button" className="expense-split-link" onClick={()=>{startEntry(payment);setEditPeople(true)}}>{payment.split?.mode==='custom'?'Custom split':`Equal split · ${paymentSplit(payment,slot)?.shares.length||0}`}</button></p></div><div className="sheet-transaction-amount"><strong>{money(payment.amount)}</strong><button type="button" onClick={()=>startEntry(payment)}>Edit</button></div></div>):<p className="sheet-empty">No expenses yet. Add the first one below.</p>}</div>
        {!!slot.payments?.length&&<><div className="sheet-split-row"><div><small>People for new expenses</small><strong>{people.length?`${people.length} ${people.length===1?'person':'people'}`:'No one yet'}</strong></div><button type="button" aria-expanded={editPeople} onClick={()=>setEditPeople(!editPeople)}>{editPeople?'Done':'Edit'}</button></div>
        {editPeople&&groupEditor}
        <div className="sheet-share"><strong>{ownShare===null?'Activity total':'Your share'}</strong><strong>{money(ownShare===null?total:ownShare)}</strong></div></>}
        <button type="button" className="sheet-primary" onClick={()=>startEntry()}>+ Add expense</button>
      </>}
    </div>
  </dialog>
}
