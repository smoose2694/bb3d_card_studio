'use strict';
// SVG is shared by the live editor and the production PNG exporter.
window.BB3D_FANTASY_CARD=(()=>{
 const palettes={
  eld:{name:'ELD',base:'#ed7733',deep:'#963824',light:'#ffe2a2',ink:'#302013'},
  vatten:{name:'VATTEN',base:'#4ca8d5',deep:'#19577e',light:'#c9ebf5',ink:'#122c42'},
  skog:{name:'SKOG',base:'#8cbc52',deep:'#31623e',light:'#e0edb4',ink:'#233723'},
  blixt:{name:'BLIXT',base:'#f5d13b',deep:'#997122',light:'#fff5a8',ink:'#342d15'}
 };
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const num=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
 const fit=(value,x,y,width,size=28,extra='')=>{
  const len=String(value).length,actual=Math.min(size,width/Math.max(1,len*.59));
  return `<text x="${x}" y="${y}" font-size="${actual.toFixed(2)}" ${extra.includes('font-weight=')?'':'font-weight="700"'} textLength="${Math.min(width,len*actual*.55).toFixed(1)}" lengthAdjust="spacingAndGlyphs" ${extra}>${esc(value)}</text>`;
 };
 function wrap(value,width){const lines=[''];for(const word of value.split(/\s+/)){const i=lines.length-1;if((lines[i]+' '+word).trim().length>width&&lines[i]&&lines.length<3)lines.push(word);else lines[i]=(lines[i]+' '+word).trim();}return lines;}
 function body(value,x,y,width,size=17,color='#172125'){
  return wrap(value,Math.floor(width/(size*.51))).map((line,i)=>fit(line,x,y+i*size*1.25,width,size,`fill="${color}" font-weight="400"`)).join('');
 }
 function symbol(element,x,y,r=17){
  const shape={
   eld:'M0-12C8-6 6-3 9 0C14 9 4 15-3 11C-12 7-10-2-4-6C-6 1-1 3 0-12Z',
   vatten:'M0-13C-2-7-10 1-10 6C-10 18 11 18 11 6C11 1 3-7 0-13Z',
   skog:'M-10 10C-13-3-3-12 11-11C13 4 5 12-10 10ZM-7 7L7-7',
   blixt:'M2-15L-10 2H-1L-3 15L11-4H2Z',
   normal:'M0-13L4-4L13-4L6 2L9 12L0 6L-9 12L-6 2L-13-4L-4-4Z'
  }[element]||'M0-13L4-4L13-4L6 2L9 12L0 6L-9 12L-6 2L-13-4L-4-4Z';
  return `<g transform="translate(${x} ${y}) scale(${r/17})"><circle r="18" fill="url(#energy)" stroke="#606b70" stroke-width="1.5"/><path d="${shape}" fill="#20262b" stroke="#20262b" stroke-width="1.1" stroke-linejoin="round"/></g>`;
 }
 function render(s){
  const p=palettes[s.element]||palettes.eld,element=palettes[s.element]?s.element:'eld',trainer=s.mode==='trainer',full=trainer||s.style==='fullart';
  const name=String(s.name||'DITT NAMN').slice(0,28),attack=String(s.attack||'Stjärnsmäll').slice(0,26),ability=String(s.ability||'Elementkraft').slice(0,26),note=String(s.note||'Modet växer när vi står tillsammans.').slice(0,100),hp=num(s.hp,10,300,120),damage=num(s.damage,0,200,70);
  const safePhoto=/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(s.photo||'')?s.photo:null;
  const box=full?{x:25,y:trainer?112:88,w:580,h:trainer?739:763}:{x:44,y:103,w:542,h:352};
  const example=window.BB3D_CARD_ART?.[trainer?'trainer':element+(full?'':'-classic')],sample=/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(example?.photo||'')?example:null,source=safePhoto||sample?.photo;
  const w=num(safePhoto?s.width:sample?.width,1,10000,600),h=num(safePhoto?s.height:sample?.height,1,10000,760),scale=Math.max(box.w/w,box.h/h)*num(s.zoom,100,250,100)/100,pw=w*scale,ph=h*scale;
  const art=source?`<image href="${source}" x="${box.x-(pw-box.w)/2}" y="${box.y-(ph-box.h)/2}" width="${pw}" height="${ph}" preserveAspectRatio="none"/>`:`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${p.base}"/>`;
  const sparkle=Array.from({length:20},(_,i)=>{const x=32+(i*173)%566,y=115+(i*109)%712;return `<path d="M${x-6} ${y}h12M${x} ${y-6}v12" stroke="#fff" stroke-width="${i%3===0?2:1}" opacity=".45"/>`;}).join('');
  const defs=`<defs>
   <linearGradient id="metal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f7faf7"/><stop offset=".13" stop-color="#59676d"/><stop offset=".25" stop-color="#eaf5f4"/><stop offset=".44" stop-color="#9ca6ad"/><stop offset=".58" stop-color="#fff"/><stop offset=".76" stop-color="#707c86"/><stop offset="1" stop-color="#e1ebed"/></linearGradient>
   <linearGradient id="gold" x2=".8" y2="1"><stop stop-color="#ffe94c"/><stop offset=".5" stop-color="#f9d42c"/><stop offset="1" stop-color="#e9b621"/></linearGradient>
   <linearGradient id="paper" x2=".4" y2="1"><stop stop-color="${p.light}"/><stop offset=".45" stop-color="${p.base}"/><stop offset="1" stop-color="${p.light}"/></linearGradient>
   <linearGradient id="energy" x2=".4" y2="1"><stop stop-color="#fffef3"/><stop offset=".5" stop-color="${p.light}"/><stop offset="1" stop-color="${p.base}"/></linearGradient>
   <linearGradient id="creature" x2=".7" y2="1"><stop stop-color="${p.light}"/><stop offset=".35" stop-color="${p.base}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>
   <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#101e30" stop-opacity="0"/><stop offset=".5" stop-color="#101e30" stop-opacity=".08"/><stop offset="1" stop-color="#101e30" stop-opacity=".88"/></linearGradient>
   <linearGradient id="foil" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#69e4ef" stop-opacity=".17"/><stop offset=".35" stop-color="#c078ff" stop-opacity=".05"/><stop offset=".65" stop-color="#fff2a4" stop-opacity=".2"/><stop offset="1" stop-color="#8bffee" stop-opacity=".08"/></linearGradient>
   <clipPath id="fantasy-art"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${full?9:1}"/></clipPath>
   <pattern id="grain" width="67" height="53" patternUnits="userSpaceOnUse"><path d="M0 19Q30-5 67 19M-20 48Q25 21 80 49" stroke="#fff" stroke-width="16" opacity=".035"/></pattern>
  </defs>`;
  const footer=`<text x="40" y="846" font-size="10" fill="${full?'#fff':'#383d31'}" letter-spacing=".5">★ 001 / 001</text><text x="589" y="846" text-anchor="end" font-size="9" fill="${full?'#fff':'#383d31'}">PERSONLIGT SAMLARKORT</text>`;
  let content;
  if(trainer){
   content=`<rect x="12" y="12" width="606" height="856" rx="24" fill="url(#metal)"/><rect x="24" y="24" width="582" height="828" rx="12" fill="${p.deep}"/><g clip-path="url(#fantasy-art)">${art}<rect x="25" y="112" width="580" height="739" fill="url(#foil)"/>${sparkle}<rect x="25" y="510" width="580" height="341" fill="url(#shade)"/></g>
   <path d="M24 24H606V61L576 72H24Z" fill="url(#metal)"/><text x="43" y="52" font-size="28" font-weight="900" font-style="italic" letter-spacing="2" fill="#30373c">TRÄNARE</text><text x="583" y="49" text-anchor="end" font-size="19" font-style="italic" font-weight="800" fill="#a44b27">SUPPORTER</text>
   <path d="M24 64H604V113H24Z" fill="#f0f2e9" fill-opacity=".95"/>${fit(name,43,100,538,32,'fill="#182027"')}
   <rect x="36" y="610" width="558" height="149" rx="8" fill="#0e2036" opacity=".68"/>${fit(ability,51,640,523,26,'fill="#fff4b9"')}${body(attack+' — '+note,51,675,524,18,'#ffffff')}
   <path d="M68 782H559L580 803L559 825H68L47 803Z" fill="#f2bf7d" stroke="#f9e4b5" stroke-width="2"/><text x="314" y="808" text-anchor="middle" font-size="14" font-style="italic" fill="#533d28">Din tränarinsats gör skillnad i nästa äventyr.</text>${footer}`;
  }else{
   const surface=full?'#eff4e6':p.ink;
   const panels=full?`<rect x="25" y="479" width="580" height="371" fill="url(#shade)"/><path d="M26 493Q300 461 604 493V744H26Z" fill="${p.light}" opacity=".74" stroke="#fff" stroke-opacity=".7"/>`:`<rect x="22" y="22" width="586" height="836" rx="13" fill="url(#paper)"/><rect x="22" y="22" width="586" height="836" rx="13" fill="url(#grain)"/><rect x="38" y="97" width="554" height="364" fill="url(#metal)" stroke="#706e60" stroke-width="2"/>`;
   const artwork=`<g clip-path="url(#fantasy-art)">${art}${full?`<rect x="25" y="88" width="580" height="763" fill="url(#foil)"/>${sparkle}`:''}</g>`;
   content=`<rect x="11" y="11" width="608" height="858" rx="25" fill="${full?'url(#metal)':'url(#gold)'}"/><rect x="23" y="23" width="584" height="830" rx="12" fill="${p.deep}"/>${full?artwork+panels:panels+artwork}
   ${full?'<path d="M24 25H606V88H24Z" fill="url(#metal)"/>':''}<path d="M31 31H113L105 59H24Z" fill="url(#metal)" stroke="#778085" stroke-width="1"/><text x="69" y="51" text-anchor="middle" font-size="17" font-style="italic" font-weight="900" fill="#454e53">BAS</text>
   ${fit(name,121,67,full?300:298,35,'fill="#182027"')}${full?'<text x="435" y="59" font-size="27" font-weight="900" font-style="italic" fill="#b07822">ex</text>':''}<text x="489" y="63" font-size="12" font-weight="700" fill="#1b262d">HP</text><text x="555" y="66" text-anchor="end" font-size="31" font-weight="800" fill="#182027">${hp}</text>${symbol(element,580,49,20)}
   <path d="M34 464H597L580 482H47Z" fill="url(#metal)" stroke="#8e9694" stroke-width="1"/><text x="314" y="477" text-anchor="middle" font-size="10" font-style="italic" fill="#34424b">${p.name} · ETT EGET MONSTER, INSPIRERAT AV DIG</text>
   <rect x="46" y="508" width="84" height="22" rx="11" fill="#aa352d"/><text x="88" y="523" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">Förmåga</text>${fit(ability,142,530,420,25,'fill="'+p.ink+'"')}
   ${body(note,49,562,530,17,p.ink)}
   ${symbol(element,64,662,17)}${symbol('normal',103,662,17)}${fit(attack,139,672,345,29,'fill="'+p.ink+'"')}<text x="581" y="674" text-anchor="end" font-size="34" font-weight="800" fill="${p.ink}">${damage}</text>
   ${body('En kraftfull attack med '+p.name.toLowerCase()+'energi.',49,712,528,16,p.ink)}
   <path d="M28 755H600L588 780H40Z" fill="url(#metal)" stroke="#7a8282" stroke-width="1"/><text x="46" y="772" font-size="13" fill="#283539">svaghet ×2</text>${symbol(element==='eld'?'vatten':element==='skog'?'eld':element==='vatten'?'blixt':'skog',155,766,9)}<text x="225" y="772" font-size="13" fill="#283539">motstånd —</text><text x="445" y="772" font-size="13" fill="#283539">reträtt</text>${symbol('normal',513,766,9)}
   <text x="45" y="811" font-size="13" fill="${surface}" font-style="italic">${full?'En unik kraft. Ditt eget äventyr.':'Ett personligt kort med en alldeles egen berättelse.'}</text>${footer}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1488" height="2079" viewBox="0 0 630 880" role="img" aria-label="${esc(trainer?'Tränarkort':'Monsterkort')}: ${esc(name)} · ${p.name}">${defs}<g font-family="Arial,Helvetica,sans-serif">${content}</g></svg>`;
 }
 return{render,palettes};
})();
