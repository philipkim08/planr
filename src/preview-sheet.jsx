import React,{useEffect,useRef,useState} from 'react'

export function PreviewAvatar({name,small=false,guests=[]}){
 const words=(String(name||'?').trim()||'?').split(/\s+/),initials=(words[0][0]+(words.length>1?words.at(-1)[0]:'')).toUpperCase()
 const guestIndex=guests.findIndex(g=>g.name.trim().toLowerCase()===String(name).trim().toLowerCase())
 const tone=guestIndex>=0?guestIndex%7:[...String(name).trim().toLowerCase()].reduce((sum,c)=>(sum*31+c.charCodeAt(0))>>>0,0)%7
 return <span aria-hidden="true" className={`preview-avatar avatar-tone-${tone}${small?' avatar-small':''}`}>{initials}</span>
}

export function PreviewSheet({title,children,onClose,busy=false,back}){
 const dialog=useRef(null),timer=useRef(null),[closing,setClosing]=useState(false)
 useEffect(()=>{
  if(typeof document==='undefined')return
  const previousFocus=document.activeElement,style=document.body?.style,overflow=style?.overflow
  if(style)style.overflow='hidden'
  dialog.current?.showModal?.()
  return()=>{clearTimeout(timer.current);if(style)style.overflow=overflow;previousFocus?.focus?.()}
 },[])
 const close=()=>{
  if(busy||closing)return
  if(typeof matchMedia==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches){onClose();return}
  setClosing(true);timer.current=setTimeout(onClose,180)
 }
 return <dialog ref={dialog} className={`preview-sheet ${closing?'is-closing':''}`} aria-label={title} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}}>
  <div className="preview-sheet-body">
   <div className="preview-sheet-handle" aria-hidden="true"/>
   <header className="preview-sheet-header">{back?<button type="button" className="preview-sheet-back" onClick={back} disabled={busy}>‹ Balances</button>:<h2>{title}</h2>}<button type="button" className="preview-sheet-done" autoFocus disabled={busy} onClick={close}>Done</button></header>
   <div className="preview-sheet-scroll">{children}</div>
  </div>
 </dialog>
}
