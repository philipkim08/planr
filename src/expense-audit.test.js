import test from 'node:test'
import assert from 'node:assert/strict'
import {makeSplit,expenseBalances,paymentSplit,validatePayment} from './expense-splits.js'
import {prepareGuests,addTripGuest,rosterPayment} from './trip-guests.js'
const dollars=cents=>`${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`
let seed=20261101
const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max}

test('2,000 generated trips conserve cents, net days correctly and settle every participant exactly',()=>{
 for(let scenario=0;scenario<2000;scenario++){
  const guests=Array.from({length:1+random(15)},(_,i)=>({id:`g${i}`,name:`Guest ${i}`})),days=Array.from({length:1+random(5)},()=>({timeslots:[]})),reference=new Map(guests.map(g=>[g.id,0n]))
  let total=0n
  for(let j=0,count=1+random(30);j<count;j++){
   const amount=1+random(100000),payer=guests[random(guests.length)],selected=guests.filter(()=>random(3)!==0)
   if(!selected.length)selected.push(guests[random(guests.length)])
   const mode=random(2)?'equal':'custom',allocations=[]
   if(mode==='equal')selected.forEach((g,i)=>allocations.push(Math.floor(amount/selected.length)+(i<amount%selected.length?1:0)))
   else{let remainder=amount;selected.forEach((g,i)=>{const value=i===selected.length-1?remainder:random(remainder+1);allocations.push(value);remainder-=value})}
   const split=makeSplit(dollars(amount),mode,selected.map((g,i)=>({name:g.name,person_id:g.id,amount:dollars(allocations[i])})))
   assert.deepEqual(split.shares.map(s=>s.cents),allocations)
   total+=BigInt(amount);reference.set(payer.id,reference.get(payer.id)+BigInt(amount))
   selected.forEach((g,i)=>reference.set(g.id,reference.get(g.id)-BigInt(allocations[i])))
   days[random(days.length)].timeslots.push({title:`Expense ${j}`,payments:[{paid_by:payer.name,paid_by_id:payer.id,amount:dollars(amount),split}]})
  }
  const slots=days.flatMap(d=>d.timeslots),result=expenseBalances(slots,guests)
  assert.equal(Math.round(result.total*100),Number(total));assert.deepEqual(result.incomplete,[])
  const summedDays=new Map()
  for(const day of days)for(const [id,balance] of expenseBalances(day.timeslots,guests).balances)summedDays.set(id,(summedDays.get(id)||0)+balance)
  for(const guest of guests){assert.equal(BigInt(result.balances.get(guest.id)||0),reference.get(guest.id));assert.equal(summedDays.get(guest.id)||0,result.balances.get(guest.id)||0)}
  const remaining=new Map(reference)
  for(const transfer of result.transfers){
   const from=guests.find(g=>g.name===transfer.from).id,to=guests.find(g=>g.name===transfer.to).id,cents=BigInt(Math.round(transfer.amount*100))
   assert.ok(cents>0n);assert.notEqual(from,to)
   remaining.set(from,remaining.get(from)+cents);remaining.set(to,remaining.get(to)-cents)
  }
  assert.ok([...remaining.values()].every(n=>n===0n))
  const shuffled=expenseBalances([...slots].reverse(),guests)
  for(const g of guests)assert.equal(shuffled.balances.get(g.id)||0,result.balances.get(g.id)||0)
 }
})
test('one-cent splits, an excluded payer, zero custom shares, and all-excluded validation',()=>{
 const rows=Array.from({length:10},(_,i)=>({name:`Person ${i}`,person_id:`p${i}`}))
 assert.deepEqual(makeSplit('0.01','equal',rows).shares.map(r=>r.cents),[1,0,0,0,0,0,0,0,0,0])
 assert.throws(()=>makeSplit('10','equal',[]))
 assert.throws(()=>makeSplit('10','equal',[{name:'One',person_id:'same'},{name:'Alias',person_id:'same'}]))
 const split=makeSplit('10','custom',[{name:'A',amount:'0'},{name:'B',amount:'10'}])
 assert.deepEqual(expenseBalances([{payments:[{paid_by:'C',amount:'10',split}]}]).transfers,[{from:'B',to:'C',amount:10}])
})
test('editing payer and amount, deleting an expense and adding guests update only intended balances',()=>{
 const trip={guests:[{id:'a',name:'A'},{id:'b',name:'B'}],days:[{timeslots:[{title:'Taxi',payments:[]}]}]},slot=trip.days[0].timeslots[0]
 slot.payments.push(rosterPayment({paid_by_id:'a',amount:'10'},slot,trip))
 assert.deepEqual(expenseBalances([slot],trip.guests).transfers,[{from:'B',to:'A',amount:5}])
 slot.payments[0]=rosterPayment({paid_by_id:'b',amount:'12'},slot,trip,slot.payments[0])
 assert.deepEqual(expenseBalances([slot],trip.guests).transfers,[{from:'A',to:'B',amount:6}])
 const frozen=structuredClone(slot.payments[0].split)
 addTripGuest(trip,'C');prepareGuests(trip)
 assert.deepEqual(slot.payments[0].split,frozen)
 const newPayment=rosterPayment({paid_by_id:'a',amount:'9'},slot,trip)
 assert.equal(newPayment.split.shares.length,3)
 slot.payments=[]
 assert.deepEqual(expenseBalances([slot],trip.guests).transfers,[])
 assert.equal(expenseBalances([slot],trip.guests).total,0)
})
test('invalid expenses are excluded and reported; custom edits cannot silently redistribute money',()=>{
 const malformed={paid_by:'A',amount:'10',split:{mode:'custom',shares:[{name:'B',cents:900}]}}
 assert.equal(paymentSplit(malformed,{}),null)
 const result=expenseBalances([{title:'Incomplete dinner',payments:[malformed]}])
 assert.deepEqual(result.incomplete,['Incomplete dinner']);assert.equal(result.total,0);assert.equal(result.balances.size,0)
 const split=makeSplit('10','custom',[{name:'A',amount:'4'},{name:'B',amount:'6'}])
 assert.throws(()=>validatePayment({paid_by:'A',amount:'11'}, {}, {split}))
 for(const amount of ['-10','0','Infinity','NaN','1e3','1.001',''])assert.throws(()=>makeSplit(amount,'equal',[{name:'A'}]))
})
