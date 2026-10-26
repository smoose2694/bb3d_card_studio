import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from './fixtures.js';
import * as P from '../lib/purchases.js';
import * as A from '../lib/ai-control.js';
import * as C from '../lib/core.js';
import {createAIHandler} from '../lib/ai-handler.js';
import purchaseEntry from '../api/purchase.js';
test('The deployed purchase entry uses Vercels Web fetch contract',()=>{assert.equal(typeof purchaseEntry,'object');assert.equal(typeof purchaseEntry.fetch,'function');});
async function setup(){const store=new Store(),p=await P.createPurchase(store,randomUUID(),'buyer',{packs:2,customerName:'SYNTHETIC HELP TEST',contact:''});await C.updateOrder(store,p.id,{paid:true},p.createdAt);await A.configureAI(store,{enabled:true,dailyLimit:2},true);const grant=await P.paidPackGrant(store,p.id,p.slots[0].id,'buyer');await A.ensurePaidGrant(store,grant,C.sha('buyer'));return{store,p,grant};}
test('One operator click adds exactly two attempts, concurrent replays do not add more or change global cap',async()=>{
 const {store,grant}=await setup(),requestId=randomUUID(),actor=C.sha('buyer');const now=Date.now();for(let i=0;i<2;i++){const id=randomUUID();await A.beginImage(store,{id,code:grant.code,actor,fingerprint:C.sha('image')},now+i*31000);await A.finishImage(store,id,{ok:false,message:'Synthetic provider failure'},now+i*31000);}
 const results=await Promise.all([A.addPaidAttempts(store,grant,actor,requestId,now+62000),A.addPaidAttempts(store,grant,actor,requestId,now+62000)]);assert(results.every(r=>r.attemptsRemaining===2));assert(results.every(r=>r.maxAttempts===4));assert(results.every(r=>r.dailyCapReached));
 const control=await A.readControl(store,now+62000);assert.equal(control.settings.dailyLimit,2);assert.equal(A.controlSummary(control,true,now+62000).used,2);
 const retry=await A.addPaidAttempts(store,grant,actor,requestId,now+62000);assert.equal(retry.maxAttempts,4);const extra=await A.addPaidAttempts(store,grant,actor,randomUUID(),now+62000);assert.equal(extra.maxAttempts,6);
});
test('Only a signed operator can grant extra attempts to an unfinished paid pack, quota stays private',async()=>{
 const {store,p}=await setup(),env={ADMIN_PASSWORD:'synthetic-password-long-123',ADMIN_SESSION_SECRET:'synthetic-session-secret-longer-than32',BLOB_STORE_ID:'synthetic',OPENAI_API_KEY:'synthetic-openai-not-real'},handler=createAIHandler({loadStore:async()=>store,getEnv:()=>env});
 const send=(action,who='admin',body,origin='https://studio.test')=>handler(new Request('https://studio.test/api/ai?action='+action,{method:body?'POST':'GET',headers:{origin,cookie:'__Host-bb3d_'+(who==='admin'?'admin':'customer')+'='+C.token(who==='admin'?'admin':'customer',who==='admin'?'operator':who,100,env)},...(body?{body:JSON.stringify(body)}:{})}));
 const body={purchaseId:p.id,slotId:p.slots[0].id,requestId:randomUUID()};assert.equal((await send('bonus','buyer',body)).status,401);assert.equal((await send('bonus','admin',body,'https://other.test')).status,403);
 assert.equal((await send('bonus','admin',body)).status,200);const action='quota&purchaseId='+p.id+'&slotId='+p.slots[0].id;const quota=await(await send(action,'buyer')).json();assert.equal(quota.attemptsRemaining,4);assert.equal((await send(action,'other')).status,404);
 const found=await store.read(C.recordPath(p.id));found.data.slots[0].imagePath='incoming/synthetic.png';await store.write(C.recordPath(p.id),found.data,{etag:found.etag});assert.equal((await send('bonus','admin',{...body,requestId:randomUUID()})).status,409);
 const unpaid=await P.createPurchase(store,randomUUID(),'buyer',{packs:1,customerName:'SYNTHETIC',contact:''});assert.equal((await send('bonus','admin',{purchaseId:unpaid.id,slotId:unpaid.slots[0].id,requestId:randomUUID()})).status,403);
});
test('Customer activity is scoped to their purchase, throttled and does not change order version or sales',async()=>{
 const {store,p}=await setup(),slot=p.slots[0].id,now=Date.now(),before=(await store.read(C.recordPath(p.id))).data.updatedAt;await P.touchPurchase(store,p.id,slot,'buyer',now);const first=await store.read('presence/'+p.id+'.json');await P.touchPurchase(store,p.id,slot,'buyer',now+1000);assert.equal((await store.read('presence/'+p.id+'.json')).etag,first.etag);
 await assert.rejects(()=>P.touchPurchase(store,p.id,slot,'other',now),e=>e.status===404);await assert.rejects(()=>P.touchPurchase(store,p.id,randomUUID(),'buyer',now),e=>e.status===400);
 assert.equal((await store.read(C.recordPath(p.id))).data.updatedAt,before);assert.equal((await C.orderStats(store)).paidSEK,200);assert.deepEqual(Object.keys(first.data).sort(),['seenAt','slotId']);
});
