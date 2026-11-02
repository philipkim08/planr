import {splitPeople} from './activity-helpers.js'
export const personKey=name=>String(name||'').trim().toLowerCase()
export function cents(value){
 const text=String(value??'').trim()
 if(!/^\d+(\.\d{1,2})?$/.test(text))return null
 const [whole,fraction='']=text.split('.'),valueInCents=Number(whole)*100+Number(fraction.padEnd(2,'0'))
 return Number.isSafeInteger(valueInCents)?valueInCents:null
}
export function makeSplit(amount,mode,rows){
 const total=cents(amount)
 if(total===null||total<=0)throw Error('Enter a positive amount with at most two decimal places.')
 if(!['equal','custom'].includes(mode))throw Error('Choose an equal or custom split.')
 if(!Array.isArray(rows)||!rows.length)throw Error('Select at least one person for this expense.')
 const seen=new Set(),seenIds=new Set(),shares=rows.map(row=>{
  const name=String(row.name||'').trim(),key=personKey(name)
  if(!key||seen.has(key)||(row.person_id&&seenIds.has(row.person_id)))throw Error('Each person must have a unique name.')
  seen.add(key)
  if(row.person_id)seenIds.add(row.person_id)
  const value=mode==='custom'?cents(row.amount):0
  if(value===null)throw Error(`Enter a valid share for ${name}.`)
  return {name,cents:value,...(row.person_id?{person_id:row.person_id}:{})}
 })
 if(mode==='equal')shares.forEach((row,i)=>{row.cents=Math.floor(total/shares.length)+(i<total%shares.length?1:0)})
 if(shares.reduce((sum,row)=>sum+row.cents,0)!==total)throw Error('The shares must add up to the expense total.')
 return {mode,shares}
}
export function paymentSplit(payment,slot){
 if(payment.split){
  try{return makeSplit(payment.amount,payment.split.mode,payment.split.shares.map(r=>({name:r.name,person_id:r.person_id,amount:(r.cents/100).toFixed(2)})))}catch{return null}
 }
 try{return makeSplit(payment.amount,'equal',splitPeople(slot).map(name=>({name})))}catch{return null}
}
export function validatePayment(body,slot,previous){
 const paid_by=String(body.paid_by||'').trim()
 if(!paid_by)throw Error('Please say who paid.')
 const raw=body.split||previous?.split
 const split=raw?makeSplit(body.amount,raw.mode,(raw.shares||[]).map(r=>({name:r.name,person_id:r.person_id,amount:Number.isSafeInteger(r.cents)&&r.cents>=0?(r.cents/100).toFixed(2):'invalid'}))):makeSplit(body.amount,'equal',splitPeople(slot).map(name=>({name})))
 return {paid_by,amount:(cents(body.amount)/100).toFixed(2),note:String(body.note||'').trim(),split}
}
// Freeze legacy equal splits before a guest changes the suggested group or RSVP.
export function freezeLegacySplits(slot){
 for(const payment of slot.payments||[])if(!payment.split){const split=paymentSplit(payment,slot);if(split)payment.split=split}
}
export function expensePeople(slot){
 const names=(slot.payments||[]).length?(slot.payments||[]).flatMap(p=>(paymentSplit(p,slot)?.shares||[]).map(r=>r.name)):splitPeople(slot)
 return [...new Map(names.map(name=>[personKey(name),name])).values()]
}
export function expenseBalances(slots,guests=[]){
 const balances=new Map(),labels=new Map(),incomplete=[],transfers=[]
 let total=0
 const add=(name,value,id)=>{const guest=guests.find(g=>g.id===id)||guests.find(g=>personKey(g.name)===personKey(name)),key=guest?.id||id||personKey(name);labels.set(key,guest?.name||labels.get(key)||name);balances.set(key,(balances.get(key)||0)+value)}
 for(const slot of slots)for(const payment of slot.payments||[]){
  const value=cents(payment.amount),split=paymentSplit(payment,slot)
  if(value===null||!split){if(!incomplete.includes(slot.title))incomplete.push(slot.title);continue}
  total+=value;add(payment.paid_by,value,payment.paid_by_id);split.shares.forEach(r=>add(r.name,-r.cents,r.person_id))
 }
 const creditors=[...balances].filter(([,v])=>v>0).map(([key,value])=>({name:labels.get(key),value})),debtors=[...balances].filter(([,v])=>v<0).map(([key,value])=>({name:labels.get(key),value:-value}))
 for(const debtor of debtors)for(const creditor of creditors){const value=Math.min(debtor.value,creditor.value);if(value){transfers.push({from:debtor.name,to:creditor.name,amount:value/100});debtor.value-=value;creditor.value-=value}}
 return {balances,transfers,incomplete,total:total/100}
}
