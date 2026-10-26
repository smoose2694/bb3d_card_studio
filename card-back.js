'use strict';
window.BB3D_BACK_CARD=(()=>{
 let saved;
 return()=>{
  if(saved)return saved;
  const svg=new DOMParser().parseFromString(window.BB3D_ASSETS.back,'image/svg+xml').documentElement;
  svg.setAttribute('width','1488');svg.setAttribute('height','2079');svg.setAttribute('aria-label','BB3D · fast baksida');
  svg.querySelectorAll('image').forEach(n=>n.remove());
  const shades={'#71091e':'#222631','#370712':'#11151c','#16070c':'#090c12','#ed2946':'#748095','#570717':'#202631','#350712':'#11151c','#eaaab6':'#bec7d5','#aa0624':'#384556','#8d051e':'#273442','#c80b2c':'#384556','#ff8090':'#e9edf4','#ffe2e6':'#e9edf4'};
  for(const el of svg.querySelectorAll('*'))for(const attr of ['fill','stroke','stop-color']){const v=el.getAttribute(attr);if(shades[v])el.setAttribute(attr,shades[v]);}
  for(const el of svg.querySelectorAll('text')){el.setAttribute('font-family','Arial, sans-serif');if(el.textContent==='FOOTBALL CARDS')el.textContent='PERSONLIGA SAMLARKORT';}
  const name=document.createElementNS('http://www.w3.org/2000/svg','text');for(const [k,v]of Object.entries({x:345,y:520,'text-anchor':'middle','font-size':96,'font-weight':900,'font-family':'Arial,sans-serif',fill:'#ffffff','letter-spacing':8}))name.setAttribute(k,v);name.textContent='BB3D';svg.append(name);
  for(const node of svg.querySelectorAll('[id]')){const old=node.id,next='bb3d-back-'+old;node.id=next;for(const el of svg.querySelectorAll('*'))for(const attr of [...el.attributes])if(attr.value.includes('url(#'+old+')'))el.setAttribute(attr.name,attr.value.replaceAll('url(#'+old+')','url(#'+next+')'));}
  saved=new XMLSerializer().serializeToString(svg);return saved;
 };
})();
