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
export function expenseTotal(slot) {
  return Math.round((slot.payments||[]).reduce((total,payment)=>total+(parseFloat(String(payment.amount||'').replace(/[^0-9.]/g,''))||0),0)*100)/100
}
export function itineraryPeople(days) {
  const seen=new Map()
  for(const day of days||[])for(const slot of day.timeslots||[]){
    const names=[...(slot.payment_participants||[]),...(slot.attendance||[]).map(r=>r.name),...(slot.payments||[]).flatMap(p=>[p.paid_by,...(p.split?.shares||[]).map(r=>r.name)]),...(slot.comments||[]).map(c=>c.name)]
    for(const name of names){
      const display=String(name||'').trim(),key=display.toLowerCase()
      if(key&&!seen.has(key))seen.set(key,display)
    }
  }
  return [...seen.values()].sort((a,b)=>a.localeCompare(b))
}
export function splitPeople(slot) {
  const saved=slot.payment_participants||[]
  const excluded=new Set((slot.payment_excluded_participants||[]).map(name=>name.trim().toLowerCase()))
  const going=(slot.attendance||[]).filter(r=>r.status==='going'&&!excluded.has(r.name.trim().toLowerCase())).map(r=>r.name)
  const names=[...(slot.payment_manual_participants||saved),...going]
  const seen=new Set()
  return names.map(name=>String(name).trim()).filter(name=>{const key=name.toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true})
}
