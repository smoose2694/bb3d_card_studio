import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import * as C from '../lib/core.js';
import {stockholmDay,salesRecord} from '../lib/sales.js';
class Store{constructor(){this.rows=new Map();this.images=new Map();this.version=0}async read(path){const r=this.rows.get(path);return r?structuredClone(r):null}async write(path,data,{etag}={}){const old=this.rows.get(path);if(old?(old.etag!==etag):!!etag){const e=Error('Conflict');e.conflict=true;throw e}const row={data:structuredClone(data),etag:String(++this.version),uploadedAt:new Date()};this.rows.set(path,row);return row}async binary(path){const b=this.images.get(path);return b?{bytes:b.bytes}:null}async list(prefix){return[...[...this.rows].map(([pathname,r])=>({pathname,uploadedAt:r.uploadedAt})),...[...this.images].map(([pathname,r])=>({pathname,uploadedAt:r.uploadedAt}))].filter(o=>o.pathname.startsWith(prefix))}async remove(path){this.rows.delete(path);this.images.delete(path)}}
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function chunk(type,data){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,b.length-4)),b.length-4);return b}
function png(width=1488){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(2079,4);h[8]=8;h[9]=6;const density=Buffer.alloc(9);density.writeUInt32BE(23619);density.writeUInt32BE(23625,4);density[8]=1;const pixels=Buffer.alloc((width*4+1)*2079);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('pHYs',density),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))])}
const env={ADMIN_PASSWORD:'test-only-password-12345',ADMIN_SESSION_SECRET:'synthetic-test-session-secret-at-least-32',BLOB_READ_WRITE_TOKEN:'test-only'},d={customerName:'TESTKUND',contact:'',player:'TEST ÅÄÖ',club:'FBK Karlstad',clubName:'FBK Karlstad',position:'BACK',stats:[88,84,81,91,67,99],total:87,quantity:8,approved:true};
const request=(headers={})=>new Request('https://studio.test/api/orders',{headers});
test('Signed admin/customer sessions, password and origin boundaries',()=>{const admin=C.token('admin','test-admin',100,env),customer=C.token('customer','test-customer',100,env);assert.equal(C.session(request({cookie:'__Host-bb3d_admin='+admin}),'admin',env),'test-admin');assert.equal(C.session(request({cookie:'__Host-bb3d_admin='+customer}),'admin',env),null);assert.equal(C.session(request({cookie:'__Host-bb3d_admin='+admin}),'admin',{...env,ADMIN_PASSWORD:'changed-test-password'}),null);assert.equal(C.session(request({cookie:'__Host-bb3d_admin='+admin+'x'}),'admin',env),null);assert.throws(()=>C.admin(request(),env),/Logga in/);assert.equal(C.passwordOK(env.ADMIN_PASSWORD,env),true);assert.equal(C.passwordOK('wrong',env),false);assert.throws(()=>C.sameOrigin(request({origin:'https://other.test'})),/kortstudion/);assert.match(C.cookie('admin','value',10),/Secure; HttpOnly; SameSite=Strict/)});
test('PNG CRC, density, decompressed image and dimensions are checked',()=>{const image=png();assert.match(C.validatePNG(image),/^[a-f0-9]{64}$/);const broken=Buffer.from(image);broken[40]^=1;assert.throws(()=>C.validatePNG(broken));assert.throws(()=>C.validatePNG(png(400)),/1488/)});
test('Receipt only after image and record are stored, retry cannot duplicate',async()=>{const store=new Store(),id=randomUUID(),customer='test-actor',image=png(),body={details:d,imageHash:C.sha(image)};await assert.rejects(()=>C.receipt(store,id,customer,body),/inte laddats upp/);assert.equal(store.rows.size,0);store.images.set(C.imagePath(customer,id),{bytes:image,uploadedAt:new Date()});const first=await C.receipt(store,id,customer,body),again=await C.receipt(store,id,customer,body);assert.deepEqual(first,again);assert.equal((await store.list('orders/')).length,1);assert.equal((await store.list('statistics/')).length,1);await assert.rejects(()=>C.receipt(store,id,'other-actor',body),/ändrats/);await assert.rejects(()=>C.receipt(store,id,customer,{...body,details:{...d,quantity:12}}),/ändrats/);const list=await C.orderList(store);assert.equal(list[0].customerName,'TESTKUND');assert(!('fingerprint'in list[0]));assert(!('customer'in list[0]));assert(!('imagePath'in list[0]));const changed=await C.changeStatus(store,id,'done',list[0].updatedAt);assert.equal(changed.status,'done');const stats=(await store.read('statistics/'+id+'.json')).data;assert(!('customerName' in stats));assert(!('contact' in stats));assert(!('player' in stats));assert(!('imagePath' in stats));assert.equal(stats.amountSEK,200);assert.equal(stats.paid,false);assert.equal(stats.status,'done');await assert.rejects(()=>C.changeStatus(store,id,'production',list[0].updatedAt),/ändrats/);const old=await store.read(C.recordPath(id));old.data.expiresAt=new Date(Date.now()-1).toISOString();await store.write(C.recordPath(id),old.data,{etag:old.etag});assert.equal((await C.orderList(store)).length,0);assert.equal(store.images.size,0);assert.equal((await store.list('statistics/')).length,1)});
test('Invalid approval and values cannot create an order',()=>{for(const change of [{approved:false},{approved:'no'},{player:'SPELARNAMN'},{quantity:0},{quantity:1},{quantity:3},{quantity:6},{quantity:1.5},{total:100},{stats:[1]}])assert.throws(()=>C.details({...d,...change}));});
test('Durable limit blocks repeated requests and cleanup removes orphaned images',async()=>{const store=new Store(),r=request({'x-vercel-forwarded-for':'192.0.2.1'});for(let i=0;i<8;i++)await C.rateLimit(store,r,env,'login',8);await assert.rejects(()=>C.rateLimit(store,r,env,'login',8),e=>e.status===429);store.images.set('incoming/orphan.png',{bytes:Buffer.alloc(0),uploadedAt:new Date(Date.now()-2*C.DAY)});await C.cleanup(store);assert.equal(store.images.size,0)});

test('Four-packs use server prices and a Swish link tied to the saved order',()=>{const details=C.details({...d,quantity:12,amountSEK:1});assert.equal(details.packs,3);assert.equal(details.amountSEK,300);const p=C.payment({id:'ddd7ea29-0000-4000-8000-000000000000',details});const u=new URL(p.url);assert.equal(u.origin,'https://app.swish.nu');assert.equal(u.searchParams.get('sw'),'1233661089');assert.equal(u.searchParams.get('amt'),'300.00');assert.equal(u.searchParams.get('msg'),'BB3D DDD7EA29');assert.equal(u.searchParams.has('edit'),false);});

test('Verification orders are excluded without deleting archives or real sales',async()=>{
const store=new Store(),ids=['ddd7ea29-4a76-44d3-baf9-6302ba69a0b5','ad20dafa-2418-4454-a1a0-5a3656d110dc'];
for(const id of ids)await store.write('statistics/'+id+'.json',{quantity:8,club:'FBK Karlstad',status:'done'});
const empty=await C.orderStats(store);assert.equal(empty.orders,0);assert.equal(empty.paidSEK,0);assert.equal(empty.excludedTests,2);
await store.write('statistics/'+randomUUID()+'.json',{quantity:4,club:'Hertzöga BK',status:'new',testOrder:true});
await store.write('statistics/'+randomUUID()+'.json',{quantity:12,club:'Råtorps IK',status:'done'});
const real=await C.orderStats(store);assert.equal(real.orders,1);assert.equal(real.cards,12);assert.equal(real.done,1);assert.equal(real.excludedTests,3);assert.deepEqual(real.clubs,{'Råtorps IK':12});
assert.equal((await store.list('statistics/')).length,4);
assert.equal(C.summary({id:ids[0],details:{},status:'done'}).testOrder,true);
assert.equal(C.summary({id:randomUUID(),details:{customerName:'Testson'},status:'done'}).testOrder,false);
});

async function pricedOrder(store,id=randomUUID()){
const record={id,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*C.DAY).toISOString(),status:'new',details:C.details(d),imagePath:'incoming/'+id+'.png'};
await store.write(C.recordPath(id),record);await C.statistics(store,record);return record;
}
test('Paid sales require manual confirmation, use stored prices and survive retention',async()=>{
const store=new Store(),record=await pricedOrder(store);let stats=await C.orderStats(store);assert.equal(stats.paidSEK,0);assert.equal(stats.unpaidSEK,200);
const paid=await C.updateOrder(store,record.id,{paid:true,amountSEK:1},record.createdAt);assert.equal(paid.amountSEK,200);assert(paid.paidAt);
stats=await C.orderStats(store);assert.equal(stats.paidSEK,200);assert.equal(stats.paidPacks,2);assert.equal(stats.paidCards,8);assert.equal(stats.paidOrders,1);assert.equal(stats.unpaidSEK,0);assert.equal(stats.products[0].amountSEK,200);assert.equal(stats.salesByClub[0].name,'FBK Karlstad');
await assert.rejects(()=>C.updateOrder(store,record.id,{paid:false},record.createdAt),e=>e.status===409);
const done=await C.changeStatus(store,record.id,'done',paid.updatedAt);assert.equal(done.paidAt,paid.paidAt);
const saved=await store.read(C.recordPath(record.id));saved.data.expiresAt=new Date(Date.now()-1).toISOString();await store.write(C.recordPath(record.id),saved.data,{etag:saved.etag});await C.cleanup(store);
assert.equal(await store.read(C.recordPath(record.id)),null);stats=await C.orderStats(store);assert.equal(stats.paidSEK,200);assert.equal(stats.done,1);
const anonymous=(await store.read('statistics/'+record.id+'.json')).data;for(const key of ['customerName','contact','player','imagePath','customer'])assert(!(key in anonymous));
});
test('Payment corrections are reversible and cannot change the saved price',async()=>{
const store=new Store(),r=await pricedOrder(store);const paid=await C.updateOrder(store,r.id,{paid:true},r.createdAt);const unpaid=await C.updateOrder(store,r.id,{paid:false},paid.updatedAt);
assert.equal(unpaid.paid,false);assert.equal(unpaid.paidAt,null);const stats=await C.orderStats(store);assert.equal(stats.paidSEK,0);assert.equal(stats.unpaidSEK,200);
await assert.rejects(()=>C.updateOrder(store,r.id,{paid:'yes'},unpaid.updatedAt),e=>e.status===400);
const old=await store.read(C.recordPath(r.id));delete old.data.details.amountSEK;await store.write(C.recordPath(r.id),old.data,{etag:old.etag});await assert.rejects(()=>C.updateOrder(store,r.id,{paid:true},unpaid.updatedAt),/saknar ett sparat pris/);
});
test('Sales periods use Swedish payment dates and reject invalid ranges',async()=>{
assert.equal(stockholmDay('2026-10-25T23:30:00Z'),'2026-10-26');
const store=new Store(),r={id:randomUUID(),createdAt:'2026-10-25T23:30:00Z',paidAt:'2026-10-26T23:30:00Z',paid:true,status:'done',details:C.details(d)};
const record=salesRecord(r);assert.equal(record.day,'2026-10-26');assert.equal(record.paidDay,'2026-10-27');await store.write('statistics/'+r.id+'.json',record);
assert.equal((await C.orderStats(store,{from:'2026-10-26',to:'2026-10-26'})).paidSEK,0);
assert.equal((await C.orderStats(store,{from:'2026-10-27',to:'2026-10-27'})).paidSEK,200);
for(const range of [{from:'2026-02-30'},{from:'2026-11-01',to:'2026-10-01'},{to:'invalid'}])await assert.rejects(()=>C.orderStats(store,range),e=>e.status===400);
});
test('Paid test orders stay outside every sales grouping',async()=>{
const store=new Store();for(const id of ['ad20dafa-2418-4454-a1a0-5a3656d110dc',randomUUID()])await store.write('statistics/'+id+'.json',{...salesRecord({id,createdAt:new Date().toISOString(),paidAt:new Date().toISOString(),paid:true,status:'done',testOrder:true,details:C.details(d)})});
const stats=await C.orderStats(store);assert.equal(stats.paidSEK,0);assert.equal(stats.unpaidSEK,0);assert.equal(stats.paidCards,0);assert.equal(stats.excludedTests,2);assert.deepEqual(stats.products,[]);assert.deepEqual(stats.salesByClub,[]);assert.deepEqual(stats.days,[]);
});
