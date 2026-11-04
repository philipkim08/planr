import {cents,expenseBalances,paymentSplit,personKey} from './expense-splits.js'
import {prepareGuests,tripGuests} from './trip-guests.js'
import {validGuestId} from './guest-identity.js'

export function tripFinances(trip){
 const guests=tripGuests(trip),slots=(trip.days||[]).flatMap(d=>d.timeslots||[]),repayments=(trip.repayments||[]).filter(r=>!r.voided_at)
 const result=expenseBalances(slots,guests,repayments)
 const people=guests.map(g=>({...g,paid:0,share:0,sent:0,received:0,expenses:0,balance:result.balances.get(g.id)||0}))
 const find=(id,name)=>people.find(g=>id?g.id===id:personKey(g.name)===personKey(name))
 let expenseCount=0
 for(const slot of slots)for(const payment of slot.payments||[]){
  const amount=cents(payment.amount),split=paymentSplit(payment,slot)
  if(amount===null||!split)continue
  expenseCount++
  const payer=find(payment.paid_by_id,payment.paid_by)
  if(payer){payer.paid+=amount;payer.expenses++}
  for(const row of split.shares){const guest=find(row.person_id,row.name);if(guest)guest.share+=row.cents}
 }
 for(const row of repayments){const from=find(row.from_id),to=find(row.to_id);if(from&&to&&Number.isSafeInteger(row.amount_cents)&&row.amount_cents>0){from.sent+=row.amount_cents;to.received+=row.amount_cents}}
 const transfers=result.transfers.map(t=>({...t,from_id:guests.find(g=>g.name===t.from)?.id,to_id:guests.find(g=>g.name===t.to)?.id,amount_cents:Math.round(t.amount*100)}))
 return {...result,people,expenseCount,transfers,repayments}
}

export function recordRepayment(trip,body,now=new Date().toISOString()){
 prepareGuests(trip)
 if(!validGuestId(body.id))throw Error('Refresh the plan before marking a repayment.')
 const previous=(trip.repayments||[]).find(r=>r.id===body.id)
 if(previous){
  if(previous.from_id!==body.from_id||previous.to_id!==body.to_id||previous.amount_cents!==body.amount_cents)throw Error('This repayment request has already been used.')
  return previous // Retrying a request, including an undone one, never records money twice.
 }
 if(!trip.guests.some(g=>g.id===body.recorded_by))throw Error('Choose your name before marking a repayment.')
 if(!Number.isSafeInteger(body.amount_cents)||body.amount_cents<=0||body.from_id===body.to_id)throw Error('Choose a valid repayment.')
 const summary=tripFinances(trip)
 if(summary.incomplete.length)throw Error('Finish the incomplete expense splits before marking repayments.')
 const transfer=summary.transfers.find(t=>t.from_id===body.from_id&&t.to_id===body.to_id&&t.amount_cents===body.amount_cents)
 if(!transfer)throw Error('The balances have changed. Refresh the plan and check the latest amount before marking it paid.')
 const row={id:body.id,from_id:transfer.from_id,to_id:transfer.to_id,amount_cents:transfer.amount_cents,recorded_by:body.recorded_by,recorded_by_name:trip.guests.find(g=>g.id===body.recorded_by).name,created_at:now}
 ;(trip.repayments||=[]).push(row)
 return row
}

export function undoRepayment(trip,id,recordedBy,now=new Date().toISOString()){
 prepareGuests(trip)
 if(!trip.guests.some(g=>g.id===recordedBy))throw Error('Choose your name before changing a repayment.')
 const row=(trip.repayments||[]).find(r=>r.id===id)
 if(!row)throw Error('Repayment not found.')
 if(!row.voided_at){row.voided_at=now;row.voided_by=recordedBy}
 return row
}
