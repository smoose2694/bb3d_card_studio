import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store,png} from './fixtures.js';
import * as P from '../lib/purchases.js';
import * as C from '../lib/core.js';
import * as A from '../lib/ai-control.js';
import {createPurchaseHandler} from '../lib/purchase-handler.js';
const actor='synthetic-buyer',raw={packs:3,customerName:'SYNTHETIC TEST',contact:''};
const details={profileId:'future-star-football',approved:true,player:'TEST ÅÄÖ',club:'FBK Karlstad',clubName:'FBK Karlstad',position:'BACK',stats:[90,90,90,90,90,90],total:90};
async function setup(packs=3){const s=new Store(),p=await P.createPurchase(s,randomUUID(),actor,{...raw,packs});return{s,p};}
test('A multi-pack purchase saves once, prices on server and creates one motif per pack',async()=>{
 const {s,p}=await setup();assert.equal(p.payment.amountSEK,300);assert.equal(p.slots.length,3);assert.equal(new Set(p.slots.map(x=>x.id)).size,3);
 assert.deepEqual(await P.createPurchase(s,p.id,actor,{...raw,amountSEK:1}),p);
 await assert.rejects(()=>P.createPurchase(s,p.id,actor,{...raw,packs:4}),e=>e.status===409);
 await assert.rejects(()=>P.ownPurchase(s,p.id,'other'),e=>e.status===404);
 await assert.rejects(()=>P.paidPackGrant(s,p.id,p.slots[0].id,actor),e=>e.status===403);
 assert.equal((await C.orderStats(s)).paidSEK,0);assert.equal((await C.orderStats(s)).unpaidSEK,300);
});
test('Only verified payment unlocks each pack; two attempts persist across tabs and payment corrections',async()=>{
 const {s,p}=await setup();let version=await C.updateOrder(s,p.id,{paid:true},p.createdAt);await A.configureAI(s,{enabled:true,dailyLimit:20},true);
 const grant=await P.paidPackGrant(s,p.id,p.slots[0].id,actor),who=C.sha(actor);await A.ensurePaidGrant(s,grant,who);
 const now=Date.now(),start=(id,time)=>A.beginImage(s,{id,code:grant.code,actor:who,fingerprint:C.sha('image')},time);
 const id=randomUUID();const starts=await Promise.all([start(id,now),start(id,now)]);assert.equal(starts.filter(r=>r.start).length,1);await A.finishImage(s,id,{ok:false,message:'Synthetic failure'},now);
 const id2=randomUUID();await start(id2,now+31000);await A.finishImage(s,id2,{ok:true,imagePath:'ai/results/synthetic.png'},now+31001);
 await assert.rejects(()=>start(randomUUID(),now+62000),e=>e.status===429);
 version=await C.updateOrder(s,p.id,{paid:false},version.updatedAt);await assert.rejects(()=>P.paidPackGrant(s,p.id,p.slots[0].id,actor),e=>e.status===403);
 await C.updateOrder(s,p.id,{paid:true},version.updatedAt);const same=await P.paidPackGrant(s,p.id,p.slots[0].id,actor);assert.equal(same.code,grant.code);assert.equal((await A.ensurePaidGrant(s,same,who)).attemptsRemaining,0);
 const other=await P.paidPackGrant(s,p.id,p.slots[1].id,actor);assert.notEqual(other.code,grant.code);assert.equal((await A.ensurePaidGrant(s,other,who)).attemptsRemaining,2);
});
test('Production waits for every paid pack; immutable printable motifs remain separate and sales count purchase once',async()=>{
 const {s,p}=await setup(2);let version=await C.updateOrder(s,p.id,{paid:true},p.createdAt);
 await assert.rejects(()=>C.updateOrder(s,p.id,{status:'production'},version.updatedAt),e=>e.status===409);
 const image=png();let view;for(const [index,slot]of p.slots.entries()){const requestId=randomUUID();s.images.set(C.imagePath(actor,requestId),{bytes:image,uploadedAt:new Date()});const body={requestId,imageHash:C.sha(image),details:{...details,player:'TEST '+index}};view=await P.submitPack(s,p.id,slot.id,actor,body);assert.deepEqual(await P.submitPack(s,p.id,slot.id,actor,body),view);await assert.rejects(()=>P.submitPack(s,p.id,slot.id,actor,{...body,details:{...details,player:'CHANGED'}}),e=>e.status===409);}
 assert.equal(view.complete,true);const list=await C.orderList(s);assert.equal(list.length,1);assert.equal(list[0].slots.length,2);assert(!JSON.stringify(list).includes('incoming/'));
 version=await C.updateOrder(s,p.id,{status:'production'},list[0].updatedAt);assert.equal(version.status,'production');
 const stats=await C.orderStats(s);assert.equal(stats.orders,1);assert.equal(stats.paidOrders,1);assert.equal(stats.paidPacks,2);assert.equal(stats.paidCards,8);assert.equal(stats.paidSEK,200);assert.equal(stats.products[0].packs,2);assert.equal(stats.products[0].orders,1);
 const anonymous=(await s.read('statistics/'+p.id+'.json')).data;assert(!JSON.stringify(anonymous).includes('TEST'));
 // Old uploaded files referenced by a pack survive orphan cleanup, then expire with the purchase.
 for(const image of s.images.values())image.uploadedAt=new Date(Date.now()-2*C.DAY);await C.cleanup(s);assert.equal(s.images.size,2);
 const found=await s.read(C.recordPath(p.id));found.data.expiresAt=new Date(Date.now()-1).toISOString();await s.write(C.recordPath(p.id),found.data,{etag:found.etag});await C.cleanup(s);assert.equal(s.images.size,0);assert.equal((await C.orderStats(s)).paidSEK,200);
});
test('Purchase HTTP boundaries reject cross-session reads, cross-origin writes and client payment claims',async()=>{
 const s=new Store(),env={ADMIN_PASSWORD:'synthetic-password-1234',ADMIN_SESSION_SECRET:'synthetic-session-secret-at-least-32',BLOB_STORE_ID:'synthetic'};
 const handler=createPurchaseHandler({loadStore:async()=>s,getEnv:()=>env});
 const send=(action,{customer=actor,origin='https://studio.test',body}={})=>handler(new Request('https://studio.test/api/purchase?action='+action,{method:body?'POST':'GET',headers:{origin,cookie:'__Host-bb3d_customer='+C.token('customer',customer,100,env)},...(body?{body:JSON.stringify(body)}:{})}));
 assert.equal((await send('create',{origin:'https://other.test',body:{}})).status,403);
 const res=await send('create',{body:{id:randomUUID(),details:{...raw,paid:true,amountSEK:1}}});assert.equal(res.status,201);const {purchase}=await res.json();assert.equal(purchase.paid,false);assert.equal(purchase.payment.amountSEK,300);
 assert.equal((await send('status&id='+purchase.id,{customer:'other'})).status,404);
});
