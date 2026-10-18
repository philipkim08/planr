import React, {useEffect, useRef, useState} from 'react'
import {expenseTotal, splitPeople} from './activity-helpers.js'

const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0)
const key=n=>String(n||'').trim().toLowerCase()
const unique=names=>[...new Map(names.filter(n=>key(n)).map(n=>[key(n),n.trim()])).values()]

export function PaymentSheet({slot,trip,day,visitor,refresh,api,theme,onClose}){
  const dialog=useRef(null),lastFocus=useRef(null)
  const [entry,setEntry]=useState(null),[editPeople,setEditPeople]=useState(false),[newPerson,setNewPerson]=useState(''),[addingPerson,setAddingPerson]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const people=splitPeople(slot),total=expenseTotal(slot),ownShare=people.some(n=>key(n)===key(visitor))&&people.length?total/people.length:null
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
  const startEntry=payment=>{setEntry(payment?{...payment}:{paid_by:visitor||people[0]||'',amount:'',note:''});setError('');setEditPeople(false)}
  const saveEntry=async e=>{
    e.preventDefault()
    if(!entry.paid_by.trim()){setError('Enter who paid.');return}
    if(!Number.isFinite(Number(entry.amount))||Number(entry.amount)<=0){setError('Enter an amount greater than zero.');return}
    if(await mutate(entry.id?`/payments/${entry.id}`:'/payments',{...entry,paid_by:entry.paid_by.trim(),amount:String(entry.amount)},entry.id?'PUT':'POST')){setEntry(null);setEditPeople(false)}
  }
  const payerOptions=unique([...people,visitor,...(slot.payments||[]).map(p=>p.paid_by)])
  const groupEditor=<div className="sheet-people-editor">
    <p>Split this activity with</p>
    <div className="sheet-people">{people.map(name=><span key={key(name)}>{name}<button type="button" disabled={busy} aria-label={`Remove ${name}`} onClick={()=>savePeople(people.filter(n=>key(n)!==key(name)))}>×</button></span>)}<button type="button" className="sheet-plus" aria-label="Add a person" aria-expanded={addingPerson} onClick={()=>setAddingPerson(!addingPerson)}>+</button></div>
    {addingPerson&&<div className="sheet-add-person"><input autoFocus aria-label="New person's name" placeholder="Name" value={newPerson} onChange={e=>setNewPerson(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPerson()}}}/><button type="button" disabled={busy||!newPerson.trim()} onClick={addPerson}>Add</button></div>}
    <small>Applies to all expenses in this activity. Going guests are included automatically.</small>
  </div>
  return <dialog ref={dialog} className={`planr-sheet ${entry?'is-entry':''} theme-${theme||'blue'}`} aria-labelledby="payment-sheet-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <div className="sheet-content">
      <div className="sheet-handle" aria-hidden="true"/>
      <div className="sheet-navigation">{entry?<button type="button" disabled={busy} onClick={()=>{setEntry(null);setEditPeople(false);setError('')}}>‹ Back</button>:<span/>}<button type="button" className="sheet-close" aria-label="Close payments" disabled={busy} onClick={onClose}>×</button></div>
      <header><h2 id="payment-sheet-title">{entry?(entry.id?'Edit expense':'Add expense'):slot.title}</h2>{!entry&&slot.location_text&&<p>{slot.location_text}</p>}</header>
      {error&&<p role="alert" className="sheet-error">{error}</p>}
      {entry?<form onSubmit={saveEntry} className="sheet-expense-form">
        <label className="sheet-amount-label">Amount<div className="sheet-amount"><span>$</span><input autoFocus aria-label="Amount" inputMode="decimal" placeholder="0.00" value={entry.amount} onChange={e=>setEntry({...entry,amount:e.target.value.replace(/[^0-9.]/g,'')})}/></div></label>
        <label>What for<input placeholder="Dinner, tickets, gas" value={entry.note} onChange={e=>setEntry({...entry,note:e.target.value})}/></label>
        <div className="sheet-form-pair"><label>Paid by<select aria-label="Paid by" value={payerOptions.includes(entry.paid_by)?entry.paid_by:''} onChange={e=>setEntry({...entry,paid_by:e.target.value})}><option value="">Someone else…</option>{payerOptions.map(name=><option key={key(name)} value={name}>{key(name)===key(visitor)?`You (${name})`:name}</option>)}</select></label><label>Split<button className="sheet-split-select" type="button" aria-expanded={editPeople} onClick={()=>setEditPeople(!editPeople)}>{people.length?`${people.length} people`:'Add people'} <span>⌄</span></button></label></div>
        {!payerOptions.includes(entry.paid_by)&&<label>Payer’s name<input aria-label="Payer’s name" placeholder="Name" value={entry.paid_by} onChange={e=>setEntry({...entry,paid_by:e.target.value})}/></label>}
        {editPeople&&groupEditor}
        <p className="sheet-hint">{people.length?`${money(Number(entry.amount)/people.length)} per person, split equally.`:'Add people to include this expense in day balances.'}</p>
        <button className="sheet-primary" disabled={busy} type="submit">{busy?'Saving…':entry.id?'Save changes':'Save expense'}</button>
        {entry.id&&<button className="sheet-delete" disabled={busy} type="button" onClick={async()=>{if(await mutate(`/payments/${entry.id}`,{delete:true})){setEntry(null);setEditPeople(false)}}}>Delete expense</button>}
      </form>:<>
        <div className="sheet-ledger">{(slot.payments||[]).length?slot.payments.map(payment=><div className="sheet-transaction" key={payment.id}><div><strong>{payment.note||'Expense'}</strong><p>{payment.paid_by} paid{people.length?` · split ${people.length} ways`:''}</p></div><div className="sheet-transaction-amount"><strong>{money(payment.amount)}</strong><button type="button" onClick={()=>startEntry(payment)}>Edit</button></div></div>):<p className="sheet-empty">No expenses yet. Add the first one below.</p>}</div>
        <div className="sheet-split-row"><div><small>Split with</small><strong>{people.length?`${people.length} ${people.length===1?'person':'people'}`:'No one yet'}</strong></div><button type="button" aria-expanded={editPeople} onClick={()=>setEditPeople(!editPeople)}>{editPeople?'Done':'Edit'}</button></div>
        {editPeople&&groupEditor}
        <div className="sheet-share"><strong>{ownShare===null?'Activity total':'Your share'}</strong><strong>{money(ownShare===null?total:ownShare)}</strong></div>
        <button type="button" className="sheet-primary" onClick={()=>startEntry()}>+ Add expense</button>
      </>}
    </div>
  </dialog>
}
