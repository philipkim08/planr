import test from 'node:test'
import assert from 'node:assert/strict'
import {guestResponse,isGuest,updateAttendance,validGuestId} from './guest-identity.js'
import {readGuestId} from './visitor-name.js'
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
test('same-name guests have separate RSVPs; renaming and declining updates the original',()=>{
 let rows=updateAttendance([],a,'Alex','going')
 rows=updateAttendance(rows,b,'Alex','going')
 rows=updateAttendance(rows,a,'Alex Smith','not-going')
 assert.equal(rows.length,2)
 assert.equal(rows.filter(r=>r.status==='going').length,1)
 assert.equal(guestResponse(rows,a,'A new name').status,'not-going')
 assert.equal(guestResponse(rows,b,'Alex').status,'going')
 assert.equal(isGuest(rows[0],a,'Alex'),false)
})
test('legacy RSVP is adopted once without duplicating it',()=>{
 let rows=updateAttendance([{name:'Alex',status:'going'}],a,'alex','maybe')
 assert.equal(rows.length,1)
 assert.equal(rows[0].guest_id,a)
 rows=updateAttendance(rows,b,'Alex','going')
 assert.equal(rows.length,2)
 assert.equal(isGuest({guest_id:a,name:'Alex'},b,'Alex'),false)
 assert.equal(isGuest({guest_id:a,name:'Alex'},a,'New name'),true)
})
test('guest ID persists and storage failures retain a session identity',()=>{
 const original=globalThis.localStorage,store=new Map()
 try{
  globalThis.localStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)}
  const first=readGuestId();assert.ok(validGuestId(first));assert.equal(readGuestId(),first)
  globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}
  assert.equal(readGuestId(),readGuestId())
 }finally{globalThis.localStorage=original}
})
