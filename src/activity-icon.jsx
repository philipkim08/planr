import React,{useId,useState} from 'react'
import {activityIcons,normalizeActivityIcon} from './activity-icons.js'
// One consistent stroke style; no emoji fonts or external assets.
const paths={
 dining:<><path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M16 13h4V3c-4 2-4 7-4 10Zm4 0v8"/></>,
 shopping:<><path d="M4 8h16l1 13H3L4 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
 movies:<><path d="m5 10 2 11h10l2-11ZM9 11l1 10m5-10-1 10"/><path d="M5 10a3 3 0 0 1-1-5 3 3 0 0 1 5-2 3 3 0 0 1 6 0 3 3 0 0 1 5 2 3 3 0 0 1-1 5"/></>,
 drinks:<><path d="M3 4h18l-9 10L3 4Zm9 10v7m-4 0h8M6 7h12"/></>,
 car:<><path d="m4 10 2-6h12l2 6M3 10h18v8H3Zm2 8v3m14-3v3M7 14h1m8 0h1"/></>,
 train:<><rect x="5" y="2" width="14" height="16" rx="4"/><path d="M5 10h14M12 2v8M8 14h.01M16 14h.01M8 18l-3 4m11-4 3 4M7 20h10"/></>,
 plane:<><path d="m21 3-6 8 5 7-2 2-7-5-4 4v3l-2-3-3-2h3l4-4-5-7 2-2 7 5 8-6Z"/></>,
 running:<><circle cx="15" cy="4" r="2"/><path d="m4 10 5-3 5 2 3 4h4M13 9l-3 6 5 2v5M10 15l-4 5H2"/></>,
 bed:<><path d="M3 4v17m18-10v10M3 17h18M3 8h6v9M9 10h8a4 4 0 0 1 4 4v3"/></>,
 dessert:<><path d="M7 8a5 5 0 0 1 10 0 3 3 0 0 1 1 6H6a3 3 0 0 1 1-6ZM8 14l4 8 4-8"/></>,
 hotel:<><rect x="4" y="3" width="16" height="19" rx="2"/><path d="M9 22v-5h6v5M8 7h1m6 0h1M8 11h1m6 0h1"/></>,
 home:<><path d="m3 10 9-8 9 8M5 9v12h5v-7h4v7h5V9"/></>,
 work:<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12a23 23 0 0 0 18 0M10 12v3h4v-3"/></>,
 moving:<><path d="M3 12h18m-7-7 7 7-7 7"/></>
}
export function ActivityIcon({name,className=''}){
 if(!normalizeActivityIcon(name))return null
 return <svg className={`activity-line-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>
}
export function ActivityIconPicker({value,onChange}){
 const [open,setOpen]=useState(false),id=useId(),selected=activityIcons.find(icon=>icon.id===value)
 return <div className="activity-icon-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();e.currentTarget.querySelector('.activity-icon-trigger').focus()}}}>
  <span className="activity-icon-label">Icon</span>
  <button type="button" className="activity-icon-trigger" aria-label={`Activity icon: ${selected?.label||'None'}`} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{selected?<ActivityIcon name={selected.id}/>:<span>None</span>}<span aria-hidden="true">⌄</span></button>
  {open&&<div className="activity-icon-options" id={id} role="group" aria-label="Choose an activity icon">{[{id:'',label:'None'},...activityIcons].map(icon=><button type="button" key={icon.id} aria-pressed={(value||'')===icon.id} onClick={e=>{onChange(icon.id);setOpen(false);e.currentTarget.closest('.activity-icon-picker').querySelector('.activity-icon-trigger').focus()}}>{icon.id?<ActivityIcon name={icon.id}/>:<span aria-hidden="true">—</span>}<span>{icon.label}</span></button>)}</div>}
 </div>
}
