import test from 'node:test'
import assert from 'node:assert/strict'
import {cents,makeSplit,paymentSplit,freezeLegacySplits,validatePayment,expenseBalances} from './expense-splits.js'
test('equal shares conserve every cent, including very small expenses',()=>{
 for(const amount of ['10.00','0.01','100.01']){
  const split=makeSplit(amount,'equal',['A','B','C'].map(name=>({name})))
  assert.equal(split.shares.reduce((s,r)=>s+r.cents,0),cents(amount))
  assert.ok(Math.max(...split.shares.map(r=>r.cents))-Math.min(...split.shares.map(r=>r.cents))<=1)
 }
})
test('custom validation rejects mismatches, negative shares, invalid precision and duplicate people',()=>{
 const rows=[{name:'A',amount:'50'},{name:'B',amount:'30'},{name:'C',amount:'40'}]
 assert.deepEqual(makeSplit('120','custom',rows).shares.map(r=>r.cents),[5000,3000,4000])
 assert.throws(()=>makeSplit('121','custom',rows))
 assert.throws(()=>makeSplit('120','custom',[{name:'A',amount:'-1'}]))
 assert.throws(()=>makeSplit('1.001','equal',rows))
 assert.throws(()=>makeSplit('120','equal',[{name:'Jake'},{name:' jAKE '}]))
 assert.throws(()=>makeSplit('120','equal',[]))
 assert.equal(cents('1e2'),null)
 assert.equal(cents('abc'),null)
})
test('saved splits stay fixed after RSVP and group edits; legacy expenses freeze first',()=>{
 const slot={attendance:[{name:'A',status:'going'},{name:'B',status:'going'}],payments:[{paid_by:'A',amount:'10'}]}
 freezeLegacySplits(slot)
 slot.attendance[1].status='not-going';slot.payment_manual_participants=['C']
 assert.deepEqual(paymentSplit(slot.payments[0],slot).shares,[{name:'A',cents:500},{name:'B',cents:500}])
 const updated=validatePayment({paid_by:'A',amount:'12',note:'Taxi'},slot,slot.payments[0])
 assert.deepEqual(updated.split.shares.map(r=>r.name),['A','B'])
 assert.deepEqual(updated.split.shares.map(r=>r.cents),[600,600])
})
test('mixed equal and custom expenses net at day level and include payers outside the split',()=>{
 const dinner={paid_by:'A',amount:'120',split:makeSplit('120','custom',[{name:'A',amount:'50'},{name:'B',amount:'30'},{name:'C',amount:'40'}])}
 const taxi={paid_by:'b',amount:'30',split:makeSplit('30','equal',[{name:'A'},{name:'B'},{name:'C'}])}
 const result=expenseBalances([{title:'Dinner',payments:[dinner]},{title:'Taxi',payments:[taxi]}])
 assert.deepEqual([...result.balances],[['a',6000],['b',-1000],['c',-5000]])
 assert.deepEqual(result.transfers,[{from:'B',to:'A',amount:10},{from:'C',to:'A',amount:50}])
 assert.equal([...result.balances.values()].reduce((a,b)=>a+b,0),0)
 const gift={paid_by:'D',amount:'5',split:makeSplit('5','equal',[{name:'A'}])}
 assert.deepEqual(expenseBalances([{payments:[gift]}]).transfers,[{from:'A',to:'D',amount:5}])
})
test('server validation rejects forged allocations and preserves custom splits on editing',()=>{
 const split=makeSplit('10','custom',[{name:'A',amount:'0'},{name:'B',amount:'10'}])
 assert.throws(()=>validatePayment({paid_by:'A',amount:'20',split},{}))
 assert.throws(()=>validatePayment({paid_by:'A',amount:'10',split:{mode:'custom',shares:[{name:'B',cents:-1000}]}},{}))
 assert.deepEqual(validatePayment({paid_by:'A',amount:'10',note:'Updated'}, {},{split}).split,split)
})
