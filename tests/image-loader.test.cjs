const {test}=require('node:test');
const assert=require('node:assert/strict');
const {tilePlan,createTileLoader}=require('../dist/image-loader.js');
function setup(options={}){
 const requests=[];
 const images=Array.from({length:20},(_,i)=>({classList:{toggle(){},remove(){}},
  set src(value){requests.push(i);this.url=value;},removeAttribute(){delete this.url;}}));
 const statuses=[];
 const loader=createTileLoader({images,width:39974,onStatus:s=>statuses.push(s),...options});
 return {loader,images,requests,statuses,finish(i,ok=true){images[i][ok?'onload':'onerror']();}};
}
test('viewport edges include the final short tile without loading the whole scroll',()=>{
 assert.deepEqual(tilePlan({width:39974,tileWidth:2000,left:38000,right:39974}).visible,[19]);
 assert.deepEqual(tilePlan({width:39974,tileWidth:2000,left:0,right:2000}).wanted,[0,1]);
});
test('entry loads two requests at a time, prioritizing visible tiles over neighbors',()=>{
 const h=setup();h.loader.update(37000,39900);
 assert.deepEqual(h.requests,[18,19]);h.finish(18);assert.deepEqual(h.requests,[18,19,17]);
 h.finish(19);h.finish(17);assert.equal(h.requests.length,3);
 h.loader.update(37050,39800);assert.equal(h.requests.length,3);
});
test('jumping across the scroll discards obsolete queued neighbors',()=>{
 const h=setup();h.loader.update(37000,39900);h.loader.update(0,1800);h.finish(18);
 assert.deepEqual(h.requests,[18,19,0]);assert.ok(!h.requests.includes(17));
});
test('a failed tile is retryable and does not loop or block other tiles',()=>{
 const h=setup();h.loader.update(0,1800);h.finish(0,false);h.finish(1);
 assert.equal(h.statuses.at(-1).failed,1);assert.equal(h.requests.length,2);
 h.loader.update(0,1700);assert.equal(h.requests.length,2);
 h.loader.retry();assert.deepEqual(h.requests,[0,1,0]);h.finish(0);
 assert.deepEqual(h.statuses.at(-1),{failed:0,pending:0});
});
test('save-data planning skips prefetch and offscreen ready images are evicted',()=>{
 const h=setup({margin:0,maxResident:2});
 for(const i of [0,4,9]){h.loader.update(i*2000,i*2000+100);h.finish(i);}
 assert.deepEqual(h.requests,[0,4,9]);assert.equal(h.images[0].url,undefined);
 assert.ok(h.images[9].url);h.loader.update(0,100);assert.deepEqual(h.requests,[0,4,9,0]);
});
test('disposing ignores outstanding requests',()=>{
 const h=setup();h.loader.update(0,100);const complete=h.images[0].onload;
 h.loader.dispose();const count=h.statuses.length;complete();assert.equal(h.statuses.length,count);
});
