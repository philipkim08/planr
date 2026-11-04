import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {tripFinances} from '../src/trip-finances.js'
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
test('HTTP checkoffs serialize concurrent requests, reject stale amounts, persist and undo after server restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'planr-repayment-test-')),file=join(dir,'trips.json')
 const trip={id:'test',guests:['A','B','C'].map(name=>({id:name,name})),days:[{id:'day',timeslots:[{id:'slot',title:'Dinner',payments:[{paid_by:'A',paid_by_id:'A',amount:'30',split:{mode:'equal',shares:['A','B','C'].map(name=>({name,person_id:name,cents:1000}))}}]}]}]}
 writeFileSync(file,JSON.stringify({trips:[trip]}))
 let child,base
 const start=async()=>{
  child=spawn(process.execPath,['server/index.js'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',PORT:'0',PLANR_DATA_FILE:file},stdio:['ignore','pipe','pipe']})
  base=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Local test server did not start.')),10000)
   child.stdout.on('data',data=>{const match=String(data).match(/on (\d+)/);if(match){clearTimeout(timer);resolve(`http://127.0.0.1:${match[1]}/api/trips/test`)}})
   child.once('error',e=>{clearTimeout(timer);reject(e)})
   child.once('exit',code=>{clearTimeout(timer);reject(Error(`Local server exited: ${code}`))})
  })
 }
 const stop=async()=>{if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited}}
 const request=async(path='',body)=>{const response=await fetch(base+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});return {status:response.status,...await response.json()}}
 try{
  await start()
  const b={id:id(1),from_id:'B',to_id:'A',amount_cents:1000,recorded_by:'B'},c={id:id(2),from_id:'C',to_id:'A',amount_cents:1000,recorded_by:'C'}
  const results=await Promise.all([request('/repayments',b),request('/repayments',b),request('/repayments',c),request('/guests',{name:'D'})])
  assert.ok(results.every(r=>r.status===200))
  let saved=(await request()).trip
  assert.equal(saved.repayments.length,2);assert.equal(saved.guests.length,4);assert.equal(tripFinances(saved).transfers.length,0)
  assert.equal((await request('/repayments',{...b,id:id(3)})).status,409)
  await stop();await start()
  saved=(await request()).trip
  assert.equal(saved.repayments.length,2);assert.equal(tripFinances(saved).total,30)
  assert.equal((await request(`/repayments/${id(1)}/undo`,{recorded_by:'B'})).status,200)
  saved=(await request()).trip
  assert.equal(tripFinances(saved).people.find(p=>p.id==='B').balance,-1000)
  assert.equal((await request('/repayments',b)).status,200)
  assert.equal(tripFinances((await request()).trip).repayments.length,1,'late retries must not re-check undone payments')
 }finally{await stop();rmSync(dir,{recursive:true,force:true})}
})
