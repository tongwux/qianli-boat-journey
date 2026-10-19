// A tap opens a local zoom menu. Scroll, drag and multi-touch never count as taps.
(() => {
 const menu=$('paintingMenu'),hint=$('tapHint');
 const touches=new Set();
 let candidate=null,anchor={x:0,y:0},seen=false;
 try{seen=localStorage.getItem('qianli-tap-learned')==='true'}catch{}
 function dismiss(focus=false){menu.hidden=true;if(focus)stage.focus({preventScroll:true})}
 function learned(){seen=true;hint.classList.add('dismissed');try{localStorage.setItem('qianli-tap-learned','true')}catch{}setTimeout(()=>{hint.hidden=true},500)}
 function show(clientX,clientY){
  if(!entered||document.querySelector('dialog[open]'))return;
  const r=stage.getBoundingClientRect();anchor={x:clientX-r.left,y:clientY-r.top};
  menu.hidden=false;
  const box=menu.getBoundingClientRect();
  menu.style.left=clamp(clientX+12,10,Math.min(innerWidth,r.right)-box.width-10)+'px';
  menu.style.top=clamp(clientY+12,r.top+8,Math.min(r.bottom,innerHeight)-box.height-8)+'px';
  $('pointZoomIn').disabled=scale>=base()*3-.001;
  $('pointZoomOut').disabled=false;
  $('pointZoomOut').textContent=scale<=base()+.001?'继续展卷 ←':'− 缩小';
  ($('pointZoomIn').disabled?$('pointZoomOut'):$('pointZoomIn')).focus({preventScroll:true});
 }
 stage.addEventListener('pointerdown',e=>{
  touches.add(e.pointerId);if(touches.size>1){candidate=null;return}
  if(e.target.closest('button')||!entered||e.button!==0){candidate=null;return}
  if(candidate){candidate=null;return}
  dismiss();candidate={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),scroll:scrollY};
 },true);
 stage.addEventListener('pointermove',e=>{if(candidate&&candidate.id===e.pointerId&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>8)candidate=null},true);
 stage.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);candidate=null},true);
 stage.addEventListener('pointerup',e=>{
  touches.delete(e.pointerId);const c=candidate;candidate=null;
  if(!c||c.id!==e.pointerId||performance.now()-c.time>650||Math.abs(scrollY-c.scroll)>3)return;
  show(e.clientX,e.clientY);
 },true);
 for(const [id,factor] of [['pointZoomIn',1.5],['pointZoomOut',1/1.5]])$(id).onclick=()=>{dismiss(true);enterFree();zoom(factor,anchor.x,anchor.y);learned()};
 $('pointResume').onclick=()=>{dismiss(true);learned();if(freeMode)leaveFree();else advance()};
 document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target))dismiss()},true);
 document.addEventListener('wheel',()=>{candidate=null;dismiss()},{passive:true,capture:true});
 window.addEventListener('scroll',()=>{candidate=null;dismiss()},{passive:true});
 window.addEventListener('resize',()=>{candidate=null;touches.clear();dismiss()});
 window.addEventListener('pointerup',e=>touches.delete(e.pointerId));
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!menu.hidden){e.preventDefault();e.stopImmediatePropagation();dismiss(true);return}
  if(e.target===stage&&(e.key==='Enter'||e.key==='ContextMenu')){e.preventDefault();const r=stage.getBoundingClientRect();show(r.left+r.width/2,r.top+r.height/2)}
 },true);
 menu.addEventListener('focusout',e=>{if(e.relatedTarget&&!menu.contains(e.relatedTarget))dismiss()});
 window.addEventListener('qianli-enter',()=>{hint.hidden=seen});
})();
