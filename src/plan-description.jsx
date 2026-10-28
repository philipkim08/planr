import React,{useState} from 'react'
export function PlanDescriptionEditor({value,save}){
 const [draft,setDraft]=useState(value),[saved,setSaved]=useState(value),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const submit=async e=>{
  e.preventDefault();if(busy)return
  setBusy(true);setError('')
  try{if(await save(draft)){setSaved(draft.trim());setDraft(draft.trim())}else setError('Could not save the description. Please try again.')}
  catch{setError('Could not save the description. Please try again.')}
  finally{setBusy(false)}
 }
 return <form className="plan-description-editor" onSubmit={submit}>
  <label htmlFor="plan-description">Description (optional)</label>
  <textarea id="plan-description" rows={3} maxLength={2000} placeholder="Add a description for your guests…" value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)}/>
  {draft!==saved&&<button type="submit" disabled={busy}>{busy?'Saving…':'Save description'}</button>}
  {error&&<small role="alert">{error}</small>}
 </form>
}
