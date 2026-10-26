'use strict';
(()=>{
 const editors=window.BB3D_EDITORS,tabs=[...document.querySelectorAll('[data-editor]')],panel=document.getElementById('ai-photo-panel');
 let active='sports';
 const current=()=>editors[active];
 const adapter={ready:Promise.all(Object.values(editors).map(e=>e.ready)),isBusy:()=>Object.values(editors).some(e=>e.isBusy())};
 for(const method of ['getPhoto','getClub','getProfile','getMotif','getConnection','apply'])adapter[method]=(...args)=>current()[method](...args);
 adapter.busy=value=>{current().busy(value);tabs.forEach(t=>t.disabled=value);};
 window.BB3D_AI_EDITOR=adapter;
 function choose(type){
  if(!editors[type]||adapter.isBusy())return;
  active=type;
  for(const t of tabs)t.setAttribute('aria-pressed',String(t.dataset.editor===type));
  for(const key of ['sports','fantasy'])document.getElementById(key==='sports'?'sports-editor':'fantasy-editor').hidden=key!==type;
  document.querySelector('[data-ai-mount="'+type+'"]').append(panel);
  document.getElementById('ai-photo-title').textContent=type==='sports'?'Bli stjärnan på ditt sportkort':'Skapa ditt Pokémonjag';
  document.dispatchEvent(new Event('bb3d:profile-change'));
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>choose(tab.dataset.editor)));
 const update=()=>{document.getElementById('ai-unlock').hidden=!!window.BB3D_PURCHASE?.current()?.paid;};
 document.addEventListener('bb3d:purchase-change',update);
 choose(window.BB3D_WP?.page==='fantasy'||location.pathname==='/fantasy'?'fantasy':'sports');
 update();
})();
