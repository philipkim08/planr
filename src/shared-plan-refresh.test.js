import test from 'node:test'
import assert from 'node:assert/strict'
import {watchSharedPlan} from './shared-plan-refresh.js'
const flush=()=>new Promise(resolve=>setImmediate(resolve))
test('refreshes on return/online, skips hidden tabs, survives errors and cleans up',async()=>{
 const doc=new EventTarget(),win=new EventTarget(),applied=[],errors=[]
 doc.visibilityState='visible'
 let requests=0,fail=false
 const stop=watchSharedPlan({document:doc,window:win,revision:()=>0,load:async()=>{requests++;if(fail)throw Error('offline');return requests},apply:x=>applied.push(x),onError:e=>errors.push(e)})
 try{
  await flush();assert.equal(requests,1)
  win.dispatchEvent(new Event('focus'));await flush();assert.equal(requests,2)
  doc.visibilityState='hidden';win.dispatchEvent(new Event('focus'));await flush();assert.equal(requests,2)
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(requests,3)
  fail=true;win.dispatchEvent(new Event('online'));await flush();assert.equal(errors.length,1)
  fail=false;win.dispatchEvent(new Event('pageshow'));await flush();assert.equal(applied.at(-1),5)
 }finally{stop()}
 win.dispatchEvent(new Event('focus'));await flush();assert.equal(requests,5)
})
test('late reads cannot overwrite a local save or update an unmounted page',async()=>{
 const win=new EventTarget(),applied=[];let resolve,version=0,calls=0
 const stop=watchSharedPlan({window:win,document:undefined,revision:()=>version,load:()=>{calls++;return new Promise(r=>{resolve=r})},apply:x=>applied.push(x),onError:()=>{}})
 try{
  win.dispatchEvent(new Event('focus'));assert.equal(calls,1,'requests cannot overlap')
  version++;resolve('old data');await flush();assert.deepEqual(applied,[])
  win.dispatchEvent(new Event('focus'));stop();resolve('after unmount');await flush();assert.deepEqual(applied,[])
 }finally{stop()}
})
