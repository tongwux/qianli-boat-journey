/* Runs the actual interaction scripts against a small DOM adapter.
   These are state regressions, not a substitute for real touch/browser tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function journey(locale='', options={}){
 let now=1000;
 const nodes=new Map(),all=[],listeners={},store=new Map(),frames=[];
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;this.disabled=false;this.open=false;this.attributes={};this.events={};this.style={setProperty(){}};this.clientWidth=390;this.clientHeight=561;
   const classes=new Set();this.classList={add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v)),contains:x=>classes.has(x),toggle:(x,v)=>{const on=v??!classes.has(x);on?classes.add(x):classes.delete(x);return on;}};all.push(this);}
  appendChild(x){this.children.push(x);return x;} replaceChildren(...xs){this.children=xs;}
  setAttribute(k,v){this.attributes[k]=String(v);} removeAttribute(k){delete this.attributes[k];}
  addEventListener(t,fn,capture){(this.events[t]??=[]).push({fn,capture:capture===true});}
  dispatch(t,detail={}){const e={target:this,button:0,preventDefault(){},stopImmediatePropagation(){},...detail};for(const h of [...(this.events[t]||[])].sort((a,b)=>Number(b.capture)-Number(a.capture)))h.fn(e);}
  closest(q){return q.includes('button')&&this.tag==='button'?this:null;}
  matches(q){return q.split(',').includes(this.tag);}
  contains(x){return x===this||this.children.includes(x);}
  focus(){} setPointerCapture(){} showModal(){this.open=true;} close(){this.open=false;}
  getBoundingClientRect(){return {left:0,top:65,right:this.clientWidth,bottom:65+this.clientHeight,width:this.clientWidth,height:this.clientHeight};}
 }
 const html=fs.readFileSync(path.join(__dirname,'../dist',locale,'index.html'),'utf8');
 for(const m of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g))nodes.set(m[2],new Element(m[1]));
 const get=id=>nodes.get(id);
 const document={body:new Element('body'),hidden:false,getElementById:get,createElement:t=>new Element(t),
  querySelector:q=>q==='dialog[open]'?all.find(x=>x.tag==='dialog'&&x.open)||null:null,
  querySelectorAll:q=>q==='.poem-open'?[]:q.startsWith('[data-id=')?all.filter(x=>x.dataset.id===q.match(/"([^"]+)"/)[1]):[],
  addEventListener:(t,f)=>(listeners['doc:'+t]??=[]).push(f)};
 const context={document,Image:class extends Element{},console,innerWidth:390,innerHeight:844,scrollY:0,
  navigator:{connection:{}},history:{},matchMedia:q=>({matches:q.includes('reduced')?options.reduce!==false:options.touch!==false}),performance:{now:()=>now},
  localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:f=>{f();return 1;},clearTimeout(){},requestAnimationFrame:f=>frames.push(f),Event:class{constructor(type){this.type=type;}},
  addEventListener:(t,f)=>(listeners[t]??=[]).push(f),dispatchEvent:e=>(listeners[e.type]||[]).forEach(f=>f(e)),
  scrollTo:(arg,y)=>{context.scrollY=typeof arg==='object'?arg.top:y;(listeners.scroll||[]).forEach(f=>f());}};
 context.window=context;vm.createContext(context);
 for(const file of ['image-loader.js','app.js','painting-menu.js','boat-egg.js']){
  const folder=file==='image-loader.js'?'':locale;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',folder,file),'utf8'),context,{filename:file});
 }
 const tick=(elapsed=0)=>{now+=elapsed;const current=frames.splice(0);current.forEach(f=>f(now));};
 const run=s=>vm.runInContext(s,context);
 return {get,context,store,run,tick,enter(){get('enter').onclick();tick();},key(key){(listeners['doc:keydown']||[]).forEach(f=>f({key,target:get('stage'),preventDefault(){},stopImmediatePropagation(){}}));}};
}
for(const locale of ['', 'en'])test(`${locale||'zh'}: entry works without any high-resolution image completing`,()=>{
 const h=journey(locale);assert.equal(h.get('enter').disabled,false);h.enter();
 assert.equal(h.run('entered'),true);assert.equal(h.get('intro').attributes['aria-hidden'],'true');
 assert.ok(h.get('tiles').children.filter(x=>x.src).length<=2);
});
test('navigation opens a scenic annotation; pure mode hides it; continuing advances',()=>{
 const h=journey();h.enter();h.get('next').onclick();h.tick();
 assert.equal(h.get('card').hidden,false);assert.match(h.get('cardTitle').textContent,/水岸/);
 assert.ok(h.store.get('qianli-discoveries-v2').includes('shore'));
 h.get('pure').onclick();assert.equal(h.get('card').hidden,true);
 h.get('pure').onclick();const before=h.context.scrollY;
 h.get('resumeJourney').onclick();h.tick();assert.ok(h.context.scrollY>before);assert.equal(h.get('card').hidden,true);
});
test('tap opens zoom menu, but dragging and a canceled pointer do not',()=>{
 const h=journey();h.enter();const stage=h.get('stage');h.get('paintingMenu').hidden=true;
 stage.dispatch('pointerdown',{pointerId:1,clientX:100,clientY:200});
 stage.dispatch('pointermove',{pointerId:1,clientX:140,clientY:200});
 stage.dispatch('pointerup',{pointerId:1,clientX:140,clientY:200});assert.equal(h.get('paintingMenu').hidden,true);
 stage.dispatch('pointerdown',{pointerId:2,clientX:100,clientY:200});stage.dispatch('pointercancel',{pointerId:2});stage.dispatch('pointerup',{pointerId:2});assert.equal(h.get('paintingMenu').hidden,true);
 stage.dispatch('pointerdown',{pointerId:3,clientX:100,clientY:200});stage.dispatch('pointerup',{pointerId:3,clientX:100,clientY:200});assert.equal(h.get('paintingMenu').hidden,false);
 h.get('pointZoomIn').onclick();assert.equal(h.run('freeMode'),true);assert.ok(h.run('scale/base()')>1);
});
test('two-finger movement pans and zooms without producing a tap menu',()=>{
 const h=journey();h.enter();h.get('plus').onclick();const stage=h.get('stage');h.get('paintingMenu').hidden=true;
 const before=h.run('scale');stage.dispatch('pointerdown',{pointerId:1,clientX:100,clientY:200});stage.dispatch('pointerdown',{pointerId:2,clientX:200,clientY:200});
 stage.dispatch('pointermove',{pointerId:2,clientX:240,clientY:200});assert.ok(h.run('scale')>before);
 stage.dispatch('pointerup',{pointerId:1});stage.dispatch('pointerup',{pointerId:2});assert.equal(h.get('paintingMenu').hidden,true);assert.equal(h.run('pointers.size'),0);
});
test('zooming out at minimum returns to scroll navigation',()=>{
 const h=journey();h.enter();h.get('freeMode').onclick();h.get('minus').onclick();h.tick();assert.equal(h.run('freeMode'),false);assert.ok(h.context.scrollY>0);
});
test('resizing preserves the scenic phase and magnification in free view',()=>{
 const h=journey();h.enter();h.get('next').onclick();h.tick();const phase=h.run('segmentAt(scrollY).phase');
 h.get('stage').clientWidth=844;h.get('stage').clientHeight=200;h.run('resizeJourney()');assert.equal(h.run('segmentAt(scrollY).phase'),phase);
 h.get('plus').onclick();const ratio=h.run('scale/base()');h.get('stage').clientHeight=260;h.run('resizeJourney()');assert.ok(Math.abs(h.run('scale/base()')-ratio)<1e-9);
});
test('boat-origin discovery persists and dialogs close',()=>{
 const h=journey();h.enter();h.get('boatOrigin').onclick();assert.equal(h.store.get('qianli-boat-origin-found'),'true');
 assert.equal(h.get('boatEgg').open,true);assert.equal(h.get('boatEggSeal').hidden,false);h.get('boatEggContinue').onclick();assert.equal(h.get('boatEgg').open,false);
});
test('keyboard entry and zoom-menu access remain available',()=>{
 const h=journey();h.key('Enter');assert.equal(h.run('entered'),false);h.key('ArrowDown');h.tick();assert.equal(h.run('entered'),true);
 h.key('Enter');assert.equal(h.get('paintingMenu').hidden,false);
});

function swipe(h,from,to,end=true){
 const stage=h.get('stage');
 stage.dispatch('touchstart',{touches:[{clientX:100,clientY:from}]});
 stage.dispatch('touchmove',{touches:[{clientX:100,clientY:to}]});
 if(end)stage.dispatch('touchend',{touches:[]});
}
test('touch arrival animates without further swiping and consumes the arrival gesture',()=>{
 const h=journey('',{reduce:false});h.enter();
 h.run("scrollTo({top:timeline.find(t=>t.phase==='in').start-20})");h.tick();
 const wide=h.run('scale');swipe(h,400,300,false);
 assert.equal(h.run('segmentAt(scrollY).phase'),'hold');assert.equal(h.run('scale'),wide);
 const paused=h.context.scrollY;
 h.get('stage').dispatch('touchmove',{touches:[{clientX:100,clientY:100}]});assert.equal(h.context.scrollY,paused);
 h.get('stage').dispatch('touchend',{touches:[]});
 swipe(h,400,250);assert.equal(h.context.scrollY,paused); // Touch during arrival cannot skip the stop.
 h.tick(800);assert.ok(h.run('scale')>wide);assert.equal(h.run('cameraTween'),null);
 swipe(h,400,320);assert.equal(h.run('segmentAt(scrollY).phase'),'travel');h.tick(800);
 assert.ok(Math.abs(h.run('scale/base()')-1)<1e-9);
});
test('reverse touch travel visits the previous stop, with one pause per gesture',()=>{
 const h=journey();h.enter();h.get('next').onclick();h.tick();swipe(h,400,300);
 assert.equal(h.run('segmentAt(scrollY).phase'),'travel');swipe(h,300,400);
 assert.equal(h.run('segmentAt(scrollY).phase'),'hold');swipe(h,300,400);
 assert.equal(h.run('segmentAt(scrollY).phase'),'travel');assert.ok(h.run('scrollY<timeline[1].start'));
});
test('horizontal, canceled and multi-touch journey gestures do not advance',()=>{
 const h=journey();h.enter();const stage=h.get('stage');
 stage.dispatch('touchstart',{touches:[{clientX:200,clientY:300}]});
 stage.dispatch('touchmove',{touches:[{clientX:100,clientY:290}]});assert.equal(h.context.scrollY,0);
 stage.dispatch('touchcancel',{touches:[]});assert.equal(h.run('journeyTouch'),null);
 stage.dispatch('touchstart',{touches:[{clientX:200,clientY:300}]});
 stage.dispatch('touchmove',{touches:[{clientX:200,clientY:200},{clientX:300,clientY:200}]});assert.equal(h.run('journeyTouch'),null);
});
test('pure touch travel skips scenic zoom; free exploration leaves journey scroll alone',()=>{
 const h=journey();h.enter();h.get('pure').onclick();swipe(h,800,0);
 assert.equal(h.run('segmentAt(scrollY).phase'),'travel');assert.equal(h.get('card').hidden,true);
 h.get('freeMode').onclick();const saved=h.context.scrollY;swipe(h,400,200);assert.equal(h.context.scrollY,saved);
});
test('desktop scroll still controls the scenic zoom continuously',()=>{
 const h=journey('',{touch:false});h.enter();
 h.run("const entrance=timeline.find(t=>t.phase==='in');scrollTo({top:entrance.start+entrance.length/2})");h.tick();
 assert.equal(h.run('segmentAt(scrollY).phase'),'in');assert.ok(h.run('scale/base()>1 && scale/base()<1.85'));
});
