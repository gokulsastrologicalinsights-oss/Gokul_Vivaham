'use client';
import {Children,useEffect,useRef,useState} from 'react';
export default function OneByOneSlider({children}:{children:React.ReactNode}){
 const cards=Children.toArray(children),count=cards.length;
 const viewport=useRef<HTMLDivElement>(null);
 const [index,setIndex]=useState(0),[step,setStep]=useState(0),[animated,setAnimated]=useState(true);
 const [paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{const el=viewport.current;if(!el)return;const measure=()=>{const first=el.querySelector<HTMLElement>('[data-slide]');setStep(first?.getBoundingClientRect().width||0);};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[count]);
 useEffect(()=>{if(paused||hovered||focused||reduced||count<=3)return;const timer=setInterval(()=>setIndex(i=>Math.min(i+1,count)),4000);return()=>clearInterval(timer);},[paused,hovered,focused,reduced,count]);
 useEffect(()=>{if(animated)return;let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>setAnimated(true));});return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};},[animated]);
 function next(){if(index>=count)return;if(reduced&&index===count-1){setIndex(0);return;}setIndex(i=>i+1);}
 return <div role="region" aria-label="sample profiles" aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
  <div className="flex gap-3 mb-4"><button type="button" onClick={()=>setPaused(!paused)} className="border border-border rounded px-3 py-2">{paused?'Play slider':'Pause slider'}</button><button type="button" onClick={next} className="border border-border rounded px-3 py-2" aria-label="Next sample profile">Next profile</button></div>
  <div ref={viewport} className="overflow-hidden"><div className="flex" style={{transform:`translateX(-${index*step}px)`,transition:animated&&!reduced?'transform 650ms ease':'none'}} onTransitionEnd={e=>{if(e.target!==e.currentTarget||e.propertyName!=='transform'||index<count)return;setAnimated(false);setIndex(0);}}>
   {[...cards,...cards].map((card,i)=><div key={i} data-slide aria-hidden={i>=count?true:undefined} inert={i>=count?true:undefined} className="shrink-0 w-full sm:w-1/2 lg:w-1/3 pr-5 [&>article]:h-full">{card}</div>)}
  </div></div>
 </div>;
}
