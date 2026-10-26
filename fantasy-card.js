'use strict';
// SVG is shared by the live editor and the production PNG exporter.
window.BB3D_FANTASY_CARD=(()=>{
 const palettes=window.BB3D_ELEMENTS||{"normal": {"name": "Normal", "base": "#a7a99c", "deep": "#50514a", "light": "#e4e5e1", "ink": "#19232e", "setting": "a bright meadow with distant hills", "effects": "soft silver highlights", "sample": "skog"}, "eld": {"name": "Eld", "base": "#ed7733", "deep": "#713918", "light": "#f9d6c1", "ink": "#19232e", "setting": "a volcanic rock trail with distant glowing lava and drifting embers; keep the subject safely away from lava and flames", "effects": "warm fire sparks and glowing ember colors", "sample": "eld"}, "vatten": {"name": "Vatten", "base": "#4ca8d5", "deep": "#245066", "light": "#c9e4f2", "ink": "#19232e", "setting": "a rocky lakeshore with a distant waterfall and soft aquatic light; keep the subject above water", "effects": "water ripples and blue aquatic colors", "sample": "vatten"}, "blixt": {"name": "Elektrisk", "base": "#f5d13b", "deep": "#75641c", "light": "#fcf1c4", "ink": "#19232e", "setting": "a rocky highland overlook under dramatic clouds", "effects": "electric yellow sparks", "sample": "blixt"}, "skog": {"name": "Gräs", "base": "#8cbc52", "deep": "#435a27", "light": "#dceacb", "ink": "#19232e", "setting": "a lush forest trail with ferns and tall trees with softly filtered sunlight", "effects": "green leaves and woodland colors", "sample": "skog"}, "is": {"name": "Is", "base": "#79d8e9", "deep": "#3a676f", "light": "#d6f3f8", "ink": "#19232e", "setting": "a sparkling snowy mountain valley", "effects": "icy blue crystals and gentle snowflakes", "sample": "vatten"}, "kamp": {"name": "Kamp", "base": "#c46b48", "deep": "#5e3322", "light": "#edd2c8", "ink": "#19232e", "setting": "an open-air training courtyard", "effects": "warm terracotta movement trails", "sample": "eld"}, "gift": {"name": "Gift", "base": "#b263bd", "deep": "#552f5a", "light": "#e7d0eb", "ink": "#19232e", "setting": "a magical mushroom grove", "effects": "violet mist and luminous spores, no injury", "sample": "skog"}, "mark": {"name": "Mark", "base": "#c6a86a", "deep": "#5f5032", "light": "#ede4d2", "ink": "#19232e", "setting": "a sunlit desert canyon", "effects": "golden sand swirls and ochre earth", "sample": "eld"}, "flyg": {"name": "Flygande", "base": "#9fa9df", "deep": "#4c516b", "light": "#e2e5f5", "ink": "#19232e", "setting": "a high mountain ledge above soft clouds", "effects": "airy feathers and sky-blue wind ribbons", "sample": "vatten"}, "psykisk": {"name": "Psykisk", "base": "#ed81ac", "deep": "#713d52", "light": "#f9d9e6", "ink": "#19232e", "setting": "a floating crystal garden", "effects": "pink psychic ribbons and suspended stones", "sample": "blixt"}, "insekt": {"name": "Insekt", "base": "#a9bd46", "deep": "#515a21", "light": "#e5ebc7", "ink": "#19232e", "setting": "a macro-scale flower meadow", "effects": "iridescent wing patterns and tiny pollen lights", "sample": "skog"}, "sten": {"name": "Sten", "base": "#b6a66d", "deep": "#574f34", "light": "#e9e4d3", "ink": "#19232e", "setting": "an ancient rocky canyon", "effects": "mineral textures and amber dust", "sample": "eld"}, "spoke": {"name": "Spöke", "base": "#8b7fbb", "deep": "#423c59", "light": "#dcd8ea", "ink": "#19232e", "setting": "a moonlit enchanted ruin", "effects": "friendly translucent lavender wisps, no horror", "sample": "vatten"}, "drake": {"name": "Drake", "base": "#8682dc", "deep": "#403e69", "light": "#dad9f4", "ink": "#19232e", "setting": "an ancient mountain sanctuary", "effects": "majestic prismatic scales and soft violet energy", "sample": "eld"}, "morker": {"name": "Mörker", "base": "#83737d", "deep": "#3e373c", "light": "#d9d5d8", "ink": "#19232e", "setting": "a tranquil moonlit forest", "effects": "deep indigo shadows and silver glints, friendly not scary", "sample": "skog"}, "stal": {"name": "Stål", "base": "#aab8c8", "deep": "#515860", "light": "#e5e9ee", "ink": "#19232e", "setting": "a polished futuristic workshop garden", "effects": "brushed metallic armor and silver highlights", "sample": "blixt"}, "fe": {"name": "Fe", "base": "#e7a6cf", "deep": "#6e4f63", "light": "#f7e4f0", "ink": "#19232e", "setting": "a luminous flower garden", "effects": "pastel fairy lights and soft sparkling petals", "sample": "vatten"}};
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
   is:'M0-14L4-5L12-9L8 0L14 4L5 7L4 14L-1 9L-9 13L-7 5L-14 1L-6-3L-7-12L0-7Z',
   kamp:'M-10 9V-3L-6-5V-11H-2V-5H2V-10H6V-3H10V7L3 13H-4Z',
   gift:'M-11 0C-11-16 11-16 11 0L7 4V10H-7V4ZM-6-2H-3V1H-6ZM3-2H6V1H3Z',
   mark:'M-14 9L-5-8L1 2L6-11L15 9Z',
   flyg:'M-13 9L-8-8L12-12L5-4L-5 0L8-3L1 4L-8 5L-4 8Z',
   psykisk:'M-13 0Q0-16 13 0Q0 16-13 0ZM-4 0A4 4 0 1 0 4 0A4 4 0 1 0-4 0',
   insekt:'M-6-5L-11-11L-9-13L-3-7H3L9-13L11-11L6-5L10 0V7L3 13H-3L-10 7V0ZM0-6V11',
   sten:'M-13 8L-10-8L2-13L13-4L10 10L-3 14Z',
   spoke:'M-12 11V-2C-12-17 12-17 12-2V11L6 7L0 13L-6 7ZM-7-2H-3V1H-7ZM3-2H7V1H3Z',
   drake:'M-13 7L-3-1L-8-11L4-7L9-14L11-3L5 2L13 10L2 7L-2 14L-5 6Z',
   morker:'M7-13C-15-16-17 15 7 13C-6 9-6-8 7-13Z',
   stal:'M-7-12H7L14 0L7 12H-7L-14 0ZM-4-4H4V4H-4Z',
   fe:'M0-15L5-5L14 0L5 5L0 15L-5 5L-14 0L-5-5Z',
   normal:'M0-13L4-4L13-4L6 2L9 12L0 6L-9 12L-6 2L-13-4L-4-4Z'
  }[element]||'M0-13L4-4L13-4L6 2L9 12L0 6L-9 12L-6 2L-13-4L-4-4Z';
  return `<g transform="translate(${x} ${y}) scale(${r/17})"><circle r="18" fill="url(#energy)" stroke="#606b70" stroke-width="1.5"/><path d="${shape}" fill="#20262b" stroke="#20262b" stroke-width="1.1" stroke-linejoin="round"/></g>`;
 }
 function render(s){
  const trainer=s.mode==='trainer',p=trainer?{name:'TRÄNARE',base:'#aab8c8',deep:'#263848',light:'#e6ecf0',ink:'#19232e'}:palettes[s.element]||palettes.eld,element=palettes[s.element]?s.element:'eld',full=trainer||s.style==='fullart';
  const name=String(s.name||'DITT NAMN').slice(0,28),attack=String(s.attack||'Stjärnsmäll').slice(0,26),ability=String(s.ability||'Elementkraft').slice(0,26),note=String(s.note||'Modet växer när vi står tillsammans.').slice(0,100),hp=num(s.hp,10,300,120),damage=num(s.damage,0,200,70);
  const safePhoto=/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(s.photo||'')?s.photo:null;
  const box=full?{x:25,y:trainer?112:88,w:580,h:trainer?739:763}:{x:44,y:103,w:542,h:352};
  const example=window.BB3D_CARD_ART?.[trainer?'trainer':(palettes[element].sample||element)+(full?'':'-classic')],sample=/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(example?.photo||'')?example:null,source=safePhoto||sample?.photo;
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
