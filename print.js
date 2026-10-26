'use strict';
window.BB3D_PRINT=(()=>{
 function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
 function chunk(type,data){const b=new Uint8Array(data.length+12),v=new DataView(b.buffer);v.setUint32(0,data.length);b.set(new TextEncoder().encode(type),4);b.set(data,8);v.setUint32(b.length-4,crc32(b.subarray(4,b.length-4)));return b;}
 async function density(blob){const b=new Uint8Array(await blob.arrayBuffer()),d=new Uint8Array(9),v=new DataView(d.buffer);v.setUint32(0,23619);v.setUint32(4,23625);d[8]=1;const parts=[b.subarray(0,8)];for(let p=8;p<b.length;){const n=new DataView(b.buffer,b.byteOffset+p,4).getUint32(0),type=new TextDecoder().decode(b.subarray(p+4,p+8));if(type!=='pHYs')parts.push(b.subarray(p,p+n+12));if(type==='IHDR')parts.push(chunk('pHYs',d));p+=n+12;}return new Blob(parts,{type:'image/png'});}
 async function create(svgText){
  await document.fonts.ready;const svg=new DOMParser().parseFromString(svgText,'image/svg+xml').documentElement,style=document.createElementNS('http://www.w3.org/2000/svg','style'),A=window.BB3D_ASSETS;
  style.textContent=`@font-face{font-family:CardFont;src:url('${A.font}');font-weight:400;}@font-face{font-family:CardFont;src:url('${A.bold}');font-weight:800;}`;svg.querySelector('defs').append(style);
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));let image;
  try{image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Tryckbilden kunde inte skapas.'));i.src=url;});}finally{URL.revokeObjectURL(url);}
  const c=document.createElement('canvas');c.width=1488;c.height=2079;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0);
  const raw=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Tryckfilen kunde inte skapas.')),'image/png'));return density(raw);
 }
 return{create,density};
})();
