import test from 'node:test'
import assert from 'node:assert/strict'
import {tripFinances,recordRepayment,undoRepayment} from './trip-finances.js'
import {removeTripGuest} from './trip-guests.js'
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const fixture=()=>({guests:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],days:[{id:'one',timeslots:[{title:'Dinner',payments:[{id:'p1',paid_by:'A',paid_by_id:'a',amount:'90',split:{mode:'equal',shares:[{name:'A',person_id:'a',cents:3000},{name:'B',person_id:'b',cents:3000},{name:'C',person_id:'c',cents:3000}]}}]}]},{id:'two',timeslots:[{title:'Lunch',payments:[{id:'p2',paid_by:'B',paid_by_id:'b',amount:'60',split:{mode:'equal',shares:[{name:'A',person_id:'a',cents:2000},{name:'B',person_id:'b',cents:2000},{name:'C',person_id:'c',cents:2000}]}}]}]}]})
const mark=(trip,n=1)=>{const t=tripFinances(trip).transfers[0];return recordRepayment(trip,{id:id(n),from_id:t.from_id,to_id:t.to_id,amount_cents:t.amount_cents,recorded_by:t.from_id})}

test('trip breakdown separates expense spending, shares and repayment money',()=>{
 const trip=fixture(),summary=tripFinances(trip)
 assert.equal(summary.total,150);assert.equal(summary.expenseCount,2)
 assert.deepEqual(summary.people.map(p=>[p.id,p.paid,p.share,p.balance]),[['a',9000,5000,4000],['b',6000,5000,1000],['c',0,5000,-5000]])
 mark(trip)
 const after=tripFinances(trip)
 assert.equal(after.total,150);assert.equal(after.expenseCount,2)
 assert.deepEqual(after.people.map(p=>[p.id,p.paid,p.share,p.sent,p.received,p.balance]),[['a',9000,5000,0,4000,0],['b',6000,5000,0,0,1000],['c',0,5000,4000,0,-1000]])
 mark(trip,2)
 assert.equal(tripFinances(trip).transfers.length,0)
 assert.ok(tripFinances(trip).people.every(p=>p.balance===0))
})
test('repayment requests are idempotent, undo is reversible and stale checkoffs are rejected',()=>{
 const trip=fixture(),original=structuredClone(tripFinances(trip).transfers),row=mark(trip)
 recordRepayment(trip,{...row});assert.equal(trip.repayments.length,1)
 assert.throws(()=>recordRepayment(trip,{...row,id:id(2)}),/changed/)
 assert.throws(()=>recordRepayment(trip,{...row,amount_cents:1}),/already/)
 undoRepayment(trip,row.id,'c');undoRepayment(trip,row.id,'c')
 assert.deepEqual(tripFinances(trip).transfers,original)
 recordRepayment(trip,{...row});assert.equal(tripFinances(trip).repayments.length,0,'late retry cannot restore an undone checkoff')
 mark(trip,3);assert.equal(tripFinances(trip).repayments.length,1)
})
test('expenses can change after repayment without erasing paid history or double counting',()=>{
 const trip=fixture(),row=mark(trip)
 trip.days[0].timeslots[0].payments=[]
 const summary=tripFinances(trip)
 assert.equal(summary.total,60);assert.equal(summary.repayments.length,1)
 assert.equal(summary.people.find(p=>p.id==='a').balance,-6000)
 assert.equal(summary.people.reduce((sum,p)=>sum+p.balance,0),0)
 undoRepayment(trip,row.id,'a')
 assert.equal(tripFinances(trip).people.find(p=>p.id==='a').balance,-2000)
})
test('guest merges retain recorded repayment effects; guests with repayment history cannot be erased',()=>{
 const trip=fixture();mark(trip)
 const before=tripFinances(trip)
 removeTripGuest(trip,'a','b')
 const after=tripFinances(trip)
 assert.equal(after.total,before.total)
 assert.equal(after.people.find(p=>p.id==='b').balance,before.people.find(p=>p.id==='a').balance+before.people.find(p=>p.id==='b').balance)
 assert.equal(trip.repayments[0].to_id,'b')
 trip.days=[]
 assert.throws(()=>removeTripGuest(trip,'c'),/Merge/)
})
test('invalid, unknown, same-person and incomplete-split checkoffs are rejected',()=>{
 const trip=fixture(),valid={id:id(1),from_id:'c',to_id:'a',amount_cents:4000,recorded_by:'c'}
 for(const change of [{id:'bad'},{amount_cents:-1},{amount_cents:1.5},{amount_cents:4001},{to_id:'c'},{from_id:'unknown'},{recorded_by:'unknown'}])assert.throws(()=>recordRepayment(trip,{...valid,...change}))
 trip.days[0].timeslots[0].payments[0].split={mode:'custom',shares:[{name:'A',person_id:'a',cents:100}]}
 assert.throws(()=>recordRepayment(trip,valid),/incomplete/)
 assert.equal(tripFinances(trip).total,60)
})
test('serialized repayment history retains exact cent balances after reload',()=>{
 const trip=fixture();mark(trip)
 const copy=JSON.parse(JSON.stringify(trip))
 assert.deepEqual(tripFinances(copy),tripFinances(trip))
})

test('latest activity payment settings control day balances, trip totals and final shares',async()=>{
 const {expenseBalances}=await import('./expense-splits.js')
 const {expenseTotal}=await import('./activity-helpers.js')
 const trip=fixture(),dinner=trip.days[0].timeslots[0]
 dinner.splitting_payments=true
 assert.equal(tripFinances(trip).total,150)
 dinner.splitting_payments=false
 assert.equal(expenseTotal(dinner),0)
 assert.equal(expenseBalances([dinner],trip.guests).total,0)
 assert.deepEqual(expenseBalances([dinner],trip.guests).transfers,[])
 let summary=tripFinances(trip)
 assert.equal(summary.total,60)
 assert.equal(summary.expenseCount,1)
 assert.deepEqual(summary.people.map(p=>[p.paid,p.share,p.balance]),[[0,2000,-2000],[6000,2000,4000],[0,2000,-2000]])
 // Saved expenses survive the toggle, and are included again only when enabled.
 assert.equal(dinner.payments.length,1)
 dinner.splitting_payments=true
 assert.equal(tripFinances(trip).total,150)
 dinner.minor_stop=true
 assert.equal(tripFinances(trip).total,60)
 dinner.minor_stop=false
 dinner.payments[0].amount='120'
 assert.equal(tripFinances(trip).total,180)
 trip.days[0].timeslots=[]
 assert.equal(tripFinances(trip).total,60)
})

test('disabled expenses cannot create incomplete warnings or erase money already repaid',async()=>{
 const trip=fixture(),repayment=mark(trip)
 for(const day of trip.days)for(const slot of day.timeslots)slot.splitting_payments=false
 const summary=tripFinances(trip)
 assert.equal(summary.total,0)
 assert.equal(summary.expenseCount,0)
 assert.ok(summary.people.every(p=>p.share===0&&p.paid===0))
 assert.equal(summary.repayments.length,1)
 assert.equal(summary.people.find(p=>p.id===repayment.from_id).sent,repayment.amount_cents)
 trip.days[0].timeslots[0].payments[0].amount='invalid'
 assert.deepEqual(tripFinances(trip).incomplete,[])
})
