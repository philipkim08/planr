export function outOfOrder(slots) {
  let latest=-1
  const warnings=new Set()
  for(const slot of [...slots].sort((a,b)=>a.order-b.order)){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time||''))continue
    const [h,m]=slot.time.split(':').map(Number)
    const minutes=h*60+m+(slot.next_day?1440:0)
    if(minutes<latest)warnings.add(slot.id)
    latest=Math.max(latest,minutes)
  }
  return warnings
}
export function splitPeople(slot) {
  const saved=slot.payment_participants||[]
  const names=saved.length||slot.payment_participants_configured?saved:(slot.attendance||[]).filter(r=>r.status==='going').map(r=>r.name)
  const seen=new Set()
  return names.map(name=>String(name).trim()).filter(name=>{const key=name.toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true})
}
