'use strict';
(()=>{
 const $=id=>document.getElementById(id),KEY='bb3d-purchase-v1';let purchases=[],purchase=null,slot=null,busy=false,connection=null,creating=null,lastPresence=0,paymentWatchUntil=0,checkingPayment=false;
 const host=document.createElement('section');host.className='purchase-panel';host.id='purchase-panel';
 host.innerHTML=`<p class="eyebrow">1. BESTÄLL · 2. SWISHA · 3. SKAPA</p><h2>Dina 4-pack</h2><p>100 kr per 4-pack med fyra likadana kort. Varje 4-pack får ett eget motiv och två AI-försök efter kontrollerad Swish. Ingen frakt på mässan.</p><form id="purchase-form"><label for="buy-name">Ditt namn</label><input id="buy-name" maxlength="100" autocomplete="name" required><label for="buy-contact">Mejl eller telefon (valfritt)</label><input id="buy-contact" maxlength="180"><label for="buy-packs">Antal 4-pack</label><input id="buy-packs" type="number" min="1" max="25" value="1" required><p id="buy-total">1 × 4-pack · 100 kr · 2 AI-försök</p><button id="buy-submit" type="submit">Beställ och visa Swish</button></form><p id="purchase-message" role="status" aria-live="polite"></p><div id="purchase-list"></div><div id="purchase-current" hidden><h3 id="purchase-reference"></h3><p id="purchase-payment"></p><a id="purchase-swish" class="primary swish-link">Öppna Swish</a><p id="purchase-progress"></p><button id="purchase-refresh" type="button">Kontrollera betalning / uppdatera</button><p>Visa din Swish-betalning för BB3D. När den har kontrollerats öppnas dina motivplatser här. Spara sidan i samma webbläsare tills alla motiv är godkända. Byter du enhet, kontakta BB3D. BB3D ser vilket 4-pack du arbetar med och när du senast var aktiv, så du kan få hjälp.</p><div id="purchase-slots"></div><p id="purchase-selected"></p><a id="switch-editor"></a></div>`;
 const mount=document.getElementById('purchase-mount');if(mount)mount.append(host);else document.querySelector('.editor,.controls').append(host);
 const msg=text=>$('purchase-message').textContent=text;
 async function api(action,body){const r=await fetch('/api/purchase?action='+action,body?{signal:AbortSignal.timeout(25000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok)throw Error(data.error||'Köpet kunde inte hämtas.');return data;}
 function remember(){try{localStorage.setItem(KEY,JSON.stringify({id:purchase?.id,slotId:slot?.id}));}catch{}}
 function notify(){document.dispatchEvent(new Event('bb3d:purchase-change'));presence();}
 async function presence(){if(document.hidden||!purchase||purchase.complete||Date.now()-lastPresence<60000)return;lastPresence=Date.now();try{await api('presence',{purchaseId:purchase.id,slotId:slot?.id||null});}catch{}}
 function render(){
  $('purchase-list').replaceChildren();for(const p of purchases){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Köp '+p.id.slice(0,8).toUpperCase()+' · '+p.details.packs+' 4-pack · '+(p.complete?'Alla motiv klara':p.paid?'Betalt':'Väntar på Swish');b.onclick=()=>choose(p);$('purchase-list').append(b);}
  $('purchase-current').hidden=!purchase;if(!purchase)return;
  $('purchase-reference').textContent='Köp '+purchase.id.slice(0,8).toUpperCase();const payment=purchase.payment;
  $('purchase-payment').textContent=payment.amountSEK+' kr till '+payment.recipient+' · Meddelande: '+payment.message;
  $('purchase-swish').href=payment.url;$('purchase-swish').hidden=purchase.paid;
  $('purchase-progress').textContent=purchase.paid?'Swish kontrollerad · '+purchase.slots.filter(s=>s.ready).length+' av '+purchase.slots.length+' motiv godkända.':'Väntar på att BB3D kontrollerar din betalning.';
  $('purchase-slots').replaceChildren();for(const s of purchase.slots){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='4-pack '+(s.index+1)+(s.ready?' · '+s.player+' · Godkänt':' · Skapa motiv');b.disabled=!purchase.paid||s.ready||purchase.status!=='new';b.setAttribute('aria-pressed',String(slot?.id===s.id));b.onclick=()=>select(s);$('purchase-slots').append(b);}
  $('purchase-selected').textContent=slot?'Du skapar motiv till 4-pack '+(slot.index+1)+'. Två AI-försök ingår för denna plats.':purchase.complete?'Alla motiv är godkända. Tryckbilderna har skickats automatiskt till BB3D:s beställningslista. Dina kort är redo för tillverkning.':'Välj en motivplats när betalningen är kontrollerad.';
  const link=$('switch-editor');link.href=location.pathname==='/fantasy'?'/':'/fantasy';link.textContent=location.pathname==='/fantasy'?'Byt till fotboll eller hockey för denna motivplats':'Byt till Pokémonkort: tränare eller monster';
 }
 function select(s){lastPresence=0;if(window.BB3D_AI_EDITOR?.isBusy?.()){msg('Vänta tills pågående arbete är klart.');return;}slot=s;remember();render();notify();}
 function choose(p){lastPresence=0;if(window.BB3D_AI_EDITOR?.isBusy?.()){msg('Vänta tills pågående arbete är klart.');return;}purchase=p;slot=null;paymentWatchUntil=Date.now()+10*60000;remember();render();notify();}
 async function reload(){const data=await api('list'),id=purchase?.id,slotId=slot?.id;purchases=data.purchases;purchase=purchases.find(p=>p.id===id)||null;slot=purchase?.slots.find(s=>s.id===slotId&&!s.ready)||null;render();notify();}
 $('buy-packs').oninput=()=>{const n=Number($('buy-packs').value);$('buy-total').textContent=n+' × 4-pack · '+n*100+' kr · '+n*2+' AI-försök';};
 $('purchase-form').onsubmit=async e=>{e.preventDefault();if(busy||!connection?.orders)return;busy=true;$('buy-submit').disabled=true;try{const details={customerName:$('buy-name').value.trim(),contact:$('buy-contact').value.trim(),packs:Number($('buy-packs').value)},signature=JSON.stringify(details);if(!creating||creating.signature!==signature){let saved;try{saved=JSON.parse(sessionStorage.getItem('bb3d-purchase-request')||'null');}catch{}creating=saved?.signature===signature?saved:{id:crypto.randomUUID(),signature};sessionStorage.setItem('bb3d-purchase-request',JSON.stringify(creating));}const data=await api('create',{id:creating.id,details});purchase=data.purchase;slot=null;paymentWatchUntil=Date.now()+10*60000;creating=null;sessionStorage.removeItem('bb3d-purchase-request');remember();await reload();msg('Köpet är sparat. Swisha med köpets meddelande och visa betalningen för BB3D.');}catch(e){msg(e.message);}finally{busy=false;$('buy-submit').disabled=false;}};
 $('purchase-refresh').onclick=()=>{paymentWatchUntil=Date.now()+10*60000;reload().catch(e=>msg(e.message));};
 const ready=(async()=>{try{await window.BB3D_AI_EDITOR?.ready;const response=await fetch('/api/config');connection=await response.json();if(!connection.orders)throw Error('Beställningsmottagningen är inte ansluten.');const data=await api('list');purchases=data.purchases;let saved;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}purchase=purchases.find(p=>p.id===saved?.id)||null;slot=purchase?.slots.find(s=>s.id===saved?.slotId&&!s.ready)||null;render();notify();}catch(e){msg(e.message);}})();
 window.BB3D_PURCHASE={ready,current:()=>purchase&&slot?{purchaseId:purchase.id,slotId:slot.id,paid:purchase.paid,ready:slot.ready}:null,reload,
 async submit({png,details,editor}){
  if(!purchase?.paid||!slot||slot.ready)throw Error('Välj ett betalt 4-pack under kortinställningarna först.');const context={purchaseId:purchase.id,slotId:slot.id};
  const imageHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await png.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join(''),signature=imageHash+JSON.stringify(details);let pending;const key='bb3d-pack-upload:'+slot.id;
  try{pending=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}if(pending?.signature!==signature)pending={id:crypto.randomUUID(),signature};sessionStorage.setItem(key,JSON.stringify(pending));
  try{await window.BB3D_UPLOAD(connection.uploadPrefix+pending.id+'.png',png,()=>{});}catch(e){if(!/already exists|alreadyexists/i.test(e.message))throw e;}
  await api('submit',{...context,requestId:pending.id,imageHash,details,editor});sessionStorage.removeItem(key);await reload();msg('Motivet är godkänt och sparat för utskrift. Välj nästa 4-pack om du har fler.');return true;
 }};
 // Only watch the selected unpaid purchase, briefly. A parked editor must not
 // repeatedly scan every customer's orders or write presence/AI state.
 async function checkPayment(){
  if(document.hidden||busy||checkingPayment||window.BB3D_AI_EDITOR?.isBusy?.()||!purchase||purchase.paid||Date.now()>=paymentWatchUntil)return;
  const id=purchase.id;checkingPayment=true;
  try{const data=await api('status&id='+encodeURIComponent(id));if(purchase?.id!==id)return;
   const changed=JSON.stringify(purchase)!==JSON.stringify(data.purchase);purchase=data.purchase;purchases=purchases.map(p=>p.id===id?purchase:p);
   if(changed){render();notify();}
  }catch(e){paymentWatchUntil=0;msg(e.message);}finally{checkingPayment=false;}
 }
 ready.then(()=>{paymentWatchUntil=Date.now()+10*60000;});
 setInterval(checkPayment,30000);
})();
