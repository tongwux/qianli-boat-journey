const $=id=>document.getElementById(id),W=39974,H=1600,stage=$('stage'),world=$('world');
const stops=[
 {id:'fishing',x:32800/W,y:.79,t:'寻渔 · 江上微舟',d:'江面上一叶小舟，只有几笔那么大。停下来，在原画局部中找一找操舟的人。',action:'放大寻渔',source:'https://www.dpm.org.cn/collection/paint/228354.html'},
 {id:'dock',x:29130/W,y:.86,t:'靠泊 · 柳岸歇舟',d:'桥旁停着几艘船。把小舟轻轻靠向岸边，停一会儿，再回到江面。',action:'缓缓靠岸',source:'https://dfzb.suzhou.gov.cn/dfzb/szdq/202302/bc8d0be00bb84d6babf004b4d221c2eb.shtml'},
 {id:'bridge',x:28800/W,y:.81,t:'过桥 · 一水相通',d:'长桥在水上展开，桥亭抬起。让小舟从桥下慢慢穿过，再看一眼两岸。',action:'穿桥而过',source:'https://dfzb.suzhou.gov.cn/dfzb/szdq/202302/bc8d0be00bb84d6babf004b4d221c2eb.shtml'},
 {id:'ferry',x:20700/W,y:.83,t:'野渡 · 等一叶舟',d:'岸边泊舟，水路连接山中人家。循着这一小段水面，体验一次短短的渡行。',action:'渡向岸边',source:'https://www.dpm.org.cn/collection/paint/228354.html'},
 {id:'fall',x:15760/W,y:.73,t:'听瀑 · 山深有声',d:'顺着山间的白线往下看，水从岩隙间落下。停舟听一会儿，让目光沿溪流走入山中。',action:'听一段流水',source:'https://www.dpm.org.cn/learing_detail/246083.html'},
 {id:'mill',x:14970/W,y:.85,t:'水磨 · 借水为力',d:'这座屋舍横跨山溪，屋下可见立式水轮。流水驱动水轮，经传动带动磨盘，把山中水流变为日常劳作的力量。',action:'看水磨运转',source:'https://www.dpm.org.cn/Uploads/pdf/5058/T00087_00.pdf'}
];
const views=[
 {id:'shore',x:.929,y:.71,t:'水岸初见',d:'山脚、树木与屋舍逐层展开。沿岸慢慢看，找一找藏在山水之间的人间尺度。'},
 {id:'valley',x:.758,y:.69,t:'青峰夹岸',d:'山脚与溪流交错，远近山色彼此相接。停下来，看看青绿之间的赭色与细墨线。'},
 {id:'peaks',x:.674,y:.34,t:'群峰入云',d:'从山脚向上看，山峰层层抬起。细看轮廓，再退远一点，体会山势的起伏。'},
 {id:'homes',x:.487,y:.77,t:'山中有人家',d:'屋舍与树木把宏大的山水变得可亲。试着寻找从水边通向人家的小路。'},
 {id:'summit',x:.332,y:.46,t:'一峰独秀',d:'高峰在这里抬起画面的节奏。看看它与周围低山如何层层衔接。'},
 {id:'river',x:.12,y:.8,t:'江阔帆远',d:'水面渐宽，远山渐低。放大细看水纹，再退远回望走过的山水。'}
].map(s=>({...s,kind:'view',action:'自由细看此处',source:'https://www.dpm.org.cn/collection/paint/228354.html'}));
stops.push(...views);
// Water passages traced against the unmodified full-resolution painting. Gaps are scenic transitions.
const passages=[
 [[37900,760],[37200,735],[36500,750],[35900,770],[35400,900],[34700,1030],[34000,1230],[33400,1410],[32800,1450],[32100,1470],[31300,1510],[30500,1530],[29700,1530],[29200,1490],[28700,1500],[28200,1515]],
 [[27800,1525],[27300,1510],[26800,1500]],
 [[25600,1450],[25000,1430],[24500,1490],[24000,1525],[23400,1520],[22800,1460],[22000,1450],[21400,1410],[20900,1350],[20500,1400]],
 [[19500,1040],[19000,1050],[18600,1020]],
 [[18000,1515],[17600,1480],[17100,1520]],
 [[15010,1500],[14880,1530]],
 [[14300,1510],[13800,1390],[13500,1430]],
 [[11300,1510],[10800,1420],[10300,1400],[9800,1450],[9300,1490],[8700,1460],[8200,1490],[7600,1450],[7100,1350],[6700,1230],[6100,1210],[5500,1160],[4800,1120],[4200,1080],[3700,1000],[3200,900]]
];
let found=new Set();try{found=new Set(JSON.parse(localStorage.getItem('qianli-discoveries-v2')||'[]').filter(id=>stops.some(s=>s.id===id)))}catch{}
let zoomMotion=null,pinchReachedWide=false;
let freeMode=false,savedScroll=0,timeline=[],totalScroll=1,cameraTween=null,scrollDirty=true;
let pos=.944,scale=1,ox=0,oy=0,playing=false,entered=false,follow=true,last=0,pure=false,sound=false,audio,gain,filter,pointers=new Map(),pinch=0,speed=0,activeStop=null,scene=null,boatOverride=null,fallTimer=null,returnFocus=null;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>t*t*(3-2*t);
function base(){return stage.clientHeight/H}
function bound(){ox=clamp(ox,Math.min(0,stage.clientWidth-W*scale),0);oy=clamp(oy,Math.min(0,stage.clientHeight*(activeStop&&stage.clientWidth<=750?.45:1)-H*scale),Math.max(0,stage.clientHeight-H*scale)/2)}
function center(){ox=stage.clientWidth*.52-pos*W*scale;oy=(stage.clientHeight-H*scale)/2;bound()}
function route(x){
 for(const p of passages){if(x<=p[0][0]&&x>=p.at(-1)[0]){for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];if(x>=b[0]){const u=(a[0]-x)/(a[0]-b[0]),e=smooth(u),y=a[1]+(b[1]-a[1])*e;const edge=Math.min(p[0][0]-x,x-p.at(-1)[0]);return {x,y,opacity:clamp(edge/95,0,1),angle:clamp(Math.atan2((b[1]-a[1])*6*u*(1-u),a[0]-b[0])*180/Math.PI,-9,9),depth:clamp(.65+y/3200,.85,1.12)}}}}}
 return {x,y:1480,opacity:0,angle:0,depth:1};
}
function render(){
 world.style.setProperty('--scene-scale',scale);
 world.style.transform=`translate(${ox}px,${oy}px) scale(${scale})`;
 const b=boatOverride||route(pos*W),boat=$('boat');boat.style.left=b.x+'px';boat.style.top=b.y+'px';boat.style.opacity=(b.opacity??1)*.84;boat.disabled=!entered||(b.opacity??1)<.5;boat.style.transform=`translate(-50%,-94%) rotate(${b.angle||0}deg) scale(${b.depth||1})`;
 $('bridgeMask').hidden=activeStop?.id!=='bridge';$('poemMark').style.transform=`translate(-50%,-50%) scale(${1/scale})`;
 const left=clamp(-ox/(W*scale),0,1),wid=Math.min(1,stage.clientWidth/(W*scale));$('viewbox').style.left=left*100+'%';$('viewbox').style.width=wid*100+'%';$('progress').value=window.scrollY/totalScroll*1000;$('counter').textContent=`发现 ${found.size} / ${stops.length}`;
 let s=stops.reduce((a,b)=>Math.abs(a.x-pos)<Math.abs(b.x-pos)?a:b);$('chapter').textContent=pos<.05?'卷尾 · 行旅暂歇':pos>.86?'卷首 · 水岸初见':s.t;
 for(const el of $('marks').children){const s=stops.find(s=>s.id===el.dataset.id);el.style.setProperty('--mark-scale',1/scale);el.classList.toggle('near',Math.abs(s.x-pos)*W*scale<stage.clientWidth*.6);}
 if(entered&&playing&&!boatOverride)$('status').textContent=b.opacity<.1?'山回水转 · 移步换景':'沿水缓行 · 随时停舟';
}
function updateAudio(){if(gain){const listening=activeStop?.id==='fall'&&fallTimer;gain.gain.setTargetAtTime(document.hidden?0:listening?.09:sound&&entered?(playing?.022:.012):0,audio.currentTime,.7);filter.frequency.setTargetAtTime(listening?1500:420,audio.currentTime,.7)}}
async function enableAudio(){if(!audio){audio=new AudioContext();let buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),d=buffer.getChannelData(0);let prev=0;for(let i=0;i<d.length;i++){prev=(prev+.02*(Math.random()*2-1))/1.02;d[i]=prev*3.5}let src=audio.createBufferSource();filter=audio.createBiquadFilter();src.buffer=buffer;src.loop=true;filter.type='lowpass';filter.frequency.value=420;gain=audio.createGain();gain.gain.value=0;src.connect(filter).connect(gain).connect(audio.destination);src.start()}await audio.resume();updateAudio()}
function play(){playing=false;speed=0;updateAudio()}
function closeScene(){zoomMotion=null;scene=null;boatOverride=null;activeStop=null;clearTimeout(fallTimer);fallTimer=null;$('card').hidden=true;$('detailWindow').replaceChildren();$('detailWindow').hidden=true;$('focusRing').hidden=true;$('bridgeMask').hidden=true;updateAudio()}
function go(x){closeScene();speed=0;pos=clamp(x,.018,.944);follow=true;center();render()}
function glideCamera(target,duration=680,instant=false){
 if(reduce||instant){zoomMotion=null;({scale,ox,oy}=target);render();return}
 zoomMotion={from:{scale,ox,oy},to:target,start:performance.now(),duration};
}
function zoom(f,cx=stage.clientWidth/2,cy=stage.clientHeight/2,instant=false){
 if(f<1&&!instant&&freeMode&&scale<=base()+.0001&&(zoomMotion?.to.scale??scale)<=base()+.0001){resumeFromWide();return}
 const current={scale,ox,oy},target=zoomMotion?.to||current,old=target.scale;
 scale=clamp(old*f,base(),base()*3);ox=cx-(cx-target.ox)*scale/old;oy=cy-(cy-target.oy)*scale/old;follow=false;bound();
 const next={scale,ox,oy};({scale,ox,oy}=current);glideCamera(next,Math.abs(Math.log(f))>.15?680:320,instant);
}
function markFound(s){found.add(s.id);try{localStorage.setItem('qianli-discoveries-v2',JSON.stringify([...found]))}catch{}document.querySelectorAll(`[data-id="${s.id}"]`).forEach(b=>{b.classList.add('found');b.setAttribute('aria-label',s.t+'，已发现')});render()}
function focusAt(x,y,z=1.7){const current={scale,ox,oy};scale=base()*z;ox=stage.clientWidth*(stage.clientWidth>750?.36:.5)-x*scale;oy=stage.clientHeight*(stage.clientWidth>750?.52:.25)-y*scale;follow=false;bound();const target={scale,ox,oy};({scale,ox,oy}=current);glideCamera(target);}
function showAnnotation(s){
 if(activeStop?.id===s?.id)return;
 closeScene();if(!s||pure)return;activeStop=s;
 $('cardNum').textContent=`景点 ${String(ordered.indexOf(s)+1).padStart(2,'0')} / ${stops.length}`;
 $('cardTitle').textContent=s.t;$('cardText').textContent=s.d;$('sceneAction').textContent=s.action;$('sceneAction').disabled=false;$('actionState').textContent='';$('sceneSource').href=s.source;$('card').hidden=false;markFound(s);
}
function openStop(s){if(freeMode)leaveFree(false);$('discoveries').hidden=true;$('discoverToggle').setAttribute('aria-expanded','false');const seg=timeline.find(t=>t.stop===s&&t.phase==='hold');moveScroll(seg.start+seg.length*.3);}
function ring(x,y){$('focusRing').style.left=x+'px';$('focusRing').style.top=y+'px';$('focusRing').hidden=false}
function animateBoat(points,duration,onDone){scene={points,duration:reduce?.01:duration,elapsed:0,onDone};boatOverride={x:points[0][0],y:points[0][1],depth:1,opacity:1};$('sceneAction').disabled=true;render()}
function detailImage(name,alt){const window=$('detailWindow');window.hidden=false;window.classList.remove('revealed');window.replaceChildren();const im=new Image();im.src=`assets/detail-${name}.jpg`;im.alt=alt;window.appendChild(im);return window}
$('sceneAction').onclick=async()=>{const s=activeStop;if(!s)return;markFound(s);
 if(s.kind==='view'){enterFree();focusAt(s.x*W,s.y*H,2.3);}
 if(s.id==='bridge'){focusAt(28780,1300,2);$('actionState').textContent='收橹缓行，舟过桥影。';animateBoat([[28810,1490],[28795,1410],[28780,1340],[28765,1250],[28750,1160]],10,()=>{$('actionState').textContent='已过长桥 · 回望两岸';});}
 if(s.id==='dock'){focusAt(29120,1430,2);$('actionState').textContent='渐渐收橹，靠向柳岸。';animateBoat([[29100,1520],[29170,1470],[29210,1428]],7,()=>{$('actionState').textContent='已靠泊 · 在此歇一歇';ring(29210,1428)});}
 if(s.id==='ferry'){focusAt(20700,1320,1.8);$('actionState').textContent='水面很静，慢慢渡向岸边。';animateBoat([[21100,1400],[20850,1370],[20630,1345]],9,()=>{$('actionState').textContent='已到渡口 · 山中人家就在岸上';ring(20630,1345)});}
 if(s.id==='fishing'){const w=detailImage('fishing','原画江面上的渔舟与人物');const b=document.createElement('button');b.className='find-fisher';b.textContent='找到舟中人';b.setAttribute('aria-label','圈出舟中人物');b.onclick=()=>{w.classList.add('revealed');const outline=document.createElement('span');outline.className='fisher-ring';outline.setAttribute('aria-hidden','true');w.appendChild(outline);$('actionState').textContent='找到了 · 寥寥几笔，舟中人物便有了姿态。';b.disabled=true};w.appendChild(b);$('actionState').textContent='看一看船身中间的细小墨线。';$('sceneAction').textContent='再看渔舟';}
 if(s.id==='mill'){const w=detailImage('mill','原画山溪水磨，屋下可见立式水轮');const diagram=document.createElement('div');diagram.className='mill-diagram';diagram.innerHTML='<svg viewBox="0 0 250 64" role="img" aria-label="流水推动立式水轮，传动带动磨盘的简化示意"><path d="M2 49q16-8 30 0t30 0" fill="none" stroke="#9baf98"/><g class="wheel" stroke="#c2ae80" fill="none"><circle cx="91" cy="32" r="25"/><path d="M66 32h50M91 7v50M73 14l36 36M73 50l36-36"/></g><path d="M116 32h45v-12h27" fill="none" stroke="#a89570"/><ellipse cx="205" cy="23" rx="27" ry="9" fill="none" stroke="#c2ae80"/><path d="M178 23v9q27 17 54 0v-9" fill="none" stroke="#c2ae80"/></svg><small>流水 → 水轮 → 传动 → 磨盘 · 简化示意</small>';w.appendChild(diagram);$('actionState').textContent='原画保持静止，示意图展示借水为力。';$('sceneAction').textContent='再看水磨';}
 if(s.id==='fall'){if(fallTimer){clearTimeout(fallTimer);fallTimer=null;updateAudio();$('sceneAction').textContent='再听流水';$('actionState').textContent='水声渐歇。';return}detailImage('fall','原画山间瀑布与溪流');$('sceneAction').textContent='停止听瀑';$('actionState').textContent='听瀑 · 一段轻柔的流水声';try{fallTimer=setTimeout(()=>{fallTimer=null;updateAudio();if(activeStop?.id==='fall'){$('sceneAction').textContent='再听流水';$('actionState').textContent='水声渐歇 · 山色依旧'}},20000);await enableAudio()}catch{clearTimeout(fallTimer);fallTimer=null;$('actionState').textContent='声音暂未开启，请再试一次。';$('sceneAction').textContent='重新听瀑'}}
};
const ordered=[...stops].sort((a,b)=>b.x-a.x);
function buildTimeline(){
 timeline=[];let cursor=0,previous=.944;
 const add=(phase,length,from,to,stop)=>{timeline.push({phase,length,start:cursor,end:cursor+length,from,to,stop});cursor+=length};
 for(const s of ordered){const wide={x:s.x,y:.5,z:1,focus:0},detail={x:s.x,y:s.y,z:s.kind==='view'?1.85:2.2,focus:1};
 add('travel',Math.max(420,(previous-s.x)*W*base()*.95),{x:previous,y:.5,z:1,focus:0},wide,null);
 add('in',720,wide,detail,s);add('hold',650,detail,detail,s);add('out',560,detail,wide,s);previous=s.x;
 }
 add('travel',Math.max(500,(previous-.018)*W*base()*.95),{x:previous,y:.5,z:1,focus:0},{x:.018,y:.5,z:1,focus:0},null);
 totalScroll=cursor;$('scrollTrack').style.height=(totalScroll+innerHeight)+'px';
}
function segmentAt(y){return timeline.find(t=>y<t.end)||timeline.at(-1)}
function applyTimeline(){
 if(freeMode)return;
 const y=clamp(window.scrollY,0,totalScroll),seg=segmentAt(y),u=clamp((y-seg.start)/seg.length,0,1),f=seg.phase==='travel'?u:smooth(u);
 const mix=k=>seg.from[k]+(seg.to[k]-seg.from[k])*f;
 const amount=pure?0:mix('focus'),z=pure?1:mix('z');pos=mix('x');
 showAnnotation(!pure&&seg.stop&&((seg.phase==='in'&&u>.45)||seg.phase==='hold'||(seg.phase==='out'&&u<.55))?seg.stop:null);
 const mobile=stage.clientWidth<=750;
 const targetScale=base()*z,targetX=stage.clientWidth*(.52+((mobile?.5:.36)-.52)*amount)-pos*W*targetScale;
 const targetY=stage.clientHeight*(.5+((mobile?.25:.52)-.5)*amount)-(.5+(mix('y')-.5)*(pure?0:1))*H*targetScale;
 scale=targetScale;ox=targetX;oy=targetY;bound();
 if(cameraTween){const q=clamp((performance.now()-cameraTween.time)/650,0,1),e=reduce?1:smooth(q);scale=cameraTween.scale+(scale-cameraTween.scale)*e;ox=cameraTween.ox+(ox-cameraTween.ox)*e;oy=cameraTween.oy+(oy-cameraTween.oy)*e;if(q>=1||reduce)cameraTween=null;}
 $('status').textContent=y>=totalScroll-2?'已至卷尾 · 向上滚动可回看':activeStop?'继续向下滚动，收起批注并前行':'向下滚动展卷 · 向上滚动回看';render();
}
function moveScroll(y){cameraTween=null;window.scrollTo({top:clamp(y,0,totalScroll),behavior:reduce||Math.abs(y-window.scrollY)>1500?'instant':'smooth'});scrollDirty=true;}
function advance(){if(freeMode){leaveFree();return}const seg=segmentAt(window.scrollY);moveScroll(seg.stop?timeline.find(t=>t.stop===seg.stop&&t.phase==='out').end+20:window.scrollY+600);}
function enterFree(){if(!entered||freeMode)return;savedScroll=window.scrollY;freeMode=true;cameraTween=null;closeScene();document.body.classList.add('free-view');$('freeMode').textContent='继续展卷';$('freeMode').setAttribute('aria-pressed','true');$('hint').textContent=stage.clientWidth<=750?'单指拖动 · 双指缩放 · 缩至全景后松手继续展卷':'左键按住拖动 · 滚轮缩放 · 缩至全景后继续展卷';$('status').textContent='行程已暂停 · 继续展卷将回到原位置';render();}
function leaveFree(animate=true){if(!freeMode)return;zoomMotion=null;const before={scale,ox,oy,time:performance.now()};freeMode=false;document.body.classList.remove('free-view');$('freeMode').textContent='自由细看';$('freeMode').setAttribute('aria-pressed','false');$('hint').textContent='向下滚动，从右向左阅卷 · 到景点自动放大';window.scrollTo({top:savedScroll,behavior:'instant'});cameraTween=animate?before:null;scrollDirty=true;applyTimeline();}
// Resume from the area being inspected, skipping a stop already zoomed back out.
function resumeFromWide(step=120){
 const x=clamp((stage.clientWidth*.52-ox)/(W*scale),.018,.944),previous=segmentAt(savedScroll);
 const travel=timeline.filter(t=>t.phase==='travel').reverse().find(t=>x<=t.from.x&&x>=t.to.x);
 let destination=travel?travel.start+(travel.from.x-x)/(travel.from.x-travel.to.x)*travel.length:savedScroll;
 if(previous.stop&&Math.abs(x-previous.stop.x)*W*base()<stage.clientWidth*.3)destination=timeline.find(t=>t.stop===previous.stop&&t.phase==='out').end;
 const before={scale,ox,oy,time:performance.now()};
 savedScroll=clamp(destination+step,0,totalScroll);leaveFree(false);cameraTween=before;scrollDirty=true;
 $('hint').textContent='已回到全景 · 继续滚动展卷';
}
$('freeMode').onclick=()=>freeMode?leaveFree():enterFree();
ordered.forEach(s=>{const b=document.createElement('button');b.dataset.id=s.id;b.className=found.has(s.id)?'found':'';b.innerHTML='<span>'+s.t.split(' · ')[0]+'</span>';b.style.left=s.x*W+'px';b.style.top=s.y*H+'px';b.setAttribute('aria-label','查看景点：'+s.t);b.onclick=()=>openStop(s);$('marks').appendChild(b);const n=document.createElement('button');n.dataset.id=s.id;n.textContent=s.t;n.className=b.className;n.onclick=()=>openStop(s);$('discoveries').appendChild(n)});
$('discoverToggle').onclick=()=>{const shown=$('discoveries').hidden;$('discoveries').hidden=!shown;$('discoverToggle').setAttribute('aria-expanded',shown)};
$('resumeJourney').onclick=advance;$('closeCard').onclick=advance;$('play').onclick=advance;
$('prev').onclick=()=>{if(freeMode)leaveFree(false);const points=timeline.filter(t=>t.phase==='hold');const target=points.filter(t=>t.start<window.scrollY-700).at(-1);moveScroll(target?target.start+200:0)};
$('next').onclick=()=>{if(freeMode)leaveFree(false);const target=timeline.find(t=>t.phase==='hold'&&t.start>window.scrollY+100);moveScroll(target?target.start+200:totalScroll)};
$('plus').onclick=()=>{enterFree();zoom(1.25)};$('minus').onclick=()=>{enterFree();zoom(1/1.25)};$('follow').onclick=()=>{zoomMotion=null;scale=base();center();render()};
$('progress').oninput=e=>{const destination=Number(e.target.value)/1000*totalScroll;if(freeMode)leaveFree(false);cameraTween=null;window.scrollTo({top:destination,behavior:'instant'});scrollDirty=true};
$('pure').onclick=()=>{pure=!pure;$('app').classList.toggle('pure',pure);$('pure').textContent=pure?'返回批注':'只看原画';$('pure').setAttribute('aria-pressed',pure);closeScene();$('discoveries').hidden=true;$('discoverToggle').setAttribute('aria-expanded','false');if(freeMode)render();else applyTimeline()};
$('sound').onclick=async()=>{sound=!sound;try{await enableAudio()}catch{sound=false;$('status').textContent='声音暂未开启，请再试一次'}$('sound').textContent=sound?'声音 开':'声音 关';$('sound').setAttribute('aria-pressed',sound);updateAudio()};
$('aboutBtn').onclick=()=>$('about').showModal();$('closeAbout').onclick=()=>$('about').close();
for(const b of document.querySelectorAll('.poem-open'))b.onclick=()=>$('poemDialog').showModal();$('closePoem').onclick=()=>$('poemDialog').close();
let ready=0;for(let i=0;i<20;i++){const im=new Image();im.width=Math.min(2000,W-i*2000);im.height=H;im.src=`assets/tile-${String(i).padStart(2,'0')}.jpg`;im.onload=()=>{if(++ready===20){$('loading').hidden=true;$('loading').style.display='none';$('enter').disabled=false;$('enter').textContent='展开画卷 ←'}};im.onerror=()=>{$('loading').textContent='画卷加载未完成，请刷新重试。'};$('tiles').appendChild(im)}
let opening=false,entryWheel=0,entryWheelTime=0,entryTouch=null;
function beginEntrance(){
 if(entered||opening||$('enter').disabled||document.querySelector('dialog[open]'))return;
 opening=true;$('intro').classList.add('opening');$('intro').inert=true;
 setTimeout(()=>{
  entered=true;opening=false;$('intro').classList.add('gone');$('intro').setAttribute('aria-hidden','true');
  document.body.classList.remove('before-entry');stage.focus({preventScroll:true});applyTimeline();window.dispatchEvent(new Event('qianli-enter'));
 },reduce?0:1100);
}
$('enter').onclick=beginEntrance;
// Keep the opening gesture from also advancing into the first scenic zoom.
window.addEventListener('wheel',e=>{
 if(entered||document.querySelector('dialog[open]')||e.ctrlKey)return;
 e.preventDefault();if(opening||e.deltaY<=0)return;
 const now=performance.now();if(now-entryWheelTime>300)entryWheel=0;entryWheelTime=now;
 entryWheel+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
 if(entryWheel>=35)beginEntrance();
},{passive:false,capture:true});
$('intro').addEventListener('touchstart',e=>{entryTouch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
$('intro').addEventListener('touchmove',e=>{
 if(entered||!entryTouch||e.touches.length!==1)return;e.preventDefault();
 const dy=entryTouch.y-e.touches[0].clientY,dx=entryTouch.x-e.touches[0].clientX;
 if(dy>32&&dy>Math.abs(dx)){entryTouch=null;beginEntrance()}
},{passive:false});
for(const type of ['touchend','touchcancel'])$('intro').addEventListener(type,()=>{entryTouch=null},{passive:true});
document.addEventListener('keydown',e=>{
 if(entered||document.querySelector('dialog[open]')||e.target.closest('button,a,input'))return;
 if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();beginEntrance()}
});
window.addEventListener('scroll',()=>{if(!freeMode){zoomMotion=null;scene=null;boatOverride=null;$('sceneAction').disabled=false;scrollDirty=true}},{passive:true});
stage.addEventListener('wheel',e=>{if(!freeMode)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);if(delta>0&&scale<=base()+.0001&&(zoomMotion?.to.scale??scale)<=base()+.0001){resumeFromWide(Math.min(delta,240));return}const r=stage.getBoundingClientRect();zoom(Math.exp(-delta*.001),e.clientX-r.left,e.clientY-r.top)},{passive:false});
stage.addEventListener('dragstart',e=>e.preventDefault());
stage.addEventListener('pointerdown',e=>{if(!freeMode||e.target.closest('button')||e.button!==0)return;e.preventDefault();zoomMotion=null;stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=0;pinchReachedWide=false});
stage.addEventListener('pointermove',e=>{if(!freeMode||!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const[a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y),r=stage.getBoundingClientRect();if(pinch){zoom(dist/pinch,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,true);pinchReachedWide=dist<pinch&&scale<=base()+.0001}pinch=dist}else{ox+=e.clientX-old.x;oy+=e.clientY-old.y;bound();render()}});
for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,e=>{pointers.delete(e.pointerId);pinch=0;if(!pointers.size){const resume=pinchReachedWide;pinchReachedWide=false;if(resume&&freeMode&&event==='pointerup')resumeFromWide(0)}});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||!entered||e.target.matches('input,button,a'))return;if(e.key==='Escape'){if(freeMode)leaveFree();else advance();return}if(freeMode){if(e.key==='+'||e.key==='=')zoom(1.25);if(e.key==='-')zoom(.8);return}if(['ArrowDown','ArrowLeft','PageDown',' '].includes(e.key)){e.preventDefault();moveScroll(window.scrollY+(e.key==='PageDown'?600:180))}if(['ArrowUp','ArrowRight','PageUp'].includes(e.key)){e.preventDefault();moveScroll(window.scrollY-(e.key==='PageUp'?600:180))}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(fallTimer);fallTimer=null;scene=null;$('sceneAction').disabled=false}updateAudio()});
window.addEventListener('resize',()=>{zoomMotion=null;const ratio=window.scrollY/totalScroll;buildTimeline();if(freeMode){savedScroll=ratio*totalScroll;bound();render()}else{window.scrollTo({top:ratio*totalScroll,behavior:'instant'});applyTimeline()}});
function frame(t){let dt=Math.min((t-last)/1000,.05);last=t;
 if(scrollDirty||cameraTween){scrollDirty=false;applyTimeline()}
 if(zoomMotion){const m=zoomMotion,u=clamp((t-m.start)/m.duration,0,1),e=1-Math.pow(1-u,3);scale=m.from.scale+(m.to.scale-m.from.scale)*e;ox=m.from.ox+(m.to.ox-m.from.ox)*e;oy=m.from.oy+(m.to.oy-m.from.oy)*e;if(u===1)zoomMotion=null;render()}
 if(scene&&!document.hidden){scene.elapsed+=dt;const u=clamp(scene.elapsed/scene.duration,0,1),q=smooth(u)*(scene.points.length-1),i=Math.min(Math.floor(q),scene.points.length-2),f=q-i,a=scene.points[i],b=scene.points[i+1];boatOverride={x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,depth:1-u*.12,opacity:1};if(u===1){const done=scene.onDone;scene=null;$('sceneAction').disabled=false;done?.()}render()}
 requestAnimationFrame(frame)
}
history.scrollRestoration='manual';document.body.classList.add('before-entry');buildTimeline();window.scrollTo(0,0);applyTimeline();requestAnimationFrame(frame);
