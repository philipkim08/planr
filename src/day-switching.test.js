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
  define:{'import.meta.env':'{}'},loader:{'.css':'empty','.png':'dataurl'},
  plugins:[{name:'page-test-entry',setup(build){build.onLoad({filter:/\/src\/main\.jsx$/},args=>({loader:'jsx',contents:readFileSync(args.path,'utf8').replace("createRoot(document.getElementById('root')).render(<App/>)",'export {View,Edit,PaymentSheet,RsvpSheet,ActivityTime,PublicSlot,ActivityIconPicker,Fields,DayPaymentSummary}') }))}}]
})
const modulePath=path.join(root,'day-switching-test.cjs'),loaded=new Module(modulePath)
loaded.paths=Module._nodeModulePaths(root)
loaded._compile(bundle.outputFiles[0].text,modulePath)
const {View,Edit,PaymentSheet,RsvpSheet,ActivityTime,PublicSlot,ActivityIconPicker,Fields,DayPaymentSummary}=loaded.exports
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

test('major cards separate corner links from the title and preserve notes and controls',async()=>{
 let renderer
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PublicSlot,{slot:{id:'dinner',title:'Dinner',icon:'dining',time:'19:30',location_text:"Benny's Diner",notes:'Meet outside',links:['https://example.com'],attendance_required:true,splitting_payments:true},visitor:'Sarah',refresh(){}}))})
  const heading=renderer.root.findAll(n=>hasClass(n,'activity-heading'))[0]
  assert.equal(heading.findAllByType('a').length,0)
  const corner=renderer.root.findByProps({'aria-label':'Activity links'})
  assert.equal(corner.findByType('a').props.href,'https://example.com')
  assert.equal(corner.findByType('a').props.target,'_blank')
  assert.equal(heading.findAll(n=>hasClass(n,'activity-location'))[0].props.children,"Benny's Diner")
  assert.equal(count(renderer,'activity-icon-badge'),1)
  assert.equal(count(renderer,'activity-notes'),1)
  assert.equal(count(renderer,'compact-actions'),1)
  assert.equal(renderer.root.findAllByType('button').length,3)
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})
test('comment-only activities place their single action in the title area',async()=>{
 let renderer
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PublicSlot,{slot:{id:'one',title:'Walk',comments:[]},visitor:'Sarah',refresh(){}}))})
  assert.equal(count(renderer,'compact-actions'),1)
  const top=renderer.root.findAll(n=>hasClass(n,'activity-top'))[0]
  assert.equal(top.findAllByType('button').length,1)
  await click(top.findByType('button'))
  assert.equal(renderer.root.findAllByProps({'aria-label':'Leave a comment'}).length,1)
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})
test('activity modes and detail chips retain drafts while hiding quick-stop extras',async()=>{
 let renderer
 function Editor(){const [form,setForm]=React.useState({title:'Lunch',time:'13:00',icon:'dining',notes:'Keep this',links:['https://example.com'],attendance_required:true});return React.createElement(Fields,{form,setForm})}
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(Editor))})
  await click(button(renderer,b=>String(b.props.children).startsWith('Notes')))
  assert.equal(renderer.root.findByType('textarea').props.value,'Keep this')
  await click(button(renderer,b=>b.props.children==='Quick stop'))
  assert.equal(renderer.root.findAllByType('textarea').length,0)
  assert.equal(count(renderer,'editor-guests'),0)
  await click(button(renderer,b=>b.props.children==='Full activity'))
  assert.equal(renderer.root.findByType('textarea').props.value,'Keep this')
  assert.equal(renderer.root.findAllByType('input').find(n=>n.props.type==='url').props.value,'https://example.com')
  assert.equal(renderer.root.findAllByType('input').filter(n=>n.props.type==='checkbox')[1].props.checked,true)
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})
test('icon picker has all categories, selects one and closes',async()=>{
 let renderer,selected
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(ActivityIconPicker,{value:'',onChange:v=>{selected=v}}))})
  await click(button(renderer,b=>hasClass(b,'activity-icon-trigger')))
  const group=renderer.root.findByProps({'aria-label':'Choose an activity icon'})
  assert.equal(group.findAllByType('button').length,15)
  const train=group.findAllByType('button').find(b=>b.findAllByType('span').some(s=>s.props.children==='Train / metro'))
  await act(async()=>train.props.onClick({currentTarget:{closest:()=>({querySelector:()=>({focus(){}})})}}))
  assert.equal(selected,'train')
  assert.equal(count(renderer,'activity-icon-options'),0)
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})

test('minor stops show only the title and stacked time without social controls',async()=>{
 let renderer
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PublicSlot,{slot:{id:'metro',title:'Metro to museum',minor_stop:true,time:'13:30',location_text:'Station',notes:'Some notes',links:['https://example.com'],attendance_required:true,splitting_payments:true,comments:[{id:'c',name:'Sarah',body:'Hello'}]},visitor:'Sarah',refresh(){}}))})
  assert.equal(renderer.root.findAllByType('button').length,0)
  assert.equal(renderer.root.findAllByType('a').length,0)
  assert.equal(renderer.root.findByType('h2').props.children,'Metro to museum')
  assert.equal(count(renderer,'timeline-clock'),1)
  assert.equal(renderer.root.findAll(n=>hasClass(n,'timeline-clock'))[0].props.children,'1:30')
  assert.equal(renderer.root.findAll(n=>hasClass(n,'timeline-period'))[0].props.children,'PM')
  assert.equal(count(renderer,'comments'),0)
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})

test('empty payments hide split/share details and include a non-attending payer by default',async()=>{
 const previous=globalThis.document;globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
 let renderer,payload
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PaymentSheet,{slot:{payments:[],attendance:[]},plan:{guests:[{id:'sarah',name:'Sarah'}],days:[]},visitor:'Sarah',theme:'blue',refresh(){},onClose(){},api:async(path,options)=>{payload=JSON.parse(options.body);return {trip:{}}}}),{createNodeMock:()=>({showModal(){}})})})
  assert.equal(count(renderer,'sheet-share'),0);assert.equal(count(renderer,'sheet-split-row'),0)
  assert.equal(count(renderer,'sheet-empty'),1)
  assert.ok(renderer.root.findByType('dialog').props.className.includes('is-empty'))
  await click(button(renderer,b=>b.props.children==='+ Add expense'))
  await act(async()=>renderer.root.findByProps({'aria-label':'Amount'}).props.onChange({target:{value:'25'}}))
  await act(async()=>renderer.root.findByType('form').props.onSubmit({preventDefault(){}}))
  assert.deepEqual(payload.split.shares,[{name:'Sarah',person_id:'sarah',cents:2500}])
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.document=previous}
})
test('RSVP closes on successful save but remains open on failure',async()=>{
 const previous=globalThis.document;globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
 let renderer,success=false,closed=0
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(RsvpSheet,{slot:{attendance:[]},visitor:'Sarah',onClose(){closed++},onSave:async()=>success}),{createNodeMock:()=>({showModal(){}})})})
  await click(button(renderer,b=>b.props.children==='Save RSVP'));assert.equal(closed,0)
  success=true;await click(button(renderer,b=>b.props.children==='Save RSVP'));assert.equal(closed,1)
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.document=previous}
})
test('time input accepts arbitrary minutes with separate period and 24 half-hour options',async()=>{
 let renderer,value,validity
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(ActivityTime,{value:'13:15',onChange:v=>{value=v}}))})
  assert.equal(renderer.root.findByType('input').props.value,'1:15')
  await act(async()=>renderer.root.findByType('input').props.onChange({target:{value:'9:45',setCustomValidity:v=>{validity=v}}}))
  assert.equal(value,'21:45');assert.equal(validity,'')
  await click(button(renderer,b=>b.props.children==='AM'));assert.equal(value,'09:45')
  await click(button(renderer,b=>b.props['aria-label']==='Choose activity time'))
  const options=renderer.root.findByProps({'aria-label':'Half-hour times'}).findAllByType('button')
  assert.equal(options.length,24);assert.ok(options.every(b=>/^\d{1,2}:(00|30)$/.test(b.props.children)))
  await act(async()=>renderer.root.findByType('input').props.onChange({target:{value:'13:99',setCustomValidity:v=>{validity=v}}}));assert.ok(validity);assert.equal(value,'09:45')
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})

test('expense UI custom split validates totals and sends saved per-person shares',async()=>{
 const previous=globalThis.document;globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
 let renderer,payload
 const activity={id:'dinner',attendance:[{name:'A',status:'going'},{name:'B',status:'going'}],payments:[]}
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PaymentSheet,{slot:activity,visitor:'A',theme:'blue',trip:'test',day:'a',refresh(){},onClose(){},api:async(path,options)=>{payload=JSON.parse(options.body);return {trip:{}}}}),{createNodeMock:()=>({showModal(){},focus(){}})})})
  await click(button(renderer,b=>b.props.children==='+ Add expense'))
  await act(async()=>renderer.root.findByProps({'aria-label':'Amount'}).props.onChange({target:{value:'100'}}))
  await click(button(renderer,b=>hasClass(b,'sheet-split-select')))
  await click(button(renderer,b=>b.props.children==='Custom amounts'))
  await act(async()=>renderer.root.findByProps({'aria-label':'Their share: A'}).props.onChange({target:{value:'70'}}))
  assert.equal(button(renderer,b=>b.props.type==='submit').props.disabled,true)
  await act(async()=>renderer.root.findByProps({'aria-label':'Their share: B'}).props.onChange({target:{value:'30'}}))
  assert.equal(button(renderer,b=>b.props.type==='submit').props.disabled,false)
  await act(async()=>renderer.root.findByType('form').props.onSubmit({preventDefault(){}}))
  assert.deepEqual(payload.split,{mode:'custom',shares:[{name:'A',person_id:'person:a',cents:7000},{name:'B',person_id:'person:b',cents:3000}]})
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.document=previous}
})

test('background refresh keeps the selected day and unsent comment draft',async()=>{
 const originals={fetch:globalThis.fetch,localStorage:globalThis.localStorage,window:globalThis.window,document:globalThis.document,ResizeObserver:globalThis.ResizeObserver}
 let current={...structuredClone(trip),guests:[{id:'sarah',name:'Sarah'}]},renderer
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
  current=structuredClone(current);current.description='A weekend together.\nBring a jacket.';current.days[1].timeslots[0].comments.push({id:'new-comment',name:'Friend',body:'Hello'})
  await act(async()=>{globalThis.window.dispatchEvent(new Event('focus'))})
  assert.equal(renderer.root.findByProps({'aria-label':'Leave a comment'}).props.value,'Still typing')
  assert.equal(renderer.root.findAll(node=>hasClass(node,'agenda'))[0].props['aria-label'],'Day B')
  assert.equal(renderer.root.findAll(node=>hasClass(node,'comment-author')).length,1)
  assert.equal(renderer.root.findByProps({className:'plan-description'}).props.children,current.description)
  current={...current,description:''}
  await act(async()=>{globalThis.window.dispatchEvent(new Event('focus'))})
  assert.equal(count(renderer,'plan-description'),0)
 }finally{if(renderer)await act(async()=>renderer.unmount());Object.assign(globalThis,originals)}
})

test('account-opened editor offers and copies the authorized private edit link',async()=>{
 const originals={fetch:globalThis.fetch,location:globalThis.location,ResizeObserver:globalThis.ResizeObserver},nav=Object.getOwnPropertyDescriptor(globalThis,'navigator')
 let renderer,copied,descriptionPayload
 globalThis.fetch=async(_url,options)=>{if(options?.method==='PUT')descriptionPayload=JSON.parse(options.body);return {ok:true,json:async()=>({trip:{...trip,...descriptionPayload},editToken:'private-test-token'})}}
 globalThis.location={origin:'https://planr.test'}
 globalThis.ResizeObserver=class{observe(){} disconnect(){}}
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>{copied=value}}}})
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(Edit,{id:'test'}),{createNodeMock:()=>({querySelectorAll:()=>[]})})})
  await click(button(renderer,b=>b.props.children==='Copy edit link'))
  assert.equal(copied,'https://planr.test/edit/test/private-test-token')
  await click(button(renderer,b=>b.props.children==='Copy view link'))
  assert.equal(copied,'https://planr.test/trip/test')
  await act(async()=>renderer.root.findByProps({id:'plan-description'}).props.onChange({target:{value:'Our weekend plans'}}))
  await act(async()=>renderer.root.findByProps({className:'plan-description-editor'}).props.onSubmit({preventDefault(){}}))
  assert.deepEqual(descriptionPayload,{description:'Our weekend plans'})
  assert.equal(renderer.root.findByProps({id:'plan-description'}).props.value,'Our weekend plans')
  await act(async()=>renderer.root.findByProps({id:'plan-description'}).props.onChange({target:{value:''}}))
  await act(async()=>renderer.root.findByProps({className:'plan-description-editor'}).props.onSubmit({preventDefault(){}}))
  assert.deepEqual(descriptionPayload,{description:''})
 }finally{
  if(renderer)await act(async()=>renderer.unmount())
  Object.assign(globalThis,originals)
  if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator
 }
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
      assert.equal(count(renderer,'day-payment-summary'),1,'one balance summary only')
      assert.equal(count(renderer,'agenda'),1,'one agenda only')
      assert.equal(count(renderer,'public-slot'),day.timeslots.length,'only current activities')
      assert.equal(count(renderer,'liquid-days'),1,'one day selector')
      assert.equal(renderer.root.findAllByType('dialog').length,0,'no previous-day windows')
      assert.equal(count(renderer,'comments'),0,'no previous-day comments')
      if(day.timeslots.length){
        await click(button(renderer,b=>hasClass(b,'day-payment-toggle')))
        assert.equal(count(renderer,'preview-sheet'),1)
        await click(button(renderer,b=>hasClass(b,'preview-sheet-done')))
        await act(async()=>new Promise(resolve=>setTimeout(resolve,200)))
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
 let stored='',current=structuredClone(trip)
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/guests')){const guest={id:'sarah',name:JSON.parse(options.body).name};current={...current,guests:[guest]};return {ok:true,json:async()=>({trip:current,guest})}}return {ok:true,json:async()=>({trip:current})}}
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
   await act(async()=>renderer.root.findByType('select').props.onChange({target:{value:'new'}}))
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

test('new expenses include the entire roster; existing splits retain exclusions when edited',async()=>{
 const previous=globalThis.document;globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
 const guests=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],activity={id:'dinner',payments:[{id:'old',paid_by:'A',paid_by_id:'a',amount:'10',split:{mode:'equal',shares:[{person_id:'a',name:'A',cents:500},{person_id:'b',name:'B',cents:500}]}}]}
 let renderer
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PaymentSheet,{slot:activity,plan:{guests,days:[]},visitor:'A',refresh(){},onClose(){}}),{createNodeMock:()=>({showModal(){}})})})
  await click(button(renderer,b=>b.props.children==='+ Add expense'))
  await click(button(renderer,b=>hasClass(b,'sheet-split-select')))
  assert.deepEqual(renderer.root.findAllByProps({type:'checkbox'}).map(x=>x.props.checked),[true,true,true])
  await click(button(renderer,b=>b.props.children==='Clear all'))
  assert.deepEqual(renderer.root.findAllByProps({type:'checkbox'}).map(x=>x.props.checked),[false,false,false])
  await click(button(renderer,b=>b.props.children==='Select all'))
  assert.deepEqual(renderer.root.findAllByProps({type:'checkbox'}).map(x=>x.props.checked),[true,true,true])
  await click(button(renderer,b=>b.props.children==='‹ Back'))
  await click(button(renderer,b=>b.props.children==='Edit'))
  await click(button(renderer,b=>hasClass(b,'sheet-split-select')))
  assert.deepEqual(renderer.root.findAllByProps({type:'checkbox'}).map(x=>x.props.checked),[true,true,false])
  assert.equal(renderer.root.findByProps({'aria-label':'Paid by'}).findAllByType('option').length,4)
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.document=previous}
})
test('balance scope switches between day and entire trip and works on an empty day',async()=>{
 const plan={guests:[{id:'a',name:'A'},{id:'b',name:'B'}],days:[{id:'one',label:'Friday',timeslots:[{payments:[{paid_by:'A',amount:'30',split:{mode:'equal',shares:[{name:'B',cents:3000}]}}]}]},{id:'empty',label:'Saturday',timeslots:[]}]}
 let renderer
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(DayPaymentSummary,{day:plan.days[1],plan,visitor:'B'}))})
  await click(button(renderer,b=>hasClass(b,'day-payment-toggle')))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('No expenses for this day yet.'))
  await click(button(renderer,b=>b.props.children==='Entire trip'))
  const banner=renderer.root.findAll(n=>hasClass(n,'balance-banner'))[0]
  assert.equal(banner.findByType('strong').props.children,'$30.00')
  await click(button(renderer,b=>b.props['aria-label']==='This day'))
  assert.ok(JSON.stringify(renderer.toJSON()).includes('No expenses for this day yet.'))
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})

test('editing only an expense note preserves who owes the odd rounding cent',async()=>{
 const previous=globalThis.document;globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
 const shares=[{person_id:'b',name:'B',cents:501},{person_id:'a',name:'A',cents:500}]
 const activity={id:'dinner',payments:[{id:'old',paid_by:'A',paid_by_id:'a',amount:'10.01',note:'Dinner',split:{mode:'equal',shares}}]}
 let renderer,payload
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PaymentSheet,{slot:activity,plan:{guests:[{id:'a',name:'A'},{id:'b',name:'B'}],days:[]},visitor:'A',trip:'test',day:'a',refresh(){},onClose(){},api:async(path,options)=>{payload=JSON.parse(options.body);return {trip:{}}}}),{createNodeMock:()=>({showModal(){}})})})
  await click(button(renderer,b=>b.props.children==='Edit'))
  await act(async()=>renderer.root.findByProps({placeholder:'Dinner, tickets, gas'}).props.onChange({target:{value:'Dinner and tip'}}))
  await act(async()=>renderer.root.findByType('form').props.onSubmit({preventDefault(){}}))
  assert.equal(payload.note,'Dinner and tip')
  assert.deepEqual(payload.split.shares,shares)
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.document=previous}
})

test('pasted invalid amounts are never silently converted into different payable amounts',async()=>{
 const previous=globalThis.document;globalThis.document={activeElement:{focus(){}},body:{style:{overflow:''}}}
 let renderer
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(PaymentSheet,{slot:{payments:[]},plan:{guests:[{id:'a',name:'A'}],days:[]},visitor:'A',refresh(){},onClose(){}}),{createNodeMock:()=>({showModal(){}})})})
  await click(button(renderer,b=>b.props.children==='+ Add expense'))
  for(const value of ['-10','1e3','12abc','1.001']){
   await act(async()=>renderer.root.findByProps({'aria-label':'Amount'}).props.onChange({target:{value}}))
   assert.equal(renderer.root.findByProps({'aria-label':'Amount'}).props.value,value)
   assert.equal(button(renderer,b=>b.props.type==='submit').props.disabled,true)
  }
  await act(async()=>renderer.root.findByProps({'aria-label':'Amount'}).props.onChange({target:{value:'10.01'}}))
  assert.equal(button(renderer,b=>b.props.type==='submit').props.disabled,false)
 }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.document=previous}
})

test('trip repayment checkboxes update net spent and undo restores it',async()=>{
 const {recordRepayment,undoRepayment}=await import('./trip-finances.js')
 const initial={id:'test',guests:[{id:'a',name:'A'},{id:'b',name:'B'}],days:[{id:'one',label:'Friday',timeslots:[{title:'Dinner',payments:[{paid_by:'A',paid_by_id:'a',amount:'20',split:{mode:'equal',shares:[{name:'A',person_id:'a',cents:1000},{name:'B',person_id:'b',cents:1000}]}}]}]}]}
 let renderer,current=structuredClone(initial),calls=0
 const apiClient=async(path,options)=>{calls++;const body=JSON.parse(options.body);if(path.endsWith('/undo'))undoRepayment(current,path.split('/').at(-2),body.recorded_by);else recordRepayment(current,body);return {trip:structuredClone(current)}}
 function Preview(){const [plan,setPlan]=React.useState(initial);return React.createElement(DayPaymentSummary,{day:plan.days[0],plan,visitor:'B',apiClient,refresh:setPlan})}
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(Preview))})
  await click(button(renderer,b=>hasClass(b,'day-payment-toggle')))
  await click(button(renderer,b=>b.props.children==='Entire trip'))
  const mark=renderer.root.findAllByType('input').find(n=>n.props['aria-label']?.startsWith('Mark paid:'))
  const rowsBefore=renderer.root.findAll(n=>hasClass(n,'balance-transfer')).map(n=>n.findAll(n=>hasClass(n,'balance-transfer-name'))[0].props.children)
  assert.equal(mark.props.checked,false)
  await act(async()=>mark.props.onChange())
  assert.equal(calls,1)
  assert.deepEqual(renderer.root.findAll(n=>hasClass(n,'balance-transfer')).map(n=>n.findAll(n=>hasClass(n,'balance-transfer-name'))[0].props.children),rowsBefore)
  assert.equal(renderer.root.findAllByType('h3').some(n=>n.props.children==='Paid'),false)
  assert.equal(renderer.root.findAllByType('input').find(n=>n.props['aria-label']?.startsWith('Undo paid:')).props.checked,true)
  assert.equal(renderer.root.findAll(n=>hasClass(n,'balance-banner'))[0].findByType('strong').props.children,'$0.00')
  assert.equal(renderer.root.findAllByType('input').filter(n=>n.props['aria-label']?.startsWith('Mark paid:')).length,0)
  await click(button(renderer,b=>hasClass(b,'balance-total-row')))
  const people=renderer.root.findAll(n=>hasClass(n,'person-spending'))
  assert.equal(people[0].findByType('strong').props.children,'$10.00')
  assert.equal(people[1].findByType('strong').props.children,'$10.00')
  assert.equal(renderer.root.findAllByType('dl').length,0)
  await click(button(renderer,b=>hasClass(b,'preview-sheet-back')))
  const undo=renderer.root.findAllByType('input').find(n=>n.props['aria-label']?.startsWith('Undo paid:'))
  assert.equal(undo.props.checked,true)
  await act(async()=>undo.props.onChange())
  assert.equal(calls,2)
  await click(button(renderer,b=>hasClass(b,'balance-total-row')))
  assert.equal(renderer.root.findAll(n=>hasClass(n,'person-spending'))[0].findByType('strong').props.children,'$20.00')
  assert.equal(renderer.root.findAll(n=>hasClass(n,'balance-banner'))[0].findByType('strong').props.children,'$10.00')
  assert.equal(renderer.root.findAllByType('input').filter(n=>n.props['aria-label']?.startsWith('Undo paid:')).length,0)
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})

test('paid trip rows remain in their original groups and order through check and undo',async()=>{
 const {recordRepayment,undoRepayment}=await import('./trip-finances.js')
 const guests=['A','B','C','D'].map(name=>({id:name.toLowerCase(),name}))
 let current={id:'stable',guests,days:[{id:'one',label:'Friday',timeslots:[{payments:[{paid_by:'A',paid_by_id:'a',amount:'100',split:{mode:'equal',shares:guests.map(g=>({name:g.name,person_id:g.id,cents:2500}))}}]}]}]},renderer
 function Host(){const [plan,setPlan]=React.useState(current);return React.createElement(DayPaymentSummary,{day:plan.days[0],plan,visitor:'B',refresh:setPlan,apiClient:async(path,options)=>{const body=JSON.parse(options.body);if(path.endsWith('/undo'))undoRepayment(current,path.split('/').at(-2),body.recorded_by);else recordRepayment(current,body);return {trip:structuredClone(current)}}})}
 const layout=()=>renderer.root.findAll(n=>hasClass(n,'balance-group')).map(group=>({title:group.findByType('h3').props.children,rows:group.findAllByType('input').map(n=>n.props['aria-label'].replace(/^(Mark paid|Undo paid): /,''))}))
 try{
  await act(async()=>{renderer=TestRenderer.create(React.createElement(Host))})
  await click(button(renderer,b=>hasClass(b,'day-payment-toggle')))
  await click(button(renderer,b=>b.props.children==='Entire trip'))
  const before=layout()
  assert.deepEqual(before.map(g=>g.title),['You owe','Between others','Spending'])
  for(const from of ['B','C','D']){
   const input=renderer.root.findByProps({'aria-label':`Mark paid: ${from} to A, $25.00`})
   await act(async()=>input.props.onChange())
   assert.equal(renderer.root.findByProps({'aria-label':`Undo paid: ${from} to A, $25.00`}).props.checked,true)
   assert.deepEqual(layout(),before)
  }
  for(const from of ['C','B','D']){
   await act(async()=>renderer.root.findByProps({'aria-label':`Undo paid: ${from} to A, $25.00`}).props.onChange())
   assert.deepEqual(layout(),before)
  }
 }finally{if(renderer)await act(async()=>renderer.unmount())}
})
