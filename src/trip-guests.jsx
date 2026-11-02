import React,{useState} from 'react'
import {tripGuests,guestHasExpenses} from './trip-guests.js'
import {personKey} from './expense-splits.js'
import './trip-guests.css'

export function AddTripGuest({guests=[],onAdd,onChoose}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const matches=guests.filter(g=>personKey(name)&&personKey(g.name).includes(personKey(name)))
 const add=async(value=name)=>{if(busy||!value.trim())return;setBusy(true);setError('');try{await onAdd(value.trim());setName('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="trip-guest-add">
  <div className="trip-guest-input"><input maxLength={80} aria-label="Guest name" placeholder="Guest’s name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/><button type="button" disabled={busy||!name.trim()} onClick={()=>add()}>{busy?'Adding…':matches.length&&!matches.some(g=>personKey(g.name)===personKey(name))?'Add as new':'Add guest'}</button></div>
  {!!matches.length&&<div className="trip-guest-matches"><small>Already on this trip:</small>{matches.map(g=><button type="button" key={g.id} disabled={busy} onClick={()=>{if(onChoose){onChoose(g);setName('')}else add(g.name)}}>{g.name}</button>)}</div>}
  {error&&<p role="alert">{error}</p>}
 </div>
}
export function TripGuestList({trip,api,refresh}){
 const [open,setOpen]=useState(false),[removing,setRemoving]=useState(null),[replacement,setReplacement]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),guests=tripGuests(trip)
 const linked=removing&&guestHasExpenses(trip,removing.id)
 const remove=async()=>{if(busy)return;setBusy(true);setError('');try{const result=await api(`/trips/${trip.id}/guests/remove`,{method:'POST',body:JSON.stringify({guest_id:removing.id,replacement_id:replacement||undefined})});refresh(result.trip);setRemoving(null);setReplacement('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 const add=async name=>{const result=await api(`/trips/${trip.id}/guests`,{method:'POST',body:JSON.stringify({name})});refresh(result.trip);return result.guest}
 return <section className="trip-guest-list"><button type="button" className="trip-guest-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>Trip guests · {guests.length} <span>{open?'⌃':'⌄'}</span></button>{open&&<div className="trip-guest-content"><p>Everyone starts included in new expenses. Uncheck anyone who didn’t take part.</p><div className="trip-guest-chips">{guests.map(g=><span key={g.id}>{g.name}<button type="button" aria-label={`Remove ${g.name}`} disabled={busy} onClick={()=>{setRemoving(g);setReplacement('');setError('')}}>×</button></span>)}</div>{removing&&<div className="guest-removal" role="group" aria-label="Remove trip guest"><strong>Remove {removing.name}?</strong><p>{linked?'This guest has expenses. Choose the correct person to combine their payment history and shares.':'Remove them from the guest list and RSVPs, or combine them with another guest. Existing comments will remain.'}</p><label>Merge into<select aria-label="Merge guest into" disabled={busy} value={replacement} onChange={e=>setReplacement(e.target.value)}><option value="">{linked?'Choose the correct guest':'No one — just remove'}</option>{guests.filter(g=>g.id!==removing.id).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>{replacement&&<p>Payment totals stay unchanged. If both names share an expense, their amounts are combined. The existing guest’s RSVP takes priority.</p>}<div className="guest-removal-actions"><button type="button" disabled={busy||(linked&&!replacement)} onClick={remove}>{busy?'Saving…':replacement?'Merge and remove':'Remove guest'}</button><button type="button" disabled={busy} onClick={()=>{setRemoving(null);setError('')}}>Cancel</button></div>{error&&<p role="alert">{error}</p>}</div>}<AddTripGuest guests={guests} onAdd={add}/></div>}</section>
}
