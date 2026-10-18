// Refresh without remounting the page or discarding local form drafts.
export function watchSharedPlan({load,apply,onError,revision,document:doc=globalThis.document,window:win=globalThis.window,interval=30000}){
  let stopped=false,pending=false
  const refresh=async()=>{
    if(stopped||pending||doc?.visibilityState==='hidden')return
    pending=true
    const version=revision()
    try{const result=await load();if(!stopped&&revision()===version)apply(result)}
    catch(error){if(!stopped)onError(error)}finally{pending=false}
  }
  const visible=()=>{if(doc?.visibilityState!=='hidden')refresh()}
  doc?.addEventListener?.('visibilitychange',visible)
  for(const event of ['focus','pageshow','online'])win?.addEventListener?.(event,visible)
  const timer=setInterval(refresh,interval)
  refresh()
  return()=>{stopped=true;clearInterval(timer);doc?.removeEventListener?.('visibilitychange',visible);for(const event of ['focus','pageshow','online'])win?.removeEventListener?.(event,visible)}
}
