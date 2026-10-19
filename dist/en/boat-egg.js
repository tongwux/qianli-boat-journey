// The quiet hotspot follows the original boat in tile 14, beside the long bridge.
(() => {
 const key='qianli-boat-origin-found',dialog=$('boatEgg');
 let discovered=false;
 try{discovered=localStorage.getItem(key)==='true'}catch{}
 function show(found){
  if(!entered)return;
  $('paintingMenu').hidden=true;
  $('boatEggKicker').textContent=found?'Hidden in the painting · A boat discovery':'A whisper from the boat';
  $('boatEggTitle').textContent=found?'You were here all along.':'Have you seen me before?';
  $('boatEggText').textContent=found?'You found it. The wooden boat beside the long bridge, with its blue-grey cabin and slender mast, inspired your traveling companion. It was here all along, waiting for you to look back.':'I once rested beside a long bridge. A blue-grey cabin, a slender mast. Can you find my counterpart in the original painting and tap it?';
  $('boatEggNote').textContent=found?'A Boat Seeker seal, for you. Across a thousand miles of landscape, you remembered one small boat.':'There is no hurry. Look between the bridge and the shore.';
  $('boatEggSeal').hidden=!found;
  $('boatEggContinue').textContent=found?'Carry on exploring ←':'Keep looking ←';
  if(!dialog.open)dialog.showModal();
 }
 $('boat').onclick=()=>show(discovered);
 $('boatOrigin').onclick=()=>{
  discovered=true;
  try{localStorage.setItem(key,'true')}catch{}
  $('boat').setAttribute('aria-label','Boat discovery: Boat Seeker seal unlocked');
  show(true);
 };
 if(discovered)$('boat').setAttribute('aria-label','Boat discovery: Boat Seeker seal unlocked');
 $('closeBoatEgg').onclick=$('boatEggContinue').onclick=()=>dialog.close();
})();
