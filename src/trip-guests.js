import {freezeLegacySplits,personKey,validatePayment,makeSplit} from './expense-splits.js'

// Deterministic IDs let old plans acquire a roster without writing on a read.
export function tripGuests(trip){
 if(trip.guest_roster_version===1)return [...(trip.guests||[])]
 const guests=[...(trip.guests||[])],seen=new Set(guests.map(g=>personKey(g.name)))
 const include=(name,id)=>{
  if(id&&guests.some(g=>g.id===id))return
  const key=personKey(name)
  if(key&&!seen.has(key)){guests.push({id:`person:${encodeURIComponent(key)}`,name:String(name).trim()});seen.add(key)}
 }
 for(const day of trip.days||[])for(const slot of day.timeslots||[]){
  for(const row of slot.attendance||[])include(row.name,row.person_id)
  for(const payment of slot.payments||[]){include(payment.paid_by,payment.paid_by_id);for(const share of payment.split?.shares||[])include(share.name,share.person_id)}
  for(const name of [...(slot.payment_participants||[]),...(slot.payment_manual_participants||[])])include(name)
  for(const row of slot.comments||[])include(row.name,row.person_id)
 }
 return guests
}
export function guestHasExpenses(trip,id){
 const guest=tripGuests(trip).find(g=>g.id===id)
 const matches=(name,personId)=>personId?personId===id:guest&&personKey(name)===personKey(guest.name)
 return (trip.days||[]).some(d=>(d.timeslots||[]).some(s=>(s.payments||[]).some(p=>matches(p.paid_by,p.paid_by_id)||(p.split?.shares||[]).some(r=>matches(r.name,r.person_id)))))
}
export function removeTripGuest(trip,id,replacementId){
 prepareGuests(trip)
 const source=trip.guests.find(g=>g.id===id),target=trip.guests.find(g=>g.id===replacementId)
 if(!source)throw Error('This guest is no longer on the trip.')
 if(replacementId&&(!target||target.id===id))throw Error('Choose a different existing guest.')
 if(!target&&guestHasExpenses(trip,id))throw Error('This guest has expenses. Merge them into the correct guest to preserve the payment history.')
 const matches=(name,personId)=>personId?personId===id:personKey(name)===personKey(source.name)
 // Validate before making any changes. Unresolved legacy expenses must be repaired first.
 for(const d of trip.days||[])for(const s of d.timeslots||[])for(const p of s.payments||[])if(!p.split)throw Error('Finish the missing expense splits before changing the guest list.')
 for(const d of trip.days||[])for(const s of d.timeslots||[]){
  for(const p of s.payments||[]){
   if(target&&matches(p.paid_by,p.paid_by_id)){p.paid_by=target.name;p.paid_by_id=target.id}
   if(target&&p.split.shares.some(r=>matches(r.name,r.person_id))){
    const combined=new Map();let overlap=false
    for(const row of p.split.shares){const next=matches(row.name,row.person_id)?{...row,name:target.name,person_id:target.id}:{...row},key=next.person_id||personKey(next.name)
     if(combined.has(key)){combined.get(key).cents+=next.cents;overlap=true}else combined.set(key,next)
    }
    p.split={mode:overlap?'custom':p.split.mode,shares:[...combined.values()]}
   }
  }
  const existingTarget=target&&(s.attendance||[]).some(r=>r.person_id===target.id)
  s.attendance=(s.attendance||[]).flatMap(r=>matches(r.name,r.person_id)?target&&!existingTarget?[{...r,name:target.name,person_id:target.id}]:[]:[r])
  for(const field of ['payment_participants','payment_manual_participants','payment_excluded_participants'])if(s[field])s[field]=[...new Set(s[field].flatMap(name=>personKey(name)===personKey(source.name)?target?[target.name]:[]:[name]))]
  if(target)for(const comment of s.comments||[])if(matches(comment.name,comment.person_id)){comment.name=target.name;comment.person_id=target.id}
 }
 trip.guests=trip.guests.filter(g=>g.id!==id)
 // Once reconciled, historical comments must not recreate deleted names on the next read.
 trip.guest_roster_version=1
 return trip
}
export function prepareGuests(trip){
 for(const day of trip.days||[])for(const slot of day.timeslots||[])freezeLegacySplits(slot)
 trip.guests=tripGuests(trip)
 const find=(name,id)=>trip.guests.find(g=>id&&g.id===id)||trip.guests.find(g=>personKey(g.name)===personKey(name))
 for(const day of trip.days||[])for(const slot of day.timeslots||[]){
  slot.attendance=[...new Map((slot.attendance||[]).map(r=>{const guest=find(r.name,r.person_id);const row=guest?{...r,name:guest.name,person_id:guest.id}:r;return [row.person_id||row.guest_id||personKey(row.name),row]})).values()]
 }
 for(const day of trip.days||[])for(const slot of day.timeslots||[])for(const payment of slot.payments||[]){
  const payer=find(payment.paid_by,payment.paid_by_id);if(payer){payment.paid_by_id=payer.id;payment.paid_by=payer.name}
  for(const share of payment.split?.shares||[]){const guest=find(share.name,share.person_id);if(guest){share.person_id=guest.id;share.name=guest.name}}
 }
 return trip
}
export function addTripGuest(trip,name){
 if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw Error('Enter a guest name with 1–80 characters.')
 prepareGuests(trip)
 const clean=name.trim().replace(/\s+/g,' '),existing=trip.guests.find(g=>personKey(g.name)===personKey(clean))
 if(existing)return existing
 const guest={id:`person:${encodeURIComponent(personKey(clean))}`,name:clean}
 trip.guests.push(guest);return guest
}
export function rosterPayment(body,slot,trip,previous){
 prepareGuests(trip)
 const find=(id,name)=>id?trip.guests.find(g=>g.id===id):trip.guests.find(g=>personKey(g.name)===personKey(name))
 const payer=find(body.paid_by_id,body.paid_by)
 if(!payer)throw Error('Choose a payer from the trip guest list.')
 const raw=body.split||previous?.split||makeSplit(body.amount,'equal',trip.guests.map(g=>({name:g.name,person_id:g.id})))
 const shares=(raw?.shares||[]).map(row=>{const guest=find(row.person_id,row.name);if(!guest)throw Error('Choose splitters from the trip guest list.');return {...row,name:guest.name,person_id:guest.id}})
 const split=raw?{...raw,shares}:undefined
 return {...validatePayment({...body,paid_by:payer.name,split},slot,previous),paid_by_id:payer.id}
}
