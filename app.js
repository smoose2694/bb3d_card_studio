'use strict';
(() => {
  const A = window.BB3D_ASSETS;
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const XLINK = 'http://www.w3.org/1999/xlink';
  const labels = ['FART', 'SKOTT', 'PASS', 'TEKNIK', 'FÖRSVAR', 'LAGANDA'];
  // Derived palette variants retain all paths, framing and cropping from the supplied original.
  const clubs = {
    'FBK Karlstad': {logo:'FBK_Karlstad',primary:'#c80b2c',accent:'#ffffff',name:'RÖD / VIT'},
    'Norrstrands IF': {logo:'Norrstrands_IF',primary:'#c80b2c',accent:'#ffffff',name:'RÖD / VIT'},
    'Råtorps IK': {logo:'Ratorps_IK',primary:'#76c7ea',accent:'#ffffff',name:'LJUSBLÅ / VIT'},
    'Hertzöga BK': {logo:'Hertzoga_BK',primary:'#f2d334',accent:'#318645',name:'GUL / GRÖN'},
    'Egen klubb': {logo:null,primary:'#c80b2c',accent:'#ffffff',name:'EGNA FÄRGER'}
  };
  let state = {name:'SPELARNAMN',club:'FBK Karlstad',clubName:'FBK Karlstad',position:'ANFALLARE',total:87,
    stats:[88,84,81,91,67,99],primary:'#c80b2c',accent:'#ffffff',photo:null,logo:null,zoom:100,panX:0,panY:0};
  let side = 'front';
  let photoSize = null;
  let ready = false;
  let exporting = false;
  let sending = false, connection = null, pending = null;
  let photoRead = 0, logoRead = 0;
  const measure = document.createElement('canvas').getContext('2d');
  const numeric = (value,min,max,fallback=min) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min,Math.min(max,Math.round(n))) : fallback;
  };
  function status(message,error=false) { $('status').textContent=message; $('status').classList.toggle('error',error); }
  function make(tag,attrs={},text) {
    const el=document.createElementNS(NS,tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
    if(text!==undefined) el.textContent=text;
    return el;
  }
  function fontStyle() {
    return `@font-face{font-family:CardFont;src:url('${A.font}') format('truetype');font-weight:400 500;}@font-face{font-family:CardFont;src:url('${A.bold}') format('truetype');font-weight:600 900;}`;
  }
  function shade(hex,factor) {
    const rgb=hex.slice(1).match(/../g).map(x=>Math.round(parseInt(x,16)*factor));
    return '#'+rgb.map(x=>Math.min(255,x).toString(16).padStart(2,'0')).join('');
  }
  function palette(svg) {
    // Red/white defaults use the exact original colors. Other variants use this explicit mapping.
    const map = state.primary==='#c80b2c' && state.accent==='#ffffff' ? {} : {
      '#71091e':shade(state.primary,.54),'#370712':shade(state.primary,.28),'#16070c':shade(state.primary,.13),
      '#ed2946':state.primary,'#ff8090':state.accent,'#570717':shade(state.primary,.4),'#350712':shade(state.primary,.22),
      '#eaaab6':shade(state.primary,.55),'#fff8f7':'#fffdf6','#830019':shade(state.primary,.36),'#c80b2c':shade(state.primary,.65),
      '#aa0624':shade(state.primary,.50),'#8d051e':shade(state.primary,.55),'#ffe2e6':'#f5f1df','#ffffff':state.accent
    };
    for(const e of svg.querySelectorAll('*')) for(const attr of ['fill','stroke','stop-color']) {
      const v=e.getAttribute(attr); if(map[v]) e.setAttribute(attr,map[v]);
    }
  }
  function fitText(el,text,maxWidth,maxSize) {
    el.textContent=text;
    const spacing=Number(el.getAttribute('letter-spacing')||0);
    let size=maxSize;
    measure.font=`800 ${size}px CardFont`;
    const width=measure.measureText(text).width+Math.max(0,[...text].length-1)*spacing;
    if(width>maxWidth) size=Math.max(5,maxSize*(maxWidth-Math.max(0,text.length-1)*spacing)/Math.max(1,measure.measureText(text).width));
    el.setAttribute('font-size',size.toFixed(2));
    // A final SVG width cap also handles very long Unicode input and unusual glyphs.
    if(size<8) { el.setAttribute('textLength',maxWidth); el.setAttribute('lengthAdjust','spacingAndGlyphs'); }
  }
  function buildSVG(which) {
    const svg=new DOMParser().parseFromString(A[which],'image/svg+xml').documentElement;
    // Keep the original clip geometry, but avoid an ID collision with the upload input.
    const clip=svg.querySelector('clipPath#photo');
    if(clip){clip.id='card-photo';svg.querySelector('g[clip-path="url(#photo)"]')?.setAttribute('clip-path','url(#card-photo)');}
    svg.setAttribute('width','1488'); svg.setAttribute('height','2079');
    svg.setAttribute('role','img'); svg.setAttribute('aria-label',`${which==='front'?'Framsida':'Baksida'}: ${state.name}, ${state.clubName}`);
    svg.querySelector('defs').appendChild(make('style',{},fontStyle()));
    for(const e of svg.querySelectorAll('text')) e.setAttribute('font-family','CardFont');
    palette(svg);
    const logo=svg.querySelector('image');
    const logoSource=state.logo||A.logos[clubs[state.club].logo];
    if(logoSource)logo.setAttributeNS(XLINK,'xlink:href',logoSource);else logo.remove();
    const clubText=make('text',{x:345,y:which==='front'?220:650,fill:'#ffffff','font-family':'CardFont','font-weight':700,'font-size':which==='front'?13:22,'text-anchor':'middle','letter-spacing':2});
    fitText(clubText,state.clubName.toLocaleUpperCase('sv-SE'),which==='front'?300:470,which==='front'?13:22);
    svg.appendChild(clubText);
    if(which==='front') {
      const textAt=(x,y)=>svg.querySelector(`text[x="${x}"][y="${y}"]`);
      fitText(textAt(345,706),state.name.toLocaleUpperCase('sv-SE')||'SPELARNAMN',475,42);
      fitText(textAt(345,760),state.position,170,22);
      textAt(547,264).textContent=state.total;
      labels.forEach((_,i)=>textAt([165,345,525][i%3],i<3?815:860).textContent=state.stats[i]);
      if(state.photo && photoSize) {
        const group=svg.querySelector('g[clip-path="url(#card-photo)"]');
        const scale=Math.max(502/photoSize.width,403/photoSize.height)*state.zoom/100;
        const w=photoSize.width*scale,h=photoSize.height*scale;
        const x=94-(w-502)/2+(w-502)*state.panX/200;
        const y=235-(h-403)/2+(h-403)*state.panY/200;
        const photo=make('image',{x,y,width:w,height:h,preserveAspectRatio:'none'});
        photo.setAttributeNS(XLINK,'xlink:href',state.photo);
        group.replaceChildren(photo);
        textAt(345,569).remove(); textAt(345,599).remove();
      }
    }
    return svg;
  }
  function render() {
    if(!ready) return;
    if(!sending&&document.getElementById('approve')) $('approve').checked=false;
    $('card').replaceChildren(buildSVG(side));
    $('sum').textContent=`Poängsumma: ${state.stats.reduce((a,b)=>a+b,0)} · Medelvärde: ${(state.stats.reduce((a,b)=>a+b,0)/6).toFixed(1)}. Totalrating ändras bara av dig.`;
    $('club-caption').textContent=`${state.clubName.toLocaleUpperCase('sv-SE')} · ${state.primary===clubs[state.club].primary && state.accent===clubs[state.club].accent?clubs[state.club].name:'EGNA FÄRGER'}`;
    $('photo-controls').hidden=!state.photo;
  }
  function syncForm() {
    for(const id of ['name','club','clubName','position','total','primary','accent','zoom','panX','panY']) $(id).value=state[id];
    state.stats.forEach((v,i)=>$(`stat-${i}`).value=v);
    render();
  }
  labels.forEach((label,i)=>{
    const wrap=document.createElement('div'),l=document.createElement('label'),input=document.createElement('input');
    l.htmlFor=`stat-${i}`; l.textContent=label;
    Object.assign(input,{id:`stat-${i}`,type:'number',min:'1',max:'99',value:state.stats[i],required:true});
    input.addEventListener('input',()=>{state.stats[i]=numeric(input.value,1,99,state.stats[i]);render();});
    input.addEventListener('change',()=>{input.value=state.stats[i];});
    wrap.append(l,input);$('stats').appendChild(wrap);
  });
  $('editor-form').addEventListener('submit',submitOrder);
  for(const id of ['name','clubName','position','primary','accent','zoom','panX','panY','total']) {
    $(id).addEventListener('input',()=>{
      state[id]=['zoom','panX','panY','total'].includes(id)?numeric($(id).value,id==='total'?1:id==='zoom'?100:-100,id==='total'?99:id==='zoom'?300:100,state[id]):$(id).value;
      render();
    });
    $(id).addEventListener('change',()=>{if(id==='total') $(id).value=state.total;});
  }
  $('club').addEventListener('change',()=>{
    state.club=$('club').value; state.clubName=state.club; state.logo=null;
    state.primary=clubs[state.club].primary; state.accent=clubs[state.club].accent; $('logo').value='';logoRead++;
    syncForm();status('Klubbmall, färger och logotyp uppdaterade.');
  });
  $('clear-logo').addEventListener('click',()=>{
    state.logo=null;logoRead++;$('logo').value='';state.primary=clubs[state.club].primary;state.accent=clubs[state.club].accent;syncForm();status('Klubbens logotyp och färger är återställda.');
  });
  $('random').addEventListener('click',()=>{
    // Start at the exact target sum, then transfer points between two distinct stats.
    // Transfers cannot leave the 1–99 range and cannot change the sum.
    const stats=Array(6).fill(state.total);
    for(let n=0;n<120;n++) {
      const from=Math.floor(Math.random()*6),to=(from+1+Math.floor(Math.random()*5))%6;
      const amount=Math.min(1+Math.floor(Math.random()*8),stats[from]-1,99-stats[to]);
      stats[from]-=amount;stats[to]+=amount;
    }
    state.stats=stats;syncForm();status(`Stats slumpade med ${state.total*6} poäng totalt.`);
  });
  function loadImage(src) {return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Bilden kunde inte läsas. Välj en giltig PNG-, JPG- eller WebP-fil.'));image.src=src;});}
  async function readImageFile(file) {
    if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Välj PNG, JPG eller WebP.');
    if(file.size>15*1024*1024) throw new Error('Bilden är för stor. Högst 15 MB.');
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Filen kunde inte läsas.'));r.readAsDataURL(file);});
    const image=await loadImage(data);
    if(image.width*image.height>50000000) throw new Error('Bilden är för stor. Välj en bild med högst 50 megapixlar.');
    // Normalize uploads to PNG for reliable embedded SVG export and orientation handling.
    const c=document.createElement('canvas');const scale=Math.min(1,3000/Math.max(image.width,image.height));
    c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));
    c.getContext('2d').drawImage(image,0,0,c.width,c.height);
    return {data:c.toDataURL('image/png'),width:c.width,height:c.height};
  }
  for(const kind of ['photo','logo']) $(kind).addEventListener('change',async()=>{
    const file=$(kind).files[0];if(!file)return;
    const token=kind==='photo'?++photoRead:++logoRead;
    try {
      photoReadPending++;status('Läser bilden…');
      const result=await readImageFile(file);
      if(token!==(kind==='photo'?photoRead:logoRead))return;
      if(sending)throw new Error('Vänta tills beställningen är klar innan bilden ändras.');
      state[kind]=result.data;
      if(kind==='photo') {photoSize=result;state.zoom=100;state.panX=0;state.panY=0;}
      syncForm();status('Bilden är inläst. Den skickas till BB3D först när du bekräftar beställningen.');
    } catch(e) {status(e.message,true);} finally {photoReadPending=Math.max(0,photoReadPending-1);$(kind).value='';}
  });
  $('clear-photo').addEventListener('click',()=>{photoRead++;state.photo=null;photoSize=null;$('photo').value='';render();status('Fotot är borttaget.');});
  for(const which of ['front','back']) $(`show-${which}`).addEventListener('click',()=>{
    side=which;for(const s of ['front','back'])$(`show-${s}`).setAttribute('aria-pressed',String(s===side));render();
  });
  function crc32(bytes) {
    let c=0xffffffff;
    for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}
    return (c^0xffffffff)>>>0;
  }
  function chunk(type,data) {
    const bytes=new Uint8Array(data.length+12),v=new DataView(bytes.buffer);
    v.setUint32(0,data.length);bytes.set(new TextEncoder().encode(type),4);bytes.set(data,8);
    v.setUint32(bytes.length-4,crc32(bytes.subarray(4,bytes.length-4)));return bytes;
  }
  async function withPrintDensity(blob) {
    const src=new Uint8Array(await blob.arrayBuffer());
    const density=new Uint8Array(9),v=new DataView(density.buffer);
    // Individually rounded pixels per metre encode 63 × 88 mm within 0.001 mm.
    v.setUint32(0,23619);v.setUint32(4,23625);density[8]=1;
    const parts=[src.subarray(0,8)];
    // pHYs belongs after IHDR, before image data. Strip any browser-generated density.
    let p=8;
    while(p<src.length){const len=new DataView(src.buffer,src.byteOffset+p,4).getUint32(0);const type=new TextDecoder().decode(src.subarray(p+4,p+8));
      if(type!=='pHYs')parts.push(src.subarray(p,p+len+12));
      if(type==='IHDR')parts.push(chunk('pHYs',density));p+=len+12;
    }
    return new Blob(parts,{type:'image/png'});
  }
  async function exportPNG(which) {
    if(!ready||exporting)return;
    exporting=true;
    try {
      status('Skapar tryckfil…');await document.fonts.ready;
      const xml=new XMLSerializer().serializeToString(buildSVG(which));
      const svgUrl=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
      let image;try{image=await loadImage(svgUrl);}finally{URL.revokeObjectURL(svgUrl);}
      const c=document.createElement('canvas');c.width=1488;c.height=2079;
      const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      const raw=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('PNG-exporten misslyckades.')),'image/png'));
      const png=await withPrintDensity(raw);
      return png;
    }finally{exporting=false;}
  }
  async function connectOrders(){try{const r=await fetch('/api/config');if(!r.ok)throw Error();connection=await r.json();$('submit-order').disabled=!connection.orders;$('order-status').textContent=connection.orders?'Redo att skicka din beställning till BB3D.':'Beställningsmottagningen är inte ansluten ännu. Inget kan skickas.';}catch{$('submit-order').disabled=true;$('order-status').textContent='Ingen anslutning till BB3D. Försök ladda om sidan.';}}
  async function submitOrder(event){event.preventDefault();if(sending)return;try{
    if(!connection?.orders)throw Error('Beställningsmottagningen är inte ansluten.');if(!state.photo)throw Error('Ladda upp ett spelarfoto först.');if(photoReadPending)throw Error('Vänta tills bilden har lästs in.');if(!state.name.trim()||state.name.trim().toUpperCase()==='SPELARNAMN')throw Error('Ange spelarens namn på kortet.');if(!$('approve').checked)throw Error('Granska kortet och godkänn förhandsvisningen först.');if(!$('editor-form').reportValidity())return;
    const details={customerName:$('customer-name').value.trim(),contact:$('contact').value.trim(),quantity:Number($('quantity').value)*4,approved:true,player:state.name.trim(),club:state.club,clubName:state.clubName,position:state.position,stats:[...state.stats],total:state.total};
    sending=true;const controls=[...document.querySelectorAll('input,select,button')],previous=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);$('submit-order').textContent='Skickar ditt kort…';$('receipt').hidden=true;$('payment').hidden=true;$('swish-link').removeAttribute('href');side='front';render();
    try{const png=await exportPNG('front');if(!png||png.size>12*1024*1024)throw Error('Kortfilen är för stor. Välj en mindre bild.');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await png.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join(''),signature=hash+JSON.stringify(details);
      if(!pending||pending.signature!==signature)pending={signature,id:crypto.randomUUID(),uploaded:false,confirmed:false};
      if(!pending.uploaded){$('order-status').textContent='Laddar upp din färdiga kortbild…';try{await window.BB3D_UPLOAD(connection.uploadPrefix+pending.id+'.png',png,p=>{$('order-status').textContent='Laddar upp kortbilden: '+Math.round(p.percentage)+' %';});pending.uploaded=true;}catch(e){if(!/already exists|alreadyexists/i.test(e.message))throw e;pending.uploaded=true;}}
      $('order-status').textContent='Bekräftar att BB3D har tagit emot beställningen…';const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:pending.id,details,imageHash:hash})}),data=await r.json();if(!r.ok||!data.receipt)throw Error(data.error||'Beställningen kunde inte bekräftas.');pending.confirmed=true;$('receipt').textContent='Tack! BB3D har tagit emot din beställning '+data.receipt.id.slice(0,8).toUpperCase()+'. '+details.quantity+' kort för '+details.player+'.';$('receipt').hidden=false;const payment=data.receipt.payment;if(payment){$('payment-summary').textContent=payment.amountSEK+' kr till '+payment.recipient+' · Meddelande: '+payment.message;$('swish-link').href=payment.url;$('swish-link').textContent='Öppna Swish – '+payment.amountSEK+' kr';$('payment').hidden=false;}$('order-status').textContent='Beställningen är mottagen. Betala med Swish och visa betalningen för BB3D innan tillverkning.';status('Beställningen är mottagen.');
    }finally{controls.forEach((n,i)=>n.disabled=previous[i]);$('submit-order').textContent='Bekräfta för utskrift';sending=false;}
  }catch(e){$('order-status').textContent=e.message+' Om du inte har fått ett kvitto kan du försöka igen. Samma beställning skickas inte dubbelt.';status(e.message,true);sending=false;}}
  $('quantity').addEventListener('input',()=>{const packs=Number($('quantity').value);$('order-total').textContent=Number.isInteger(packs)&&packs>=1&&packs<=25?packs+' × 4-pack · '+packs*4+' kort · totalt '+packs*100+' kr':'Välj 1–25 stycken 4-pack.';});
  let photoReadPending=0;

  async function init() {
    try {
      const regular=new FontFace('CardFont',`url(${A.font})`,{weight:'400'});
      const bold=new FontFace('CardFont',`url(${A.bold})`,{weight:'800'});
      const fonts=await Promise.all([regular.load(),bold.load()]);fonts.forEach(f=>document.fonts.add(f));
      const style=document.createElement('style');style.textContent=fontStyle();document.head.appendChild(style);
      ready=true;syncForm();await connectOrders();
      status('Redo. Ladda upp en bild och skapa ditt kort.');
    }catch(e){status('Kunde inte starta studion: '+e.message,true);}
  }
  init();
})();

