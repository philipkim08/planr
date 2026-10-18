export function readVisitorName(){
  try{return (localStorage.getItem('planr-visitor-name')||'').trim()}catch{return ''}
}
export function rememberVisitorName(name){
  try{localStorage.setItem('planr-visitor-name',name.trim())}catch{/* The visit still works if browser storage is unavailable. */}
}
