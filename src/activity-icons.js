export const activityIcons=[
 {id:'dining',label:'Dining'}, {id:'shopping',label:'Shopping'},
 {id:'movies',label:'Movies'}, {id:'drinks',label:'Drinks'},
 {id:'car',label:'Car / Uber'}, {id:'train',label:'Train / metro'},
 {id:'plane',label:'Flight'}, {id:'running',label:'Running'}, {id:'bed',label:'Sleep'},
 {id:'dessert',label:'Dessert'}, {id:'hotel',label:'Hotel'}, {id:'home',label:'Home'},
 {id:'work',label:'Work'}, {id:'moving',label:'Moving'}
]
export const normalizeActivityIcon=value=>activityIcons.some(icon=>icon.id===value)?value:''
