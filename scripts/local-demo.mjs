import {mkdirSync,existsSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {spawn} from 'node:child_process'
const file=resolve('data/local-demo.json')
mkdirSync(resolve('data'),{recursive:true})
if(!existsSync(file)){
 const activity=(id,title,time,payments=[])=>({id,title,time,order:0,icon:'dining',attendance_required:true,splitting_payments:true,attendance:[],comments:[],payments})
 const trip={id:'local-preview',title:'Weekend with friends',description:'A local sandbox for trying the shared guest list and trip balances.',theme:'blue',edit_token:'local-preview-edit',created_at:new Date().toISOString(),guests:[{id:'philip',name:'Philip'},{id:'yumin',name:'Yumin Park'},{id:'bonnie',name:'Bonnie'}],days:[
  {id:'friday',date:'2026-10-30',label:'Friday',order:0,timeslots:[activity('dinner','Dinner','19:00',[{id:'dinner-payment',paid_by:'Philip',paid_by_id:'philip',amount:'90',note:'Dinner',split:{mode:'equal',shares:[{name:'Philip',person_id:'philip',cents:3000},{name:'Yumin Park',person_id:'yumin',cents:3000},{name:'Bonnie',person_id:'bonnie',cents:3000}]}}]),{...activity('dessert','Dessert','21:00'),order:1,icon:'dessert'}]},
  {id:'saturday',date:'2026-10-31',label:'Saturday',order:1,timeslots:[activity('brunch','Brunch','11:00',[{id:'brunch-payment',paid_by:'Yumin Park',paid_by_id:'yumin',amount:'60',note:'Brunch',split:{mode:'equal',shares:[{name:'Philip',person_id:'philip',cents:2000},{name:'Yumin Park',person_id:'yumin',cents:2000},{name:'Bonnie',person_id:'bonnie',cents:2000}]}}])]},
  {id:'sunday',date:'2026-11-01',label:'Sunday',order:2,timeslots:[activity('coffee','Coffee','10:00')]}
 ]}
 writeFileSync(file,JSON.stringify({trips:[trip]},null,2))
}
// Isolated storage and ports: this command never connects to the production database.
const env={...process.env,SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:'',VITE_API_URL:'/api',PLANR_DATA_FILE:file,PORT:'3002',PLANR_API_TARGET:'http://127.0.0.1:3002',CHOKIDAR_USEPOLLING:'true'}
const children=[spawn(process.execPath,['server/index.js'],{env,stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{env,stdio:'inherit'})]
let stopping=false
const stop=()=>{if(stopping)return;stopping=true;children.forEach(c=>c.kill('SIGTERM'))}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
children.forEach(c=>c.on('exit',code=>{stop();if(code)process.exitCode=code}))
console.log('\nLocal preview: http://127.0.0.1:5174/trip/local-preview\nEdit sample: http://127.0.0.1:5174/edit/local-preview/local-preview-edit\n')
