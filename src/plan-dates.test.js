import test from 'node:test'
import assert from 'node:assert/strict'

test('day labels use the stored date without guessing dates for custom labels',async()=>{
 const {dayLabel}=await import('./plan-dates.js')
 assert.equal(dayLabel({date:'2026-10-30',label:'Friday'}),'Fri, Oct 30')
 assert.equal(dayLabel({date:'2026-11-01',label:'Sunday'}),'Sun, Nov 1')
 assert.equal(dayLabel({label:'Travel day'}),'Travel day')
})
