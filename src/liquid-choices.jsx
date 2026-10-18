import React,{useLayoutEffect,useRef,useState} from 'react'

// One shared indicator slides between measured controls, including variable-width day labels.
export function LiquidChoices({items,value,onChange,label,swatches=false}){
  const track=useRef(null),[position,setPosition]=useState(null)
  useLayoutEffect(()=>{
    const node=track.current
    const measure=()=>{
      const selected=[...node.querySelectorAll('button')].find(b=>b.dataset.value===String(value))
      if(!selected)return
      setPosition({x:selected.offsetLeft,y:selected.offsetTop,width:selected.offsetWidth,height:selected.offsetHeight})
      const left=selected.offsetLeft,right=left+selected.offsetWidth
      if(left<node.scrollLeft||right>node.scrollLeft+node.clientWidth){node.scrollTo({left:Math.max(0,left-(node.clientWidth-selected.offsetWidth)/2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
    }
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(node);node.querySelectorAll('button').forEach(button=>observer.observe(button))
    return()=>observer.disconnect()
  },[value,items.map(i=>i.value+':'+i.label).join('|')])
  return <div ref={track} className={`liquid-choices ${swatches?'liquid-swatches':'liquid-days'}`} role="group" aria-label={label}>
    {position&&<span aria-hidden="true" className="liquid-indicator" style={{transform:`translate3d(${position.x}px,${position.y}px,0)`,width:position.width,height:position.height}}/>}
    {items.map(item=><button type="button" key={item.value} data-value={item.value} className={`${swatches?'theme-swatch '+item.value:''} ${item.value===value?'selected':''}`} aria-label={swatches?`${item.label} theme`:item.label} aria-pressed={item.value===value} title={swatches?item.label:undefined} onClick={()=>onChange(item.value)}>{swatches?<i/>:item.label}</button>)}
  </div>
}
