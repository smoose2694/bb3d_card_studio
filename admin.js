'use strict';
const $=id=>document.getElementById(id);
let orders=[],loading=false,saving=false;
const labels={new:'Ny',production:'Under produktion',done:'Klar'};
const money=value=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:0}).format(value);
const number=value=>new Intl.NumberFormat('sv-SE').format(value);
const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function showLogin(message=''){
  orders=[];$('orders').replaceChildren();$('sales-metrics').replaceChildren();
  for(const id of ['product-sales','club-sales','daily-sales'])$(id).replaceChildren();
  $('statistics').textContent='';$('admin-pane').hidden=true;$('login-pane').hidden=false;$('login-status').textContent=message;
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
  for(const row of rows){const line=el('tr');for(const value of [row.name,number(row.orders),number(row.packs),number(row.cards),money(row.amountSEK)])line.append(el('td',value));body.append(line);}
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
function render(){
  const filter=$('filter').value,visible=orders.filter(o=>filter==='all'||(filter==='done'?o.status==='done':o.status!=='done'));
  const testCount=visible.filter(o=>o.testOrder).length;
  $('count').textContent=(visible.length-testCount)+' beställningar'+(testCount?' · '+testCount+' tester':'');$('orders').replaceChildren();
  if(!visible.length){$('orders').append(el('div','Inga beställningar i den här vyn.','empty'));return;}
  for(const o of visible){
    const row=el('article',undefined,'card'+(o.status==='done'?' done':'')),image=el('img');image.src='/api/card?id='+o.id;image.alt='Kort för '+o.player;image.loading='lazy';
    const info=el('div');info.append(el('h2',o.player),el('span',o.testOrder?'TEST · räknas inte i statistiken':labels[o.status],'tag'),el('p','Kund: '+o.customerName),el('p',o.contact||'Ingen kontaktuppgift angiven'),el('p',o.quantity+' kort · '+o.clubName),el('p',o.amountSEK?o.packs+' × 4-pack · '+money(o.amountSEK):'Äldre testorder utan pris'),el('p',o.paid?'Swish kontrollerad '+day(o.paidAt):'Betalning inte kontrollerad',o.paid?'paid-tag':'unpaid-tag'),el('p','Mottagen '+new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(o.createdAt))),el('small','Order '+o.id.slice(0,8).toUpperCase()));
    const actions=el('div',undefined,'actions'),download=el('a','Hämta tryckfil','download');download.href='/api/card?id='+o.id+'&download=1';
    const paymentLabel=el('label',undefined,'paid-label'),paid=el('input');paid.type='checkbox';paid.checked=o.paid;paid.disabled=saving||!o.amountSEK;paid.dataset.orderControl='payment';paid.setAttribute('aria-label','Swish kontrollerad för '+o.player);paid.onchange=()=>changeOrder(o,{paid:paid.checked});paymentLabel.append(paid,el('span','Swish kontrollerad'));
    const label=el('label','Status '),select=el('select');select.setAttribute('aria-label','Status för '+o.player);select.dataset.orderControl='status';select.disabled=saving;
    for(const [value,text]of Object.entries(labels)){const option=el('option',text);option.value=value;select.append(option);}select.value=o.status;select.onchange=()=>changeOrder(o,{status:select.value});label.append(select);actions.append(download,paymentLabel,label);row.append(image,info,actions);$('orders').append(row);
  }
}
async function refresh(){
  if(loading||saving||$('admin-pane').hidden)return;
  loading=true;$('refresh').disabled=true;$('apply-period').disabled=true;
  try{
    const data=await api('/api/orders');
    const query=new URLSearchParams();if($('date-from').value)query.set('from',$('date-from').value);if($('date-to').value)query.set('to',$('date-to').value);
    const stats=await api('/api/stats?'+query.toString());
    if($('admin-pane').hidden)return;orders=data.orders;render();renderStats(stats);
    $('status').textContent='Uppdaterad '+new Intl.DateTimeFormat('sv-SE',{timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date());
  }catch(e){$('status').textContent=e.message;}
  finally{loading=false;$('refresh').disabled=false;$('apply-period').disabled=false;}
}
function setPeriod(){
  const today=day(new Date()),mode=$('period').value;let from='',to='';
  if(mode==='today')from=to=today;
  if(mode==='week'){const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-6);from=start.toISOString().slice(0,10);to=today;}
  if(mode==='month'){from=today.slice(0,7)+'-01';to=today;}
  if(mode!=='custom'){$('date-from').value=from;$('date-to').value=to;}
  $('date-from').readOnly=$('date-to').readOnly=mode!=='custom';
}
$('period').onchange=()=>{setPeriod();if($('period').value!=='custom')refresh();};
$('period-form').onsubmit=event=>{event.preventDefault();refresh();};
$('login-form').onsubmit=async event=>{
  event.preventDefault();$('login-button').disabled=true;$('login-status').textContent='Loggar in…';
  try{await api('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});$('password').value='';$('login-pane').hidden=true;$('admin-pane').hidden=false;await refresh();}
  catch(e){$('password').value='';$('login-status').textContent=e.message;}
  finally{$('login-button').disabled=false;}
};
$('logout').onclick=async()=>{try{await api('/api/session',{method:'DELETE'});showLogin('Du är utloggad.');}catch(e){$('status').textContent=e.message;}};
$('refresh').onclick=refresh;$('filter').onchange=render;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},30000);
setPeriod();
(async()=>{try{const session=await api('/api/session');if(session.admin){$('login-pane').hidden=true;$('admin-pane').hidden=false;await refresh();}else showLogin();}catch(e){showLogin(e.message);}})();
