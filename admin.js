'use strict';
const $=id=>document.getElementById(id);
let orders=[],loading=false,saving=false,refreshQueued=false;
let activeRange={from:'',to:''};
const cardLabel=value=>String(value||'').replace(/^BB3D Fantasy(?= ·|$)/,'BB3D Pokémonkort').replace(/(^| · )Fantasy$/,'$1Pokémonkort');
const labels={new:'Ny',production:'Under produktion',done:'Klar'};
const money=value=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:0}).format(value);
const number=value=>new Intl.NumberFormat('sv-SE').format(value);
const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function showLogin(message=''){
  orders=[];$('orders').replaceChildren();$('sales-metrics').replaceChildren();
  for(const id of ['product-sales','club-sales','daily-sales'])$(id).replaceChildren();
  $('statistics').textContent='';document.dispatchEvent(new Event('bb3d:admin-logout'));$('admin-pane').hidden=true;$('login-pane').hidden=false;$('login-status').textContent=message;
}
async function api(path,options){
  const r=await fetch(path,options);let data;
  try{data=await r.json();}catch{throw Error('Servern kunde inte svara. Försök igen.');}
  if(r.status===401){showLogin('Logga in för att fortsätta.');throw Error(data.error||'Logga in.');}
  if(!r.ok)throw Error(data.error||'Åtgärden misslyckades.');return data;
}
function table(target,rows,label){
  const container=$(target);container.replaceChildren();
  if(!rows.length){container.append(el('p','Inga betalda beställningar i perioden.','muted'));return;}
  const wrap=el('div',undefined,'table-wrap'),t=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');
  for(const title of [label,'Order','4-pack','Kort','Betalt']){const th=el('th',title);th.scope='col';tr.append(th);}
  head.append(tr);
  for(const row of rows){const line=el('tr');for(const value of [cardLabel(row.name),number(row.orders),number(row.packs),number(row.cards),money(row.amountSEK)])line.append(el('td',value));body.append(line);}
  t.append(head,body);wrap.append(t);container.append(wrap);
}
function renderStats(stats){
  $('stats-caption').textContent=stats.from||stats.to?'Visar '+(stats.from||'start')+' – '+(stats.to||'idag'):'Visar all tid';
  $('sales-metrics').replaceChildren();
  const metrics=[['Betalt',money(stats.paidSEK),'Manuellt kontrollerad Swish'],['Sålda 4-pack',number(stats.paidPacks),'4 likadana kort per pack'],['Sålda kort',number(stats.paidCards),'Kort i betalda beställningar'],['Betalda beställningar',number(stats.paidOrders),'Bekräftade betalningar'],['Väntar på betalning',money(stats.unpaidSEK),number(stats.unpaidOrders)+' obetalda beställningar'],['Klara beställningar',number(stats.done),'Produktionsstatus i perioden']];
  for(const [title,value,detail]of metrics){const card=el('div',undefined,'metric');card.append(el('span',title),el('strong',value),el('small',detail));$('sales-metrics').append(card);}
  $('statistics').textContent='Beställt i perioden: '+number(stats.orders)+' beställningar · '+number(stats.cards)+' kort. '+number(stats.excludedTests)+' testorder räknas bort.';
  $('stats-warning').textContent=stats.unpricedOrders?stats.unpricedOrders+' äldre beställningar saknar sparat pris och ingår inte i beloppen.':'';
  table('product-sales',stats.products,'Korttyp / sport');table('club-sales',stats.salesByClub,'Förening');table('daily-sales',stats.days,'Kontrollerad datum');
}
async function changeOrder(order,patch){
  if(saving||loading){render();return;}
  saving=true;for(const input of document.querySelectorAll('[data-order-control]'))input.disabled=true;
  let error;
  try{await api('/api/order?id='+order.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...patch,updatedAt:order.updatedAt})});}
  catch(e){error=e.message;}
  finally{saving=false;}
  await refresh();
  if(!$('admin-pane').hidden)$('status').textContent=error||'Beställningen uppdaterades.';
}
async function giveExtra(order,slot){
 if(saving||loading)return;saving=true;for(const input of document.querySelectorAll('[data-order-control]'))input.disabled=true;const key='bb3d-bonus:'+order.id+':'+slot.id;let requestId=sessionStorage.getItem(key);if(!requestId){requestId=crypto.randomUUID();sessionStorage.setItem(key,requestId);}let message;
 try{const result=await api('/api/ai?action=bonus',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({purchaseId:order.id,slotId:slot.id,requestId})});sessionStorage.removeItem(key);message='Två extra AI-försök tilldelade till 4-pack '+(order.slots.findIndex(s=>s.id===slot.id)+1)+'. Be kunden trycka Kontrollera betalning / uppdatera.'+(result.dailyCapReached?' Dagens gemensamma AI-tak är nått. Kontrollera dygnstaket ovan innan kunden försöker igen.':'');}
 catch(e){message=e.message;}finally{saving=false;}await refresh();$('status').textContent=message;
}
function render(){
  const filter=$('filter').value,visible=orders.filter(o=>filter==='all'||(filter==='editing'?o.kind==='purchase'&&!o.complete&&Date.now()-o.activeAt<180000:filter==='ready'?!o.testOrder&&o.paid&&o.complete&&o.status==='new':filter==='done'?o.status==='done':o.status!=='done'));
  const testCount=visible.filter(o=>o.testOrder).length;
  $('count').textContent=(visible.length-testCount)+' beställningar · '+orders.filter(o=>!o.testOrder&&o.paid&&o.complete&&o.status==='new').length+' redo att printa'+(testCount?' · '+testCount+' tester':'');$('orders').replaceChildren();
  if(!visible.length){$('orders').append(el('div','Inga beställningar i den här vyn.','empty'));return;}
  for(const o of visible){
    const row=el('article',undefined,'card'+(o.kind==='purchase'?' purchase':'')+(o.status==='done'?' done':'')),image=el('img');if(o.kind==='purchase'){image.hidden=true;}else image.src='/api/card?id='+o.id;image.alt='Kort för '+o.player;image.loading='lazy';
    const info=el('div');info.append(el('h2',o.kind==='purchase'?'Köp '+o.id.slice(0,8).toUpperCase()+' · '+o.slots.filter(s=>s.ready).length+'/'+o.slots.length+' motiv klara':o.player),el('span',o.testOrder?'TEST · räknas inte i statistiken':o.paid&&o.complete&&o.status==='new'?'Redo att printa':labels[o.status],'tag'),el('p','Kund: '+o.customerName),el('p',o.contact||'Ingen kontaktuppgift angiven'),el('p',o.kind==='purchase'?o.quantity+' kort · separata motiv nedan':o.quantity+' kort · '+cardLabel(o.clubName)+' · '+cardLabel(o.sport||'Fotboll')),el('p',o.amountSEK?o.packs+' × 4-pack · '+money(o.amountSEK):'Äldre testorder utan pris'),el('p',o.paid?'Swish kontrollerad '+day(o.paidAt):'Betalning inte kontrollerad',o.paid?'paid-tag':'unpaid-tag'),el('p','Mottagen '+new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(o.createdAt))),el('small','Order '+o.id.slice(0,8).toUpperCase()));
    if(o.kind==='purchase'){const recent=o.activeAt&&Date.now()-o.activeAt<180000;const activePack=o.slots.findIndex(s=>s.id===o.activeSlot);info.append(el('p',recent?'Aktiv senaste 3 minuterna'+(activePack>=0?' · arbetar med 4-pack '+(activePack+1):''):o.activeAt?'Senast aktiv '+new Intl.DateTimeFormat('sv-SE',{timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(o.activeAt)):'Ingen aktuell aktivitet','muted'));}
    const actions=el('div',undefined,'actions'),download=el('a','Hämta tryckfil','download');download.href='/api/card?id='+o.id+'&download=1';
    const paymentLabel=el('label',undefined,'paid-label'),paid=el('input');paid.type='checkbox';paid.checked=o.paid;paid.disabled=saving||!o.amountSEK;paid.dataset.orderControl='payment';paid.setAttribute('aria-label','Swish kontrollerad för '+o.player);paid.onchange=()=>changeOrder(o,{paid:paid.checked});paymentLabel.append(paid,el('span','Swish kontrollerad'));
    const label=el('label','Status '),select=el('select');select.setAttribute('aria-label','Status för '+o.player);select.dataset.orderControl='status';select.disabled=saving;
    for(const [value,text]of Object.entries(labels)){const option=el('option',text);option.value=value;select.append(option);}select.value=o.status;select.onchange=()=>changeOrder(o,{status:select.value});label.append(select);if(o.kind==='purchase'){download.hidden=true;const motifs=el('div',undefined,'motifs');info.append(motifs);for(const [index,s]of o.slots.entries()){const caption=el('p','4-pack '+(index+1)+' · '+(s.ready?s.player+' · '+cardLabel(s.sport)+(s.variant?' · '+s.variant:''):'Motiv väntar'));const tile=el('section',undefined,'motif-card');tile.append(caption);motifs.append(tile);if(!s.ready){tile.append(el('p',(s.ai?.attemptsRemaining??2)+' av '+(s.ai?.maxAttempts??2)+' AI-försök kvar','muted'));const bonus=el('button','Ge 2 extra AI-försök');bonus.type='button';bonus.dataset.orderControl='bonus';bonus.disabled=saving||(!window.BB3D_WP&&!o.paid)||o.status!=='new';bonus.onclick=()=>giveExtra(o,s);tile.append(bonus);}if(s.ready){const img=el('img');img.src='/api/card?id='+o.id+'&slot='+s.id;img.alt=s.player;img.loading='lazy';const a=el('a','Hämta 4-pack '+(index+1),'download');a.href='/api/card?id='+o.id+'&slot='+s.id+'&download=1';tile.append(img,a);}}for(const option of select.options)if(option.value!=='new')option.disabled=!o.paid||!o.complete;}const testLabel=el('label',undefined,'paid-label'),test=el('input');test.type='checkbox';test.checked=o.testOrder;test.disabled=saving;test.dataset.orderControl='test';test.setAttribute('aria-label','Testorder för '+o.id.slice(0,8));test.onchange=()=>changeOrder(o,{testOrder:test.checked});testLabel.append(test,el('span','Testorder – räknas inte som försäljning'));actions.append(download,paymentLabel,testLabel,label);row.append(image,info,actions);$('orders').append(row);
  }
}
async function refresh(){
  if(loading){refreshQueued=true;return;}
  if(saving||$('admin-pane').hidden)return;
  loading=true;$('refresh').disabled=true;$('apply-period').disabled=true;
  try{
    const data=await api('/api/orders');
    const query=new URLSearchParams();if(activeRange.from)query.set('from',activeRange.from);if(activeRange.to)query.set('to',activeRange.to);
    const stats=await api('/api/stats?'+query.toString());
    if($('admin-pane').hidden)return;orders=data.orders;render();renderStats(stats);document.dispatchEvent(new Event('bb3d:admin-ready'));
    $('status').textContent='Uppdaterad '+new Intl.DateTimeFormat('sv-SE',{timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date());
  }catch(e){$('status').textContent=e.message;}
  finally{loading=false;$('refresh').disabled=false;$('apply-period').disabled=false;if(refreshQueued){refreshQueued=false;refresh();}}
}
function setPeriod(){
  const today=day(new Date()),mode=$('period').value;let from='',to='';
  if(mode==='today')from=to=today;
  if(mode==='week'){const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-6);from=start.toISOString().slice(0,10);to=today;}
  if(mode==='month'){from=today.slice(0,7)+'-01';to=today;}
  if(mode!=='custom'){$('date-from').value=from;$('date-to').value=to;}
  $('date-from').readOnly=$('date-to').readOnly=mode!=='custom';
}
function applyRange(){
  if(!$('period-form').reportValidity())return;
  const from=$('date-from').value,to=$('date-to').value;
  if(from&&to&&from>to){$('status').textContent='Fråndatum får inte vara efter tilldatum.';return;}
  activeRange={from,to};refresh();
}
$('period').onchange=()=>{setPeriod();if($('period').value!=='custom')applyRange();};
$('period-form').onsubmit=event=>{event.preventDefault();applyRange();};
$('login-form').onsubmit=async event=>{
  event.preventDefault();$('login-button').disabled=true;$('login-status').textContent='Loggar in…';
  try{await api('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});$('password').value='';$('login-pane').hidden=true;$('admin-pane').hidden=false;await refresh();}
  catch(e){$('password').value='';$('login-status').textContent=e.message;}
  finally{$('login-button').disabled=false;}
};
$('logout').onclick=async()=>{try{await api('/api/session',{method:'DELETE'});showLogin('Du är utloggad.');}catch(e){$('status').textContent=e.message;}};
$('refresh').onclick=refresh;$('filter').onchange=render;
// Refresh after actions and on request; an open admin tab must not continuously
// rescan orders, presence and sales records against the Blob allowance.
setPeriod();
(async()=>{try{const session=await api('/api/session');if(session.admin){$('login-pane').hidden=true;$('admin-pane').hidden=false;await refresh();}else showLogin();}catch(e){showLogin(e.message);}})();
