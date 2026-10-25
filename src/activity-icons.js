export const activityIcons=[
 {id:'dining',label:'Dining'}, {id:'shopping',label:'Shopping'},
 {id:'movies',label:'Movies'}, {id:'drinks',label:'Drinks'},
 {id:'car',label:'Car / Uber'}, {id:'train',label:'Train / metro'},
 {id:'plane',label:'Flight'}, {id:'running',label:'Running'}, {id:'bed',label:'Sleep'}
]
export const normalizeActivityIcon=value=>activityIcons.some(icon=>icon.id===value)?value:''
