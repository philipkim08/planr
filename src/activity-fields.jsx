import React,{useId,useState} from 'react'
import {ActivityIconPicker} from './activity-icon.jsx'
import {ActivityTime} from './activity-time.jsx'

export function Fields({form,setForm}){
 const [linksOpen,setLinksOpen]=useState(false),[notesOpen,setNotesOpen]=useState(false),id=useId()
 const set=(key,value)=>setForm(previous=>({...previous,[key]:value})),links=form.links||['']
 return <div className="simplified-fields" onInvalidCapture={e=>{if(e.target.type==='url')setLinksOpen(true)}}>
  <div className="activity-kind" role="group" aria-label="Activity type">
   <button type="button" aria-pressed={!form.minor_stop} onClick={()=>set('minor_stop',false)}>Full activity</button>
   <button type="button" aria-pressed={!!form.minor_stop} onClick={()=>set('minor_stop',true)}>Quick stop</button>
  </div>
  {form.minor_stop&&<p className="quick-stop-hint">One-line stop. No RSVPs, payments, or comments.</p>}
  <div className="editor-name-row"><ActivityIconPicker value={form.icon||''} onChange={value=>set('icon',value)}/><label className="field-label">Activity<input required value={form.title} onChange={e=>set('title',e.target.value)}/></label></div>
  <div className="editor-time-row">
   <div><span className="activity-meta-label">Time</span><ActivityTime value={form.time} onChange={value=>set('time',value)}/></div>
   <div><span className="activity-meta-label">After midnight</span><label className="switch compact-midnight"><span>Next day</span><input type="checkbox" aria-label="After midnight" disabled={!form.time} checked={!!form.next_day} onChange={e=>set('next_day',e.target.checked)}/><i/></label></div>
  </div>
  <label className="field-label">Location<input placeholder="Location or address" value={form.location_text||''} onChange={e=>set('location_text',e.target.value)}/></label>
  {!form.minor_stop&&<>
   <div className="editor-detail-toggles">
    <button type="button" aria-expanded={linksOpen} aria-controls={id+'-links'} onClick={()=>setLinksOpen(!linksOpen)}>↗ Link{links.filter(Boolean).length>0?' · '+links.filter(Boolean).length:''}</button>
    <button type="button" aria-expanded={notesOpen} aria-controls={id+'-notes'} onClick={()=>setNotesOpen(!notesOpen)}>Notes{form.notes?' · 1':''}</button>
   </div>
   <div id={id+'-links'} hidden={!linksOpen} className="editor-detail-content">{links.map((link,i)=><div className="link-row" key={i}><input type="url" aria-label={`Link ${i+1}`} placeholder="https://" value={link} onChange={e=>set('links',links.map((x,n)=>n===i?e.target.value:x))}/>{links.length>1&&<button type="button" aria-label={`Remove link ${i+1}`} onClick={()=>set('links',links.filter((_,n)=>n!==i))}>×</button>}</div>)}<button type="button" className="add-link" onClick={()=>set('links',[...links,''])}>+ Add another link</button></div>
   <div id={id+'-notes'} hidden={!notesOpen} className="editor-detail-content"><label className="field-label">Notes<textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></label></div>
   <div className="editor-guests"><span className="activity-meta-label">Guests</span>
    <label className="switch"><span><b>Request attendance</b><small>Guests can RSVP from the view link.</small></span><input type="checkbox" checked={!!form.attendance_required} onChange={e=>set('attendance_required',e.target.checked)}/><i/></label>
    <label className="switch"><span><b>Split payments</b><small>Track expenses and split costs.</small></span><input type="checkbox" checked={!!form.splitting_payments} onChange={e=>set('splitting_payments',e.target.checked)}/><i/></label>
   </div>
  </>}
 </div>
}
