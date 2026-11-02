import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareGuests,addTripGuest,rosterPayment} from './trip-guests.js'
import {expenseBalances,paymentSplit} from './expense-splits.js'
const fixture=()=>({days:[{timeslots:[{title:'Dinner',attendance:[{name:'Yumin Park',status:'going'},{name:'Philip',status:'going'}],payments:[{paid_by:'Philip',amount:'60'}]}]}]})
test('roster imports legacy guests once, ignores case, and freezes old splits before adding a guest',()=>{
 const trip=fixture(),slot=trip.days[0].timeslots[0]
 prepareGuests(trip)
 const original=structuredClone(slot.payments[0].split)
 const guest=addTripGuest(trip,' YUMIN PARK ')
 assert.equal(guest.name,'Yumin Park');assert.equal(trip.guests.length,2)
 addTripGuest(trip,'Bonnie');prepareGuests(trip)
 assert.equal(trip.guests.length,3)
 assert.deepEqual(slot.payments[0].split,original)
 assert.deepEqual(paymentSplit(slot.payments[0],slot).shares.map(r=>r.cents),[3000,3000])
 assert.equal(new Set(trip.guests.map(g=>g.id)).size,3)
})
test('API uses roster IDs and canonical labels, rejects arbitrary names and duplicate identities',()=>{
 const trip=prepareGuests(fixture()),slot=trip.days[0].timeslots[0],y=trip.guests.find(g=>g.name==='Yumin Park')
 const body={paid_by:'yumin',paid_by_id:y.id,amount:'12',split:{mode:'equal',shares:[{name:'YUMIN',person_id:y.id,cents:1200}]}}
 const saved=rosterPayment(body,slot,trip)
 assert.equal(saved.paid_by,'Yumin Park');assert.equal(saved.split.shares[0].name,'Yumin Park');assert.equal(saved.split.shares[0].person_id,y.id)
 assert.throws(()=>rosterPayment({...body,paid_by_id:'unknown'},slot,trip))
 assert.throws(()=>rosterPayment({...body,split:{mode:'equal',shares:[...body.split.shares,...body.split.shares]}},slot,trip))
 assert.throws(()=>rosterPayment({...body,split:{mode:'equal',shares:[{name:'Stranger',cents:1200}]}},slot,trip))
})
test('trip balances net opposing debts across days using stable guest IDs',()=>{
 const guests=[{id:'p',name:'Philip'},{id:'y',name:'Yumin Park'}]
 const first={payments:[{paid_by:'Philip',paid_by_id:'p',amount:'30',split:{mode:'equal',shares:[{person_id:'y',name:'Yumin Park',cents:3000}]}}]}
 const second={payments:[{paid_by:'Yumin',paid_by_id:'y',amount:'20',split:{mode:'equal',shares:[{person_id:'p',name:'Philip',cents:2000}]}}]}
 assert.deepEqual(expenseBalances([first],guests).transfers,[{from:'Yumin Park',to:'Philip',amount:30}])
 const result=expenseBalances([first,second],guests)
 assert.deepEqual(result.transfers,[{from:'Yumin Park',to:'Philip',amount:10}])
 assert.equal([...result.balances.values()].reduce((sum,n)=>sum+n,0),0)
})

test('legacy display labels cannot replace a known stable guest ID during normalization',()=>{
 const trip={guests:[{id:'p',name:'Philip'},{id:'y',name:'Yumin Park'}],days:[{timeslots:[{attendance:[],payments:[{paid_by:'Yumin',paid_by_id:'y',amount:'10',split:{mode:'custom',shares:[{person_id:'p',name:'Phil',cents:700},{person_id:'y',name:'Yumin',cents:300}]}}]}]}]}
 const before=expenseBalances(trip.days[0].timeslots,trip.guests)
 prepareGuests(trip)
 assert.deepEqual(trip.guests,[{id:'p',name:'Philip'},{id:'y',name:'Yumin Park'}])
 assert.equal(trip.days[0].timeslots[0].payments[0].paid_by_id,'y')
 assert.equal(trip.days[0].timeslots[0].payments[0].paid_by,'Yumin Park')
 assert.deepEqual(expenseBalances(trip.days[0].timeslots,trip.guests).transfers,before.transfers)
})

test('removing an unused guest persists across reads without resurrecting historical comment names',async()=>{
 const {removeTripGuest,tripGuests}=await import('./trip-guests.js')
 const trip={guests:[{id:'a',name:'A'},{id:'b',name:'B'}],days:[{timeslots:[{comments:[{name:'B',body:'Hello'}],attendance:[{name:'B',status:'going'}],payments:[],payment_participants:['B']}]}]}
 removeTripGuest(trip,'b')
 const reloaded=prepareGuests(JSON.parse(JSON.stringify(trip)))
 assert.deepEqual(tripGuests(reloaded).map(g=>g.name),['A'])
 assert.deepEqual(reloaded.days[0].timeslots[0].attendance,[])
 assert.equal(reloaded.days[0].timeslots[0].comments[0].body,'Hello')
})
test('cannot delete a payer or splitter without reconciliation; merged amounts are conserved',async()=>{
 const {removeTripGuest}=await import('./trip-guests.js')
 const trip={guests:[{id:'a',name:'Philip'},{id:'y',name:'Yumin Park'},{id:'alias',name:'Yumin'}],days:[{timeslots:[{title:'Dinner',attendance:[{person_id:'y',name:'Yumin Park',status:'going'},{person_id:'alias',name:'Yumin',status:'not-going'}],payments:[{paid_by:'Yumin',paid_by_id:'alias',amount:'10.01',split:{mode:'equal',shares:[{name:'Philip',person_id:'a',cents:334},{name:'Yumin Park',person_id:'y',cents:334},{name:'Yumin',person_id:'alias',cents:333}]}}]}]}]}
 assert.throws(()=>removeTripGuest(trip,'alias'),/Merge/)
 assert.throws(()=>removeTripGuest(trip,'alias','alias'),/different/)
 removeTripGuest(trip,'alias','y')
 const slot=trip.days[0].timeslots[0],p=slot.payments[0]
 assert.equal(p.amount,'10.01');assert.equal(p.paid_by_id,'y');assert.equal(p.split.mode,'custom')
 assert.deepEqual(p.split.shares.map(s=>[s.person_id,s.cents]),[['a',334],['y',667]])
 assert.deepEqual(paymentSplit(p,slot).shares,p.split.shares)
 assert.deepEqual(expenseBalances([slot],trip.guests).transfers,[{from:'Philip',to:'Yumin Park',amount:3.34}])
 assert.equal(slot.attendance.length,1);assert.equal(slot.attendance[0].status,'going')
 prepareGuests(trip);assert.equal(trip.guests.length,2)
})
