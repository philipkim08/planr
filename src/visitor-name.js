import {validGuestId} from './guest-identity.js'
let sessionGuestId
export function readGuestId(){
  try{const saved=localStorage.getItem('planr-guest-id');if(validGuestId(saved))return saved}catch{}
  sessionGuestId ||= globalThis.crypto.randomUUID()
  try{localStorage.setItem('planr-guest-id',sessionGuestId)}catch{}
  return sessionGuestId
}
export function readVisitorName(){
  try{return (localStorage.getItem('planr-visitor-name')||'').trim()}catch{return ''}
}
export function rememberVisitorName(name){
  try{localStorage.setItem('planr-visitor-name',name.trim())}catch{/* The visit still works if browser storage is unavailable. */}
}
