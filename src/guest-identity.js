export const validGuestId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const nameKey=value=>String(value||'').trim().toLowerCase()
// Legacy name-only records can be adopted once; claimed records match by ID only.
export function isGuest(record,id,name){
  return record.guest_id?record.guest_id===id:!!nameKey(name)&&nameKey(record.name)===nameKey(name)
}
export function guestResponse(responses,id,name,personId){
  if(personId)return responses.find(r=>r.person_id===personId)||responses.find(r=>!r.person_id&&nameKey(r.name)===nameKey(name))
  return responses.find(r=>r.guest_id===id)||responses.find(r=>!r.guest_id&&isGuest(r,id,name))
}
export function updateAttendance(responses,id,name,status){
  return [...responses.filter(r=>!isGuest(r,id,name)),{guest_id:id,name:name.trim(),status}]
}
