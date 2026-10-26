import {inflateSync} from 'node:zlib';
import {fail,sha} from './core.js';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
export function imagePNG(bytes,{maxBytes=2500000,maxPixels=768*768,maxEdge=768}={}){
  const b=Buffer.from(bytes);if(b.length<60||b.length>maxBytes||!b.subarray(0,8).equals(signature))fail(400,'Välj en giltig PNG-bild.');let p=8,width=0,height=0,channels=0,ended=false;const data=[];
  while(p+12<=b.length){const n=b.readUInt32BE(p);if(n>b.length-p-12)fail(400,'Bilden är skadad.');const type=b.toString('ascii',p+4,p+8);if(crc(b.subarray(p+4,p+8+n))!==b.readUInt32BE(p+8+n))fail(400,'Bilden är skadad.');
    if(type==='IHDR'){if(p!==8||n!==13)fail(400,'Bilden är skadad.');width=b.readUInt32BE(p+8);height=b.readUInt32BE(p+12);if(!width||!height||width>maxEdge||height>maxEdge||width*height>maxPixels||b[p+16]!==8||![2,6].includes(b[p+17])||b[p+18]||b[p+19]||b[p+20])fail(400,'Bildens storlek eller format stöds inte.');channels=b[p+17]===6?4:3;}
    if(type==='IDAT')data.push(b.subarray(p+8,p+8+n));p+=n+12;if(type==='IEND'){ended=n===0&&p===b.length;break;}
  }
  if(!channels||!data.length||!ended)fail(400,'Bilden saknar bilddata.');try{const stride=width*channels+1,raw=inflateSync(Buffer.concat(data),{maxOutputLength:stride*height});if(raw.length!==stride*height)throw Error();for(let y=0;y<height;y++)if(raw[y*stride]>4)throw Error();}catch{fail(400,'Bilddata kunde inte läsas.');}
  return{bytes:b,width,height,hash:sha(b)};
}
export function inputImage(value){if(typeof value!=='string'||value.length>3400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))fail(400,'Bilden har fel format.');const raw=value.slice(22),bytes=Buffer.from(raw,'base64');if(bytes.toString('base64')!==raw)fail(400,'Bilden är skadad.');return imagePNG(bytes);}
