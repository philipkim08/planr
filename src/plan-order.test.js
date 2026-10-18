import test from 'node:test'
import assert from 'node:assert/strict'
import {newestPlansFirst} from './plan-dates.js'
test('plans are newest-created first without changing the source list',()=>{
 const plans=[{id:'old',created_at:'2025-01-01T12:00:00Z'},{id:'unknown'},{id:'new',created_at:'2026-10-17T12:00:00Z'}]
 assert.deepEqual(newestPlansFirst(plans).map(p=>p.id),['new','old','unknown'])
 assert.equal(plans[0].id,'old')
})
