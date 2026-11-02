import {freezeLegacySplits,personKey,validatePayment,makeSplit} from './expense-splits.js'

// Deterministic IDs let old plans acquire a roster without writing on a read.
export function tripGuests(trip){
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
