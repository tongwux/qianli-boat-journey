// The quiet hotspot follows the original boat in tile 14, beside the long bridge.
(() => {
 const key='qianli-boat-origin-found',dialog=$('boatEgg');
 let discovered=false;
 try{discovered=localStorage.getItem(key)==='true'}catch{}
 function show(found){
  if(!entered)return;
  $('paintingMenu').hidden=true;
  $('boatEggKicker').textContent=found?'画中藏趣 · 寻舟彩蛋':'一叶舟的悄悄话';
  $('boatEggTitle').textContent=found?'原来，你也在画中。':'你可曾见过我？';
  $('boatEggText').textContent=found?'你找到了。长桥旁这艘有着青灰小舱、细细桅杆的木舟，正是漫游小舟的原型。它一直在画里，等你回望。':'我曾静静泊在一座长桥旁。青灰的小舱，细细的桅杆——你能在原画中找到我，轻轻点一下吗？';
  $('boatEggNote').textContent=found?'赠你一枚「识舟人」印记。江山千里，也记得这一叶舟。':'不必赶路。线索藏在桥影与水岸之间。';
  $('boatEggSeal').hidden=!found;
  $('boatEggContinue').textContent=found?'带着发现，继续展卷 ←':'继续寻舟 ←';
  if(!dialog.open)dialog.showModal();
 }
 $('boat').onclick=()=>show(discovered);
 $('boatOrigin').onclick=()=>{
  discovered=true;
  try{localStorage.setItem(key,'true')}catch{}
  $('boat').setAttribute('aria-label','小舟彩蛋：已获得识舟人印记');
  show(true);
 };
 if(discovered)$('boat').setAttribute('aria-label','小舟彩蛋：已获得识舟人印记');
 $('closeBoatEgg').onclick=$('boatEggContinue').onclick=()=>dialog.close();
})();
