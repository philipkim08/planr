import React,{useState} from 'react'
import {cents,personKey} from './expense-splits.js'
const money=value=>`$${(value/100).toFixed(2)}`
export function ExpenseSplitEditor({entry,setEntry,draftSplit}){
 const [name,setName]=useState('')
 const update=(index,values)=>setEntry({...entry,rows:entry.rows.map((row,i)=>i===index?{...row,...values}:row)})
 const selected=entry.rows.filter(r=>r.selected),assigned=selected.reduce((sum,r)=>sum+(cents(r.amount)||0),0),total=cents(entry.amount)||0,remaining=total-assigned
 const add=()=>{const value=name.trim();if(!value)return;const i=entry.rows.findIndex(r=>personKey(r.name)===personKey(value));if(i>=0)update(i,{selected:true});else setEntry({...entry,rows:[...entry.rows,{name:value,amount:'',selected:true}]});setName('')}
 return <div className="expense-split-editor">
  <div className="expense-split-modes" role="group" aria-label="Split method">{['equal','custom'].map(mode=><button type="button" key={mode} aria-pressed={entry.mode===mode} onClick={()=>setEntry({...entry,mode,rows:entry.rows.map(r=>({...r,amount:r.amount||((draftSplit?.shares.find(s=>personKey(s.name)===personKey(r.name))?.cents||0)/100).toFixed(2)}))})}>{mode==='equal'?'Equally':'Custom amounts'}</button>)}</div>
  <p className="sheet-hint">Choose who shares this expense. Include the payer if they took part.</p>
  {entry.rows.map((row,i)=><div className="expense-split-person" key={personKey(row.name)}><label><input type="checkbox" checked={row.selected} onChange={e=>update(i,{selected:e.target.checked})}/><span>{row.name}</span></label>{entry.mode==='custom'&&row.selected?<label className="expense-share-input"><span>$</span><input aria-label={`Their share: ${row.name}`} inputMode="decimal" placeholder="0.00" value={row.amount} onChange={e=>update(i,{amount:e.target.value})}/></label>:row.selected&&draftSplit&&<span>{money(draftSplit.shares.find(s=>personKey(s.name)===personKey(row.name))?.cents||0)}</span>}</div>)}
  <div className="expense-split-add"><input aria-label="Add person to this expense" placeholder="Add a name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/><button type="button" disabled={!name.trim()} onClick={add}>Add</button></div>
  <p className="expense-split-total" role="status">{entry.mode==='custom'?(remaining===0?`${money(assigned)} of ${money(total)} assigned`:remaining>0?`${money(remaining)} left to assign`:`${money(-remaining)} over the total`):'Any extra cents are distributed one at a time.'}</p>
 </div>
}
