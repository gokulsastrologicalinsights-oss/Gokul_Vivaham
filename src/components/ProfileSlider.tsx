'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export default function ProfileSlider({children,label}:{children:React.ReactNode;label:string}) {
 const track=useRef<HTMLDivElement>(null);
 const [paused,setPaused]=useState(false);
 const [hovered,setHovered]=useState(false);
 const [focused,setFocused]=useState(false);
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const move=useCallback((direction:number)=>{const el=track.current;if(!el)return;const end=el.scrollWidth-el.clientWidth;const target=el.scrollLeft+direction*el.clientWidth;el.scrollTo({left:direction>0?(el.scrollLeft>=end-2?0:Math.min(target,end)):(el.scrollLeft<=2?end:Math.max(target,0)),behavior:reduced?'instant':'smooth'});},[reduced]);
 useEffect(()=>{if(paused||hovered||focused||reduced)return;const timer=window.setInterval(()=>move(1),5000);return()=>window.clearInterval(timer);},[paused,hovered,focused,reduced,move]);
 return <div role="region" aria-label={label} aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
  <div className="flex gap-3 mb-4"><button type="button" onClick={()=>move(-1)} className="border border-border rounded px-3 py-2" aria-label={`Previous ${label}`}>Previous</button><button type="button" onClick={()=>setPaused(!paused)} className="border border-border rounded px-3 py-2">{paused?'Play slider':'Pause slider'}</button><button type="button" onClick={()=>move(1)} className="border border-border rounded px-3 py-2" aria-label={`Next ${label}`}>Next</button></div>
  <div ref={track} className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 [&>article]:shrink-0 [&>article]:snap-start [&>article]:w-[85%] sm:[&>article]:w-[45%] lg:[&>article]:w-[23%]">{children}</div>
 </div>;
}

