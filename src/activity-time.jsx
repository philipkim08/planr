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
 const close=element=>{setOpen(false);setText(clock(value));element?.querySelector('input')?.setCustomValidity('')}
 const change=(next,element)=>{setText(next);const parsed=next.trim()?parseActivityTime(next,period):'';element.setCustomValidity(parsed===null?'Use a time like 9:15 or 12:30.':'');if(parsed!==null)onChange(parsed)}
 return <div className="compact-time-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close(e.currentTarget)}} onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();close(e.currentTarget);e.currentTarget.querySelector('.time-picker-trigger').focus()}}}>
  <button type="button" className="time-picker-trigger" aria-label="Choose activity time" aria-expanded={open} aria-controls={id} onClick={e=>open?close(e.currentTarget.parentElement):setOpen(true)}><span>{value?`${clock(value)} ${Number(value.slice(0,2))>=12?'PM':'AM'}`:'Any time'}</span><span aria-hidden="true">⌄</span></button>
  <div id={id} className="time-picker-popover" hidden={!open}>
   <label>Type a time<input aria-label="Activity time" placeholder="9:30" value={text} onChange={e=>change(e.target.value,e.target)}/></label>
   <div className="time-picker-columns">
    <div className="scroll-time-options" role="group" aria-label="Half-hour times">{options.map(option=><button type="button" key={option} aria-pressed={text===option} onClick={e=>{setText(option);e.currentTarget.closest('.compact-time-picker').querySelector('input').setCustomValidity('');onChange(parseActivityTime(option,period))}}>{option}</button>)}</div>
    <div className="period-options" role="group" aria-label="AM or PM"><span>AM / PM</span>{['AM','PM'].map(p=><button type="button" key={p} aria-pressed={period===p} onClick={()=>{setPeriod(p);const parsed=parseActivityTime(text,p);if(parsed)onChange(parsed)}}>{p}</button>)}</div>
   </div>
   <div className="time-picker-footer"><button type="button" onClick={e=>{const parent=e.currentTarget.closest('.compact-time-picker');onChange('');setText('');parent.querySelector('input').setCustomValidity('');setOpen(false);parent.querySelector('.time-picker-trigger').focus()}}>Any time</button><button type="button" onClick={e=>{const parent=e.currentTarget.closest('.compact-time-picker');if(parent.querySelector('input').reportValidity()===false)return;setOpen(false);parent.querySelector('.time-picker-trigger').focus()}}>Done</button></div>
  </div>
 </div>
}
