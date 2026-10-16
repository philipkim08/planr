import React, { useEffect, useState } from 'react'

const normalize = name => name.trim().toLowerCase()
function Username({ value, onChange }) {
  return <label>Username<input required autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={value} onChange={e=>onChange(e.target.value)} /><small>3–24 letters, numbers, or underscores. Not case sensitive.</small></label>
}
function Password({ value, onChange, current=false }) {
  return <label>{current?'Password':'New password'}<input required type="password" minLength={current?1:8} maxLength={1024} autoComplete={current?'current-password':'new-password'} value={value} onChange={e=>onChange(e.target.value)}/>{!current&&<small>Use at least 8 characters.</small>}</label>
}
export function SignIn({ auth, api }) {
  const [mode,setMode]=useState('login'),[username,setUsername]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const switchMode=next=>{setMode(next);setError('');setMessage('');setPassword('')}
  const submit=async e=>{
    e.preventDefault();setError('');setMessage('');setBusy(true)
    try {
      if(!auth)throw new Error('Account sign-in is not configured yet.')
      if(mode==='login'){
        const tokens=await api('/auth/password',{method:'POST',body:JSON.stringify({username:normalize(username),password})})
        const result=await auth.auth.setSession(tokens)
        if(result.error)throw result.error
      }else if(mode==='signup'){
        const result=await auth.auth.signUp({email:email.trim(),password,options:{data:{username:normalize(username)},emailRedirectTo:`${location.origin}/plans`}})
        if(result.error)throw new Error(result.error.message.includes('Database error')?'Could not create this account. The username may already be taken; try another, or sign in if you have an account.':result.error.message)
        setMessage('Check your email to confirm your account. After confirmation, sign in with your username and password.')
      }else if(mode==='reset'){
        const result=await auth.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/reset-password`})
        if(result.error)throw result.error
        setMessage('If an account uses that email, you’ll receive a password-reset link.')
      }else{
        const result=await auth.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:`${location.origin}/plans`}})
        if(result.error)throw result.error
        setMessage('Check your email for a sign-in link. Then open Account settings to choose your username and password.')
      }
      setPassword('')
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="account-card account-form"><h1>{({login:'Welcome back',signup:'Join planr',reset:'Reset password',magic:'Email sign-in'})[mode]}</h1><p>{mode==='signup'?'Save your plans with a username and password. Friends can still view shared plans without an account.':mode==='login'?'Sign in to your saved plans.':mode==='reset'?'Enter the email you used to create your account.':'Already have an account? Use your existing email to get back in.'}</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      {(mode==='login'||mode==='signup')&&<Username value={username} onChange={setUsername}/>}
      {mode!=='login'&&<label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
      {(mode==='login'||mode==='signup')&&<Password value={password} onChange={setPassword} current={mode==='login'}/>}
      {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="saved" role="status">{message}</p>}
      <button className="primary">{busy?'Please wait…':({login:'Sign in',signup:'Create account',reset:'Send reset link',magic:'Email me a sign-in link'})[mode]}</button>
    </fieldset></form>
    <div className="auth-options">{mode==='login'?<><button disabled={busy} onClick={()=>switchMode('signup')}>Create an account</button><button disabled={busy} onClick={()=>switchMode('reset')}>Forgot password?</button><button disabled={busy} onClick={()=>switchMode('magic')}>Use an email link / set up an existing account</button></>:<button disabled={busy} onClick={()=>switchMode('login')}>Back to sign in</button>}</div>
  </section>
}

export function AccountSettings({ auth, api }) {
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  useEffect(()=>{let live=true;api('/me/username').then(data=>{if(live){setUsername(data.username);setLoaded(true)}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[])
  const save=async e=>{
    e.preventDefault();setBusy(true);setError('');setMessage('')
    let saved=false
    try{
      const result=await api('/me/username',{method:'PUT',body:JSON.stringify({username:normalize(username)})})
      saved=true;setUsername(result.username)
      const {error}=await auth.auth.updateUser({password})
      if(error)throw error
      setPassword('');setMessage('Saved. You can now sign in with your username and password.')
    }catch(e){setError(`${saved?'Username saved, but the password was not changed. ':''}${e.message}`)}finally{setBusy(false)}
  }
  return <details className="account-settings"><summary>Account settings · username & password</summary><p>Already using email links? Set your username and password here. Your saved plans stay with this account.</p>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="saved" role="status">{message}</p>}<form onSubmit={save}><fieldset disabled={busy||!loaded}><Username value={username} onChange={setUsername}/><Password value={password} onChange={setPassword}/><button className="primary">{busy?'Saving…':'Save username & password'}</button></fieldset></form></details>
}

export function PasswordReset({ auth }) {
  const [ready,setReady]=useState(false),[signedIn,setSignedIn]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false)
  useEffect(()=>{
    if(!auth){setReady(true);return}
    const {data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{setSignedIn(!!session);setReady(true)})
    auth.auth.getSession().then(({data,error})=>{setSignedIn(!!data.session);setReady(true);if(error)setError(error.message)})
    return()=>subscription.unsubscribe()
  },[])
  const save=async e=>{e.preventDefault();setError('');if(password!==confirm)return setError('The passwords do not match.');setBusy(true);try{const{error}=await auth.auth.updateUser({password});if(error)throw error;setPassword('');setConfirm('');setDone(true)}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <main className="account-page"><a className="logo" href="/">planr</a><section className="account-card account-form"><h1>Reset password</h1>{!ready?<p>Checking your link…</p>:done?<><p className="saved">Password updated.</p><a href="/plans">Go to My Plans →</a></>:!signedIn?<p>This link has expired or is invalid. <a href="/plans">Return to sign in</a> and choose “Forgot password?” to request another.</p>:<form onSubmit={save}><fieldset disabled={busy}><Password value={password} onChange={setPassword}/><label>Confirm password<input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary">{busy?'Saving…':'Update password'}</button></fieldset></form>}</section></main>
}
