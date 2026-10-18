import React,{useEffect,useRef,useState} from 'react'

export function ActivityWindow({title,initial,save,remove,onClose,renderFields}){
  const dialog=useRef(null),closeTimer=useRef(null),[form,setForm]=useState(()=>({...initial,links:initial.links?.length?[...initial.links]:['']})),[busy,setBusy]=useState(false),[error,setError]=useState(''),[closing,setClosing]=useState(false)
  useEffect(()=>{
    const focus=document.activeElement,overflow=document.body.style.overflow
    document.body.style.overflow='hidden';dialog.current.showModal()
    return()=>{clearTimeout(closeTimer.current);document.body.style.overflow=overflow;focus?.focus()}
  },[])
  const close=()=>{
    if(busy||closing)return
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){onClose();return}
    setClosing(true);closeTimer.current=setTimeout(onClose,180)
  }
  const submit=async event=>{
    event.preventDefault();if(busy)return
    setBusy(true);setError('')
    try{if(await save(form))onClose();else setError('Could not save this activity. Your changes are still here—please try again.')}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const deleteActivity=async()=>{
    if(busy)return
    setBusy(true);setError('')
    try{const result=await remove();if(result)onClose();else if(result===null)setError('Could not delete the activity. Please try again.')}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <dialog className={`activity-window ${closing?'is-closing':''}`} ref={dialog} aria-labelledby="activity-window-title" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}}>
    <div className="activity-window-content">
      <div className="activity-window-handle" aria-hidden="true"/>
      <header><div><span>YOUR ITINERARY</span><h2 id="activity-window-title">{title}</h2></div><button type="button" className="window-close" aria-label="Close activity editor" disabled={busy} onClick={close}>×</button></header>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>{renderFields(form,setForm)}</fieldset>
        {error&&<p className="window-error" role="alert">{error}</p>}
        <div className="window-actions"><button type="submit" className="window-save" disabled={busy}>{busy?'Saving…':remove?'Save changes':'Add activity'}</button><button type="button" className="window-cancel" disabled={busy} onClick={close}>Cancel</button></div>
        {remove&&<button type="button" className="window-delete" disabled={busy} onClick={deleteActivity}>Delete activity</button>}
      </form>
    </div>
  </dialog>
}
