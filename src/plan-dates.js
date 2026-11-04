// ISO dates are stored separately from editable labels for newly created plans.
export function newestPlansFirst(trips) {
  const timestamp=trip=>Number.isFinite(Date.parse(trip.created_at))?Date.parse(trip.created_at):0
  return [...trips].sort((a,b)=>timestamp(b)-timestamp(a))
}
export function calendarDates(start,end) {
  if(!start)return []
  const current=new Date(`${start}T12:00:00`),last=new Date(`${end||start}T12:00:00`),dates=[]
  while(current<=last){
    dates.push(`${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`)
    current.setDate(current.getDate()+1)
  }
  return dates
}
export function planDateRange(days=[]) {
  const iso=days.map(day=>day.date).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')).sort()
  const format=value=>new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})
  if(iso.length)return iso[0]===iso.at(-1)?format(iso[0]):`${format(iso[0])} – ${format(iso.at(-1))}`
  // Old plans contain localized labels only. Do not invent a missing year.
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dates=days.map(day=>{
    const match=String(day.label||'').match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i)
    if(!match)return null
    const month=months.findIndex(m=>m.toLowerCase()===match[1].toLowerCase()),dayNumber=Number(match[2])
    if(dayNumber<1||dayNumber>new Date(2000,month+1,0).getDate())return null
    return {key:month*32+dayNumber,label:`${months[month]} ${dayNumber}`}
  }).filter(Boolean).sort((a,b)=>a.key-b.key)
  if(dates.length)return dates[0].key===dates.at(-1).key?dates[0].label:`${dates[0].label} – ${dates.at(-1).label}`
  const labels=[...days].sort((a,b)=>a.order-b.order).map(day=>day.label).filter(Boolean)
  return labels.length>1?`${labels[0]} – ${labels.at(-1)}`:labels[0]||'Dates not set'
}

export function dayLabel(day) {
  const value=day.date||(/^\d{4}-\d{2}-\d{2}$/.test(day.label||'')?day.label:null)
  if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
    const date=new Date(`${value}T12:00:00`)
    if(!Number.isNaN(date.getTime()))return date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
  }
  return day.label
}
