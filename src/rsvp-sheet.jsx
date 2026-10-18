import React,{useEffect,useRef,useState} from 'react'
import {guestResponse} from './guest-identity.js'

const labels={going:'Going',maybe:'Maybe','not-going':'Can’t go'}
const marks={going:'✓',maybe:'–','not-going':'×'}
export function RsvpSheet({slot,visitor,guestId,theme,onClose,onSave}){
  const dialog=useRef(null)
  const responses=slot.attendance||[],current=guestResponse(responses,guestId,visitor)
  const [status,setStatus]=useState(current?.status||'going'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showPeople,setShowPeople]=useState(false),[saved,setSaved]=useState(false)
  useEffect(()=>{
    const focus=document.activeElement,overflow=document.body.style.overflow
    document.body.style.overflow='hidden';dialog.current.showModal()
    return()=>{document.body.style.overflow=overflow;focus?.focus()}
  },[])
  const save=async()=>{
    if(busy)return
    setBusy(true);setError('');setSaved(false)
    try{if(await onSave(status))setSaved(true);else setError('Could not save your RSVP. Please try again.')}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <dialog ref={dialog} className={`planr-sheet rsvp-sheet theme-${theme||'blue'}`} aria-labelledby="rsvp-sheet-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><div className="sheet-content">
    <div className="sheet-handle" aria-hidden="true"/>
    <div className="sheet-navigation"><span/><button className="sheet-close" type="button" disabled={busy} aria-label="Close RSVP" onClick={onClose}>×</button></div>
    <header><h2 id="rsvp-sheet-title">{slot.title}</h2><p>Will you be there?</p></header>
    <div className="rsvp-choices" role="group" aria-label="Your RSVP">{Object.entries(labels).map(([value,label])=><button type="button" key={value} className={`rsvp-choice status-${value}`} aria-pressed={status===value} disabled={busy} onClick={()=>{setStatus(value);setSaved(false)}}><span aria-hidden="true">{marks[value]}</span>{label}</button>)}</div>
    {!visitor&&<p className="sheet-hint">Close this window and add your name at the top of the plan before saving.</p>}
    <button type="button" className="sheet-primary" disabled={busy||!visitor.trim()} onClick={save}>{busy?'Saving…':'Save RSVP'}</button>
    {saved&&<p className="rsvp-confirmation" role="status">RSVP saved.</p>}{error&&<p className="sheet-error" role="alert">{error}</p>}
    <button className="rsvp-attendees-toggle" type="button" aria-expanded={showPeople} onClick={()=>setShowPeople(!showPeople)}>{showPeople?'Hide attendees':`Show attendees · ${responses.filter(r=>r.status==='going').length} going`} <span aria-hidden="true">{showPeople?'⌃':'⌄'}</span></button>
    {showPeople&&<div className="rsvp-sheet-attendees">{responses.length?responses.map(r=><div key={r.guest_id||r.name}><span className={`rsvp-person-status status-${r.status}`} aria-hidden="true">{marks[r.status]}</span><strong>{r.name}</strong><small>{labels[r.status]}</small></div>):<p className="sheet-hint">No responses yet.</p>}</div>}
  </div></dialog>
}
