import test from 'node:test'
import assert from 'node:assert/strict'
import {outOfOrder,splitPeople,expenseTotal,itineraryPeople} from './activity-helpers.js'
const slots=items=>items.map(([time,next_day=false],order)=>({id:String(order),order,time,next_day}))
test('midnight must be explicitly next day',()=>{
 assert.deepEqual([...outOfOrder(slots([['22:00'],['00:00',true]]))],[])
 assert.deepEqual([...outOfOrder(slots([['22:00'],['00:00']]))],['1'])
})
test('compares against every earlier activity, ignores unscheduled stops, permits ties',()=>{
 assert.deepEqual([...outOfOrder(slots([['22:00'],[''],['21:00'],['21:30'],['22:00']]))],['2','3'])
 assert.deepEqual([...outOfOrder(slots([['01:00',true],['00:30',true]]))],['1'])
})
test('warnings reflect edited times and order immediately',()=>{
 const data=slots([['22:00'],['21:00']]);assert.equal(outOfOrder(data).size,1)
 data[1].time='23:00';assert.equal(outOfOrder(data).size,0)
 data[1].order=-1;assert.equal(outOfOrder(data).has('0'),true)
})
test('split respects manual exclusions and name capitalization',()=>{
 assert.deepEqual(splitPeople({payment_participants:[' Jake ','JAKE','Sarah']}),['Jake','Sarah'])
 assert.deepEqual(splitPeople({payment_excluded_participants:['jake'],payment_participants:[],attendance:[{name:'Jake',status:'going'}]}),[])
 assert.deepEqual(splitPeople({attendance:[{name:'Jake',status:'going'},{name:'Sarah',status:'maybe'}]}),['Jake'])
})
test('expense chip totals reflect additions, edits, and removal',()=>{
 const slot={payments:[]};assert.equal(expenseTotal(slot),0)
 slot.payments=[{amount:'10.25'},{amount:'$5.50'}];assert.equal(expenseTotal(slot),15.75)
 slot.payments[0].amount='20';assert.equal(expenseTotal(slot),25.5)
 slot.payments.splice(1,1);assert.equal(expenseTotal(slot),20)
})
test('automatic split follows RSVP changes alongside manual additions and exclusions',()=>{
 const slot={attendance:[{name:'Jake',status:'going'},{name:'JAKE',status:'going'},{name:'Sarah',status:'maybe'}]}
 assert.deepEqual(splitPeople(slot),['Jake'])
 slot.attendance[2].status='going';assert.deepEqual(splitPeople(slot),['Jake','Sarah'])
 slot.payment_manual_participants=['Bonnie'];slot.payment_excluded_participants=['jake']
 assert.deepEqual(splitPeople(slot),['Bonnie','Sarah'])
 slot.attendance[2].status='not-going';assert.deepEqual(splitPeople(slot),['Bonnie'])
 slot.attendance.push({name:'Philip',status:'going'});assert.deepEqual(splitPeople(slot),['Bonnie','Philip'])
})
test('itinerary picker collects unique names across all days and sources',()=>{
 const days=[{timeslots:[{payment_participants:[' Jake ',''],attendance:[{name:'JAKE',status:'going'},{name:'Sarah',status:'maybe'}],payments:[{paid_by:'Bonnie'}],comments:[{name:'Philip'}]}]},{timeslots:[{payments:[{paid_by:'Kevin'},{paid_by:'jake'}],attendance:[{name:null}]}]},{}]
 assert.deepEqual(itineraryPeople(days),['Bonnie','Jake','Kevin','Philip','Sarah'])
 assert.deepEqual(itineraryPeople([]),[])
})
