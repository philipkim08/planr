import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import Module from 'node:module'
import {build} from 'esbuild'
import React from 'react'
import TestRenderer,{act} from 'react-test-renderer'

// Exercise the actual page components without a browser or production API.
const root=fileURLToPath(new URL('../',import.meta.url))
const bundle=await build({
  entryPoints:[path.join(root,'src/main.jsx')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',
  define:{'import.meta.env':'{}'},loader:{'.css':'empty'},
  plugins:[{name:'page-test-entry',setup(build){build.onLoad({filter:/\/src\/main\.jsx$/},args=>({loader:'jsx',contents:readFileSync(args.path,'utf8').replace("createRoot(document.getElementById('root')).render(<App/>)",'export {View,Edit}') }))}}]
})
const modulePath=path.join(root,'day-switching-test.cjs'),loaded=new Module(modulePath)
loaded.paths=Module._nodeModulePaths(root)
loaded._compile(bundle.outputFiles[0].text,modulePath)
const {View,Edit}=loaded.exports
const slot=(id,title)=>({id,title,time:'12:00',order:0,attendance_required:true,splitting_payments:true,attendance:[{name:'Philip',status:'going'}],payments:[{id:'payment',paid_by:'Grace',amount:'30',note:'Lunch'}],comments:[]})
const trip={id:'test',title:'Test plan',theme:'purple',days:[
  {id:'a',label:'Day A',order:0,timeslots:[slot('shared-id','Activity A')]},
  {id:'b',label:'Day B',order:1,timeslots:[slot('shared-id','Activity B'),{...slot('second','Second activity'),order:1}]},
  {id:'empty',label:'Empty day',order:2,timeslots:[]}
]}
const hasClass=(node,name)=>typeof node.props.className==='string'&&node.props.className.split(' ').includes(name)
const count=(renderer,name)=>renderer.root.findAll(node=>hasClass(node,name)).length
const button=(renderer,predicate)=>renderer.root.findAllByType('button').find(predicate)
const click=async b=>{assert.ok(b,'button exists');await act(async()=>{b.props.onClick()})}

test('background refresh keeps the selected day and unsent comment draft',async()=>{
 const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,window:globalThis.window,document:globalThis.document,ResizeObserver:globalThis.ResizeObserver}
 let current=structuredClone(trip),renderer
 globalThis.fetch=async()=>({ok:true,json:async()=>({trip:current})})
 globalThis.localStorage={getItem:key=>key==='planr-visitor-name'?'Sarah':null,setItem(){}}
 globalThis.window=new EventTarget();globalThis.document=new EventTarget()
 globalThis.document.visibilityState='visible'
 globalThis.ResizeObserver=class{observe(){} disconnect(){}}
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(View,{id:'test'}),{createNodeMock:()=>({querySelectorAll:()=>[]})})})
  await click(button(renderer,b=>b.props['data-value']==='b'))
  await click(button(renderer,b=>hasClass(b,'comments-action')))
  await act(async()=>renderer.root.findByProps({'aria-label':'Leave a comment'}).props.onChange({target:{value:'Still typing'}}))
  current=structuredClone(current);current.days[1].timeslots[0].comments.push({id:'new-comment',name:'Friend',body:'Hello'})
  await act(async()=>{globalThis.window.dispatchEvent(new Event('focus'))})
  assert.equal(renderer.root.findByProps({'aria-label':'Leave a comment'}).props.value,'Still typing')
  assert.equal(renderer.root.findAll(node=>hasClass(node,'agenda'))[0].props['aria-label'],'Day B')
  assert.equal(renderer.root.findAll(node=>hasClass(node,'comment-author')).length,1)
 }finally{if(renderer)await act(async()=>renderer.unmount());Object.assign(globalThis,originals)}
})

test('repeated day switches leave exactly one current preview/editor surface and no orphan windows',async()=>{
  const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,document:globalThis.document,location:globalThis.location,ResizeObserver:globalThis.ResizeObserver}
  globalThis.fetch=async()=>({ok:true,json:async()=>({trip})})
  globalThis.localStorage={getItem:()=> 'Philip',setItem:()=>{}}
  globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
  globalThis.location={origin:'http://test.local'}
  globalThis.ResizeObserver=class{observe(){} disconnect(){}}
  const warnings=[],originalError=console.error
  console.error=(...args)=>{warnings.push(args.map(String).join(' '))}
  const createNodeMock=()=>({querySelectorAll:()=>[],showModal(){},focus(){}})
  let renderer
  try{
    await act(async()=>{renderer=TestRenderer.create(React.createElement(View,{id:'test'}),{createNodeMock})})
    for(let i=0;i<24;i++){
      const day=trip.days[i%3]
      await click(button(renderer,b=>b.props['data-value']===day.id))
      assert.equal(count(renderer,'day-payment-summary'),day.timeslots.length?1:0,'one balance summary only')
      assert.equal(count(renderer,'agenda'),1,'one agenda only')
      assert.equal(count(renderer,'public-slot'),day.timeslots.length,'only current activities')
      assert.equal(count(renderer,'liquid-days'),1,'one day selector')
      assert.equal(renderer.root.findAllByType('dialog').length,0,'no previous-day windows')
      assert.equal(count(renderer,'comments'),0,'no previous-day comments')
      if(day.timeslots.length){
        await click(button(renderer,b=>hasClass(b,'day-payment-toggle')))
        assert.equal(count(renderer,'balance-disclosure'),1)
        await click(button(renderer,b=>hasClass(b,'comments-action')))
        await click(button(renderer,b=>hasClass(b,'payments-action')))
        assert.equal(renderer.root.findAllByType('dialog').length,1)
      }
    }
    await act(async()=>renderer.unmount())
    await act(async()=>{renderer=TestRenderer.create(React.createElement(Edit,{id:'test',token:'test-token'}),{createNodeMock})})
    for(let i=0;i<24;i++){
      const day=trip.days[i%3]
      await click(button(renderer,b=>b.props['data-value']===day.id))
      assert.equal(count(renderer,'edit-day'),1)
      assert.equal(count(renderer,'activity-summary'),day.timeslots.length)
      assert.equal(count(renderer,'add-activity'),1)
      assert.equal(count(renderer,'liquid-days'),1)
      assert.equal(renderer.root.findAllByType('dialog').length,0)
      await click(button(renderer,b=>hasClass(b,'add-activity')))
      assert.equal(renderer.root.findAllByType('dialog').length,1)
    }
    assert.deepEqual(warnings.filter(w=>/^Warning:|React|same key|destroy is not/.test(w)),[],'no duplicate keys or React lifecycle warnings')
  }finally{
    if(renderer)await act(async()=>renderer.unmount())
    console.error=originalError
    Object.assign(globalThis,originals)
  }
})
test('a first-time viewer must submit a name; returning viewers skip the welcome',async()=>{
 const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,ResizeObserver:globalThis.ResizeObserver}
 let stored=''
 globalThis.fetch=async()=>({ok:true,json:async()=>({trip})})
 globalThis.localStorage={getItem:key=>key==='planr-visitor-name'?stored:null,setItem:(key,value)=>{if(key==='planr-visitor-name')stored=value}}
 globalThis.ResizeObserver=class{observe(){} disconnect(){}}
 const options={createNodeMock:()=>({querySelectorAll:()=>[]})}
 let renderer
 try{
   await act(async()=>{renderer=TestRenderer.create(React.createElement(View,{id:'test'}),options)})
   assert.equal(count(renderer,'viewer-welcome'),1)
   assert.equal(count(renderer,'agenda'),0)
   const form=renderer.root.findByType('form')
   await act(async()=>form.props.onSubmit({preventDefault(){}}))
   assert.equal(count(renderer,'viewer-welcome'),1,'blank names do not bypass the welcome')
   await act(async()=>renderer.root.findByType('input').props.onChange({target:{value:'  Sarah  '}}))
   await act(async()=>renderer.root.findByType('form').props.onSubmit({preventDefault(){}}))
   assert.equal(stored,'Sarah')
   assert.equal(count(renderer,'viewer-welcome'),0)
   assert.equal(count(renderer,'agenda'),1)
   await act(async()=>renderer.unmount())
   await act(async()=>{renderer=TestRenderer.create(React.createElement(View,{id:'test'}),options)})
   assert.equal(count(renderer,'viewer-welcome'),0)
   assert.equal(count(renderer,'agenda'),1)
 }finally{if(renderer)await act(async()=>renderer.unmount());Object.assign(globalThis,originals)}
})
