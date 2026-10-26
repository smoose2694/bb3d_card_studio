import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import * as C from '../lib/core.js';
import {cardProfile,cardIdentity,FOOTBALL_PROFILE} from '../lib/card-profiles.js';
import {salesRecord,aggregateSales} from '../lib/sales.js';
const raw={customerName:'Synthetic customer',contact:'',player:'Synthetic player',clubName:'FBK Karlstad',club:'FBK Karlstad',position:'ANFALLARE',stats:[80,80,80,80,80,80],total:80,quantity:4,approved:true};
class Store{
 constructor(){this.rows=new Map();this.binaryReads=0;this.bytes=null;}
 async read(k){return this.rows.has(k)?structuredClone(this.rows.get(k)):null;}
 async write(k,data){this.rows.set(k,{data:structuredClone(data),etag:'fixture'});}
 async binary(){this.binaryReads++;return this.bytes?{bytes:this.bytes}:null;}
}
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(t,d){const b=Buffer.alloc(d.length+12);b.writeUInt32BE(d.length);b.write(t,4);d.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,b.length-4)),b.length-4);return b;}
function printPNG(){const h=Buffer.alloc(13),density=Buffer.alloc(9);h.writeUInt32BE(1488);h.writeUInt32BE(2079,4);h[8]=8;h[9]=2;density.writeUInt32BE(23619);density.writeUInt32BE(23625,4);density[8]=1;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('pHYs',density),chunk('IDAT',deflateSync(Buffer.alloc((1488*3+1)*2079))),chunk('IEND',Buffer.alloc(0))]);}
test('Only the prepared football profile can be ordered and clubs remain football-specific',()=>{
 for(const club of cardProfile().clubs)assert.equal(C.details({...raw,club}).profileId,FOOTBALL_PROFILE);
 for(const profileId of ['future-star-hockey','pokemon','__proto__',null,{},''])assert.throws(()=>C.details({...raw,profileId}),e=>e.status===400);
 assert.throws(()=>C.details({...raw,club:'Unprepared club'}),e=>e.status===400);
 assert.throws(()=>C.details({...raw,position:'CENTER'}),e=>e.status===400);
 const d=C.details({...raw,profileId:FOOTBALL_PROFILE,sport:'Hockey',product:'Spoofed',amountSEK:1});assert.equal(d.amountSEK,100);assert(!('sport' in d));
});
test('New orders save server-owned sport/product identity without changing Swish price',async()=>{
 const s=new Store(),id=randomUUID();s.bytes=printPNG();const hash=C.sha(s.bytes);
 const receipt=await C.receipt(s,id,'fixture-customer',{details:{...raw,sport:'Spoofed'},imageHash:hash});
 const saved=(await s.read(C.recordPath(id))).data;assert.deepEqual(saved.card,cardIdentity(cardProfile()));assert.equal(saved.details.profileId,FOOTBALL_PROFILE);
 assert.equal(receipt.payment.amountSEK,100);assert.equal(receipt.payment.recipient,'1233661089');
 await C.receipt(s,id,'fixture-customer',{details:raw,imageHash:hash});assert.equal(s.binaryReads,1);
 const stat=(await s.read('statistics/'+id+'.json')).data;assert.equal(stat.sportId,'football');assert.equal(stat.product,'Future Star � 4-pack');
});
test('A pre-profile order retry returns the original receipt without another upload or duplicate',async()=>{
 const s=new Store(),id=randomUUID(),imageHash=C.sha('old-synthetic-print');const {profileId,...legacy}=C.details(raw);
 const record={id,customer:'fixture-customer',details:legacy,fingerprint:C.sha(JSON.stringify(legacy)+imageHash),createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+C.DAY).toISOString(),status:'new'};
 await s.write(C.recordPath(id),record);
 const receipt=await C.receipt(s,id,'fixture-customer',{details:raw,imageHash});assert.equal(receipt.id,id);assert.equal(s.binaryReads,0);
 await assert.rejects(()=>C.receipt(s,id,'fixture-customer',{details:{...raw,player:'Changed player'},imageHash}),e=>e.status===409);
 await assert.rejects(()=>C.receipt(s,id,'other-customer',{details:raw,imageHash}),e=>e.status===409);
});
test('Historical football and saved future sport snapshots keep distinct sales identities',()=>{
 const order={id:randomUUID(),createdAt:'2026-10-26T10:00:00Z',paid:true,paidAt:'2026-10-26T11:00:00Z',status:'new',details:C.details(raw)};
 const old=salesRecord(order);assert.equal(old.sportId,'football');assert.equal(old.product,'Future Star � 4-pack');
 // A future persisted order is a fixture, not an enabled customer profile.
 const futureCard={profileId:'synthetic-handball',productId:'future-star-four-pack',product:'Future Star � 4-pack',sportId:'handball',sport:'Handboll'};
 const future=salesRecord({...order,card:futureCard});assert.equal(future.sport,'Handboll');assert.equal(future.profileId,'synthetic-handball');
 const stats=aggregateSales([old,future]);assert.equal(stats.paidSEK,200);assert.equal(stats.products.length,2);assert(stats.products.some(p=>p.name.includes('Handboll')));assert(stats.products.some(p=>p.name.includes('Fotboll')));
});
