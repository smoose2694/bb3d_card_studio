'use strict';
(() => {
  const A = window.BB3D_ASSETS;
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const XLINK = 'http://www.w3.org/1999/xlink';
  const profiles=window.BB3D_CARD_PROFILES;
  const profile=()=>profiles.find(p=>p.id===state.profileId);
  const statLabels=()=>state.position==='MÅLVAKT'&&profile().goalieStats?profile().goalieStats:profile().stats;
  // Derived palette variants retain all paths, framing and cropping from the supplied original.
  const clubs = {
    'FBK Karlstad': {logo:'FBK_Karlstad',primary:'#c80b2c',accent:'#ffffff',name:'RÖD / VIT'},
    'Norrstrands IF': {logo:'Norrstrands_IF',primary:'#f30f24',accent:'#ffffff',name:'RÖD / VIT'},
    'Fiskeviks IF': {logo:'Fiskeviks_IF',primary:'#009849',accent:'#ffffff',name:'VIT / GRÖN'},
    'Råtorps IK': {logo:'Ratorps_IK',primary:'#68cbea',accent:'#ffffff',name:'LJUSBLÅ / VIT'},
    'Hertzöga BK': {logo:'Hertzoga_BK',primary:'#ffe62b',accent:'#005b2b',name:'GUL / GRÖN'},
    'Egen hockeyklubb': {logo:null,primary:'#1c6192',accent:'#ffffff',name:'EGNA HOCKEYFÄRGER'},
    'Egen klubb': {logo:null,primary:'#c80b2c',accent:'#ffffff',name:'EGNA FÄRGER'}
  };
  // Club-specific print palettes follow the supplied front/back references.
  const referencePalettes = {
    'Norrstrands IF': {background:['#f31329','#ed0824','#d42137'],ink:'#ffffff',name:'#830019',panel:'#fff8f7',badge:'#bc0026',position:'#e50024',circle:'#900024',photo:['#c70a26','#aa0922']},
    'Råtorps IK': {background:['#93dff1','#68cbea','#49b8df'],ink:'#004a70',name:'#004a70',panel:'#ffffff',badge:'#d6f4ff',position:'#e2f7ff',circle:'#d6f4ff',photo:['#56bfdc','#3da4cb']},
    'Hertzöga BK': {background:['#e1e95f','#ffeb28','#e2cf2a'],ink:'#005b2b',name:'#005b2b',panel:'#ffffff',badge:'#f8f1a0',position:'#fff9b0',circle:'#f8f1a0',photo:['#e1d934','#d3ce30']}
  };
  let state = {profileId:'future-star-football',name:'SPELARNAMN',club:'FBK Karlstad',clubName:'FBK Karlstad',position:'ANFALLARE',total:87,
    stats:[88,84,81,91,67,99],primary:'#c80b2c',accent:'#ffffff',photo:null,logo:null,zoom:100,panX:0,panY:0};
  let side = 'front';
  let photoSize = null, sourcePhoto = null;
  let ready = false;
  let exporting = false;
  let sending = false, connection = null, pending = null;
  let photoRead = 0, logoRead = 0, aiWorking = false;
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
    const reference=referencePalettes[state.club];
    const useReference=reference&&state.primary===clubs[state.club].primary&&state.accent===clubs[state.club].accent;
    // Red/white defaults use the exact original colors. Other variants use this explicit mapping.
    const map = useReference ? {
      '#71091e':reference.background[0],'#370712':reference.background[1],'#16070c':reference.background[2],
      '#ed2946':state.primary,'#ff8090':'#ffffff','#570717':reference.photo[0],'#350712':reference.photo[1],
      '#eaaab6':reference.badge,'#fff8f7':reference.panel,'#830019':reference.name,'#c80b2c':reference.position,
      '#aa0624':reference.badge,'#8d051e':reference.circle,'#ffe2e6':reference.ink,'#ffffff':'#ffffff'
    } : state.primary==='#c80b2c' && state.accent==='#ffffff' ? {} : {
      '#71091e':shade(state.primary,.54),'#370712':shade(state.primary,.28),'#16070c':shade(state.primary,.13),
      '#ed2946':state.primary,'#ff8090':state.accent,'#570717':shade(state.primary,.4),'#350712':shade(state.primary,.22),
      '#eaaab6':shade(state.primary,.55),'#fff8f7':'#fffdf6','#830019':shade(state.primary,.36),'#c80b2c':shade(state.primary,.65),
      '#aa0624':shade(state.primary,.50),'#8d051e':shade(state.primary,.55),'#ffe2e6':'#f5f1df','#ffffff':state.accent
    };
    for(const e of svg.querySelectorAll('*')) for(const attr of ['fill','stroke','stop-color']) {
      const v=e.getAttribute(attr); if(map[v]) e.setAttribute(attr,map[v]);
    }
    if(useReference) for(const text of svg.querySelectorAll('text')) text.setAttribute('fill',text.getAttribute('y')==='706'?reference.name:reference.ink);
    return useReference?reference.ink:'#ffffff';
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
    const clubInk=palette(svg);
    for(const text of svg.querySelectorAll('text'))if(text.textContent==='FOOTBALL CARDS')fitText(text,profile().title,470,21);
    const logo=svg.querySelector('image');
    const logoSource=state.logo||(clubs[state.club].logo==='Fiskeviks_IF'?window.BB3D_FIF_LOGO:A.logos[clubs[state.club].logo]);
    if(logoSource)logo.setAttributeNS(XLINK,'xlink:href',logoSource);else logo.remove();
    const clubText=make('text',{x:345,y:which==='front'?220:650,fill:clubInk,'font-family':'CardFont','font-weight':700,'font-size':which==='front'?13:22,'text-anchor':'middle','letter-spacing':2});
    fitText(clubText,state.clubName.toLocaleUpperCase('sv-SE'),which==='front'?300:470,which==='front'?13:22);
    svg.appendChild(clubText);
    if(which==='front') {
      const textAt=(x,y)=>svg.querySelector(`text[x="${x}"][y="${y}"]`);
      fitText(textAt(345,706),state.name.toLocaleUpperCase('sv-SE')||'SPELARNAMN',475,42);
      fitText(textAt(345,760),state.position,170,22);
      textAt(547,264).textContent=state.total;
      statLabels().forEach((label,i)=>{const x=[165,345,525][i%3];fitText(textAt(x,i<3?788:833),label,145,14);textAt(x,i<3?815:860).textContent=state.stats[i];});
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
    statLabels().forEach((label,i)=>document.querySelector('label[for="stat-'+i+'"]').textContent=label);
    $('sport-hint').textContent=state.profileId==='future-star-hockey'?'Använd din hockeyklubbs namn, färger och egen logotyp. AI-fotot använder dina valda klubbfärger.':'';
    document.dispatchEvent(new Event('bb3d:profile-change'));
  }
  function syncForm() {
    $('sport').value=state.profileId;
    for(const [id,values]of [['club',profile().clubs],['position',profile().positions]]){const select=$(id);select.replaceChildren(...values.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;return option;}));}
    for(const id of ['name','club','clubName','position','total','primary','accent','zoom','panX','panY']) $(id).value=state[id];
    state.stats.forEach((v,i)=>$(`stat-${i}`).value=v);
    render();
  }
  statLabels().forEach((label,i)=>{
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
  const sportDrafts=new Map();
  $('sport').addEventListener('change',()=>{
    sportDrafts.set(state.profileId,{club:state.club,clubName:state.clubName,position:state.position,primary:state.primary,accent:state.accent,logo:state.logo,stats:[...state.stats]});
    state.profileId=$('sport').value;const p=profile(),club=p.clubs[0];
    Object.assign(state,sportDrafts.get(p.id)||{club,clubName:club,position:p.positions[0],primary:clubs[club].primary,accent:clubs[club].accent,logo:null,stats:[...state.stats]});
    logoRead++;$('logo').value='';syncForm();status(p.sport+' valt. Granska foto, klubb och egenskaper innan du beställer.');
  });
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
      if(kind==='photo') {sourcePhoto=result.data;photoSize=result;state.zoom=100;state.panX=0;state.panY=0;}
      syncForm();status('Bilden är inläst. Den skickas till BB3D först när du bekräftar beställningen.');
    } catch(e) {status(e.message,true);} finally {photoReadPending=Math.max(0,photoReadPending-1);$(kind).value='';}
  });
  $('clear-photo').addEventListener('click',()=>{photoRead++;state.photo=null;sourcePhoto=null;photoSize=null;$('photo').value='';render();status('Fotot är borttaget.');});
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
  async function submitOrder(event){event.preventDefault();if(sending)return;try{if(aiWorking)throw Error('Vänta tills AI-fotot är färdigt.');
    if(!connection?.orders)throw Error('Beställningsmottagningen är inte ansluten.');if(!state.photo)throw Error('Ladda upp ett spelarfoto först.');if(photoReadPending)throw Error('Vänta tills bilden har lästs in.');if(!state.name.trim()||state.name.trim().toUpperCase()==='SPELARNAMN')throw Error('Ange spelarens namn på kortet.');if(!$('approve').checked)throw Error('Granska kortet och godkänn förhandsvisningen först.');if(!$('editor-form').reportValidity())return;
    const details={profileId:state.profileId,approved:true,player:state.name.trim(),club:state.club,clubName:state.clubName,position:state.position,stats:[...state.stats],total:state.total};
    if(!window.BB3D_PURCHASE?.current()?.paid)throw Error('Välj ett betalt 4-pack överst på sidan först.');
    sending=true;const controls=[...document.querySelectorAll('input,select,button')],previous=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);$('submit-order').textContent='Sparar motivet…';
    try{const png=await exportPNG('front');if(!png||png.size>12*1024*1024)throw Error('Kortfilen är för stor.');await window.BB3D_PURCHASE.submit({png,details,editor:{primary:state.primary,accent:state.accent}});$('order-status').textContent='Motivet är sparat för utskrift. Välj nästa 4-pack överst på sidan.';status('Motivet är godkänt.');}
    finally{controls.forEach((n,i)=>n.disabled=previous[i]);$('submit-order').textContent='Godkänn detta 4-pack för utskrift';$('approve').checked=false;sending=false;}
  }catch(e){$('order-status').textContent=e.message;status(e.message,true);sending=false;}}
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
  let slotKey=null;const packDrafts=new Map();
  document.addEventListener('bb3d:purchase-change',()=>{
    const current=window.BB3D_PURCHASE?.current(),key=current?.slotId||null;if(key===slotKey)return;
    if(slotKey)packDrafts.set(slotKey,{state:{...state,stats:[...state.stats]},photoSize,sourcePhoto});slotKey=key;
    const saved=key&&packDrafts.get(key);if(saved){state={...saved.state,stats:[...saved.state.stats]};photoSize=saved.photoSize;sourcePhoto=saved.sourcePhoto;}
    else{state.name='SPELARNAMN';state.photo=null;photoSize=null;sourcePhoto=null;state.zoom=100;state.panX=state.panY=0;}photoRead++;syncForm();
  });
  let aiControls=[];
  const startup=init();
  window.BB3D_AI_EDITOR={
    ready:startup,
    isBusy:()=>sending||aiWorking||photoReadPending>0,
    getPhoto:()=>sourcePhoto||state.photo,
    getClub:()=>state.club,
    getProfile:()=>state.profileId,
    getMotif:()=>({profileId:state.profileId,club:state.club,primary:state.primary,accent:state.accent}),
    getConnection:()=>connection,
    busy:value=>{if(value){if(sending||photoReadPending)throw Error('Vänta tills bilden eller beställningen är färdig.');aiWorking=true;aiControls=[...document.querySelectorAll('#editor-form input,#editor-form select,#editor-form button')].map(node=>({node,disabled:node.disabled}));for(const item of aiControls)item.node.disabled=true;}else{for(const item of aiControls)item.node.disabled=item.disabled;aiWorking=false;aiControls=[];}},
    apply:async src=>{if(sending||aiWorking)throw Error('Vänta tills det pågående arbetet är färdigt.');const image=await loadImage(src);photoRead++;state.photo=src;photoSize={width:image.width,height:image.height};state.zoom=100;state.panX=0;state.panY=0;syncForm();status('AI-bilden används på kortet. Granska och godkänn innan du beställer.');}
  };
})();
