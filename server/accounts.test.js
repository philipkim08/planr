import test from 'node:test'
import assert from 'node:assert/strict'
import { registerAccounts } from './accounts.js'

function fixture({ user=null, profile={user_id:'owner'}, conflict=false, badPassword=false }={}) {
  const routes=new Map(), calls=[]
  const sb={
    from(table){
      calls.push(['table',table])
      return {
        select(){return {eq(key,value){calls.push(['lookup',key,value]);return {maybeSingle:async()=>({data:profile,error:null})}}}},
        async upsert(values,options){calls.push(['upsert',values,options]);return {error:conflict?{code:'23505'}:null}}
      }
    },
    auth:{admin:{getUserById:async id=>{calls.push(['authUser',id]);return {data:{user:{email:'private@example.com'}}}}}}
  }
  const app=Object.fromEntries(['post','get','put'].map(method=>[method,(path,fn)=>routes.set(`${method} ${path}`,fn)]))
  registerAccounts(app,{sb,authUser:async()=>user,wrap:fn=>fn,makeClient:(_url,_key,options)=>{
    assert.equal(options.auth.persistSession,false)
    return {auth:{signInWithPassword:async credentials=>{
      calls.push(['passwordLogin',credentials])
      return badPassword?{error:new Error('bad password')}:{data:{session:{access_token:'access',refresh_token:'refresh',user:{email:'private@example.com'}}}}
    }}}
  }})
  const run=async(method,path,body={})=>{
    const result={status:200,headers:{}}
    const res={set(k,v){result.headers[k]=v;return res},status(n){result.status=n;return res},json(value){result.body=value;return res}}
    await routes.get(`${method} ${path}`)({body,ip:'127.0.0.1'},res)
    return result
  }
  return {run,calls}
}
test('login normalizes username, uses isolated password verification, and returns only tokens',async()=>{
  const {run,calls}=fixture()
  const result=await run('post','/api/auth/password',{username:' JaKe ',password:'example-password'})
  assert.deepEqual(result.body,{access_token:'access',refresh_token:'refresh'})
  assert.equal(result.headers['Cache-Control'],'no-store')
  assert.ok(calls.some(c=>c[0]==='lookup'&&c[2]==='jake'))
  assert.ok(calls.some(c=>c[0]==='passwordLogin'&&c[1].email==='private@example.com'))
})
test('unknown users and wrong passwords have the same public error',async()=>{
  const unknown=await fixture({profile:null}).run('post','/api/auth/password',{username:'jake',password:'wrong'})
  const wrong=await fixture({badPassword:true}).run('post','/api/auth/password',{username:'jake',password:'wrong'})
  assert.equal(unknown.status,401);assert.deepEqual(unknown.body,wrong.body)
})
test('username changes require sign-in and use the authenticated user, not a supplied id',async()=>{
  const unauth=fixture()
  assert.equal((await unauth.run('put','/api/me/username',{username:'jake'})).status,401)
  assert.equal(unauth.calls.length,0)
  const {run,calls}=fixture({user:{id:'actual-owner'}})
  await run('put','/api/me/username',{username:' JaKe ',user_id:'someone-else'})
  assert.deepEqual(calls.find(c=>c[0]==='upsert')[1],{user_id:'actual-owner',username:'jake'})
})
test('duplicate and invalid usernames are rejected',async()=>{
  assert.equal((await fixture({user:{id:'owner'},conflict:true}).run('put','/api/me/username',{username:'jake'})).status,409)
  assert.equal((await fixture({user:{id:'owner'}}).run('put','/api/me/username',{username:'not valid!'})).status,400)
})
test('repeated password attempts are limited',async()=>{
  const {run}=fixture({profile:null})
  for(let i=0;i<15;i++)assert.equal((await run('post','/api/auth/password',{username:'jake',password:'wrong'})).status,401)
  assert.equal((await run('post','/api/auth/password',{username:'jake',password:'wrong'})).status,429)
})
