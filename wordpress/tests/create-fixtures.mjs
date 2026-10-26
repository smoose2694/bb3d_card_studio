import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
import {png} from '../../tests/fixtures.js';
const dir=new URL('./fixtures/',import.meta.url);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(new URL('print.png',dir),png());
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(t,b){const x=Buffer.alloc(b.length+12);x.writeUInt32BE(b.length);x.write(t,4);b.copy(x,8);x.writeUInt32BE(crc(x.subarray(4,x.length-4)),x.length-4);return x;}
for(const [name,w,h]of [['source',512,512],['result',1536,1024]]){const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=6;fs.writeFileSync(new URL(name+'.png',dir),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',deflateSync(Buffer.alloc((w*4+1)*h))),chunk('IEND',Buffer.alloc(0))]));}
console.log('Created synthetic PNG fixtures; no customer photos or credentials.');
