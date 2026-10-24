import React,{useId,useState} from 'react'
export function parseActivityTime(text,period){
 const match=String(text).trim().match(/^(\d{1,2})(?::(\d{2}))?$/)
 if(!match)return null
 const hour=Number(match[1]),minute=Number(match[2]||0)
 if(hour<1||hour>12||minute>59)return null
 return `${String(hour%12+(period==='PM'?12:0)).padStart(2,'0')}:${String(minute).padStart(2,'0')}`
}
const clock=value=>value?`${Number(value.slice(0,2))%12||12}:${value.slice(3)}`:''
const options=Array.from({length:24},(_,i)=>`${Math.floor(i/2)||12}:${i%2?'30':'00'}`)
export function ActivityTime({value,onChange}){
 const [text,setText]=useState(()=>clock(value)),[period,setPeriod]=useState(()=>Number(value?.slice(0,2))>=12?'PM':'AM'),[open,setOpen]=useState(false),id=useId()
 const change=(next,element)=>{setText(next);const parsed=next.trim()?parseActivityTime(next,period):'';element.setCustomValidity(parsed===null?'Use a time like 9:15 or 12:30.':'');if(parsed!==null)onChange(parsed)}
 return <div className="activity-time-controls" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
  <div className="activity-clock"><input aria-label="Activity time" placeholder="Any time" inputMode="text" value={text} onChange={e=>change(e.target.value,e.target)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);if(e.key==='ArrowDown'){e.preventDefault();setOpen(true)}}}/><button type="button" aria-label="Choose activity time" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>⌄</button>
   {open&&<div id={id} className="activity-clock-options" role="group" aria-label="Half-hour times">{options.map(option=><button type="button" key={option} onClick={e=>{setText(option);onChange(parseActivityTime(option,period));setOpen(false);const input=e.currentTarget.closest('.activity-clock').querySelector('input');input.setCustomValidity('');input.focus()}}>{option}</button>)}</div>}
  </div>
  <select aria-label="AM or PM" value={period} onChange={e=>{setPeriod(e.target.value);const parsed=parseActivityTime(text,e.target.value);if(parsed)onChange(parsed)}}><option>AM</option><option>PM</option></select>
 </div>
}
