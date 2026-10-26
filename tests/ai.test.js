import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import * as A from '../lib/ai-control.js';
import {sha,DAY,cleanup} from '../lib/core.js';
import {inputImage,imagePNG} from '../lib/ai-images.js';
import {requestFootballEdit,IMAGE_MODEL} from '../lib/ai-provider.js';
import {createAIHandler} from '../lib/ai-handler.js';
import {token} from '../lib/core.js';
class Store{
  constructor(){this.rows=new Map();this.images=new Map();this.version=0;}
  async read(key){return this.rows.has(key)?structuredClone(this.rows.get(key)):null;}
  async write(key,data,{etag}={}){const old=this.rows.get(key);if(old?old.etag!==etag:!!etag){const e=Error('Conflict');e.conflict=true;throw e;}this.rows.set(key,{data:structuredClone(data),etag:String(++this.version),uploadedAt:new Date()});}
  async list(prefix){return [...this.images].filter(([key])=>key.startsWith(prefix)).map(([pathname,r])=>({pathname,uploadedAt:r.uploadedAt}));}
  async remove(path){this.rows.delete(path);this.images.delete(path);}
  async writeBytes(path,bytes){if(this.images.has(path))throw Error('Already exists');this.images.set(path,{bytes,uploadedAt:new Date()});}
  async stream(path){const image=this.images.get(path);return image?{stream:new Response(image.bytes).body}:null;}
}
const NOW=Date.parse('2026-10-26T10:00:00Z'),actor=sha('synthetic-customer'),fingerprint=sha('synthetic-image-fbk');
async function setup(limit=20,now=NOW){const s=new Store();await A.configureAI(s,{enabled:true,dailyLimit:limit},true,now);const grant=await A.issueCode(s,now);return{s,grant};}
const start=(s,grant,id=randomUUID(),now=NOW)=>A.beginImage(s,{id,code:grant.code,actor,fingerprint},now);
test('AI is off by default and requires provider readiness and operator code',async()=>{
 const s=new Store();assert.equal(A.controlSummary(await A.readControl(s,NOW),false,NOW).available,false);
 await assert.rejects(()=>A.configureAI(s,{enabled:true,dailyLimit:20},false,NOW),/OPENAI_API_KEY/);
 await assert.rejects(()=>A.configureAI(s,{enabled:true,dailyLimit:101},true,NOW));
 await A.configureAI(s,{enabled:true,dailyLimit:20},true,NOW);await assert.rejects(()=>A.claimCode(s,'0000-0000-0000-0000',actor,NOW),e=>e.status===403);
});
test('Codes bind to one signed customer identity and expire',async()=>{
 const{s,grant}=await setup();await A.claimCode(s,grant.code,actor,NOW);
 await assert.rejects(()=>A.claimCode(s,grant.code,sha('new-browser-session'),NOW),e=>e.status===403);
 await assert.rejects(()=>A.claimCode(s,grant.code,actor,NOW+2*3600000),e=>e.status===403);
});
test('Double clicks and concurrent customers reserve only one API attempt',async()=>{
 const{s,grant}=await setup(),id=randomUUID();const same=await Promise.all([start(s,grant,id),start(s,grant,id)]);assert.equal(same.filter(r=>r.start).length,1);
 let state=await A.readControl(s,NOW);assert.equal(state.usage['2026-10-26'],1);
 await A.finishImage(s,id,{ok:false,message:'synthetic failure'},NOW+60000);
 const attempts=await Promise.allSettled(Array.from({length:10},()=>start(s,grant,randomUUID(),NOW+61000)));
 assert.equal(attempts.filter(r=>r.status==='fulfilled'&&r.value.start).length,1);state=await A.readControl(s,NOW+61000);assert.equal(state.usage['2026-10-26'],2);
});
test('Two successful images use the code and replay cannot call the provider again',async()=>{
 const{s,grant}=await setup(),first=randomUUID();await start(s,grant,first);await A.finishImage(s,first,{ok:true,imagePath:'ai/results/first.png'},NOW+60000);
 assert.equal((await start(s,grant,first,NOW+61000)).start,false);const second=randomUUID();await start(s,grant,second,NOW+61000);await A.finishImage(s,second,{ok:true,imagePath:'ai/results/second.png'},NOW+120000);
 await assert.rejects(()=>start(s,grant,randomUUID(),NOW+121000),/Båda bilderna/);
 assert.equal((await A.ownImage(s,first,grant.code,actor,NOW+121000)).remaining,0);
 await assert.rejects(()=>A.ownImage(s,first,grant.code,sha('other'),NOW+121000),e=>e.status===403);
 await assert.rejects(()=>A.beginImage(s,{id:first,code:grant.code,actor,fingerprint:sha('changed-photo')},NOW+121000),e=>e.status===409);
});
test('Failures keep successful-image allowance but have a hard attempt cap and cooldown',async()=>{
 const{s,grant}=await setup();for(let n=0;n<4;n++){const id=randomUUID();await start(s,grant,id,NOW+n*60000);await A.finishImage(s,id,{ok:false,message:'synthetic failure'},NOW+n*60000+1000);if(n===0)await assert.rejects(()=>start(s,grant,randomUUID(),NOW+2000),/30 sekunder/);}
 const quota=await A.claimCode(s,grant.code,actor,NOW+240000);assert.equal(quota.remaining,2);assert.equal(quota.attemptsRemaining,0);await assert.rejects(()=>start(s,grant,randomUUID(),NOW+240000),/försökstak/);
 assert.equal((await A.readControl(s,NOW+240000)).usage['2026-10-26'],4);
});
test('Daily caps survive settings changes and reset at Swedish midnight',async()=>{
 const now=Date.parse('2026-10-26T22:59:00Z'),{s,grant}=await setup(1,now),id=randomUUID();await start(s,grant,id,now);await A.finishImage(s,id,{ok:false},now+1000);
 await A.configureAI(s,{enabled:false,dailyLimit:1},true,now+31000);await A.configureAI(s,{enabled:true,dailyLimit:1},true,now+32000);
 await assert.rejects(()=>start(s,grant,randomUUID(),now+33000),/Dagens AI-tak/);
 await start(s,grant,randomUUID(),now+120000);const state=await A.readControl(s,now+120000);assert.equal(state.usage['2026-10-26'],1);assert.equal(state.usage['2026-10-27'],1);
});
test('Uncertain network outcomes keep a lease and never trigger an automatic paid retry',async()=>{
 const{s,grant}=await setup(),id=randomUUID();await start(s,grant,id);await A.finishImage(s,id,{ok:false,uncertain:true},NOW+1000);
 await assert.rejects(()=>start(s,grant,randomUUID(),NOW+60000),e=>e.status===409);
 assert.equal((await start(s,grant,id,NOW+361000)).start,false);await start(s,grant,randomUUID(),NOW+361001);assert.equal((await A.readControl(s,NOW+361001)).usage['2026-10-26'],2);
});
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,b.length-4)),b.length-4);return b;}
function png(w=16,h=16){const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((w*3+1)*h))),chunk('IEND',Buffer.alloc(0))]);}
test('AI input is size-limited, decoded and CRC-checked before any API call',()=>{
 const image=png(),url='data:image/png;base64,'+image.toString('base64');assert.equal(inputImage(url).width,16);const broken=Buffer.from(image);broken[40]^=1;assert.throws(()=>imagePNG(broken));assert.throws(()=>inputImage('https://untrusted.example/photo.png'));assert.throws(()=>imagePNG(png(769,1)));
});
test('Provider request uses fixed model, size, quality and club references, with no automatic retry',async()=>{
 let count=0;const bytes=png(1536,1024);const output=await requestFootballEdit({env:{OPENAI_API_KEY:'synthetic-test-key-only'},club:'Hertzöga BK',photo:'data:image/png;base64,synthetic',safetyIdentifier:actor,fetchImpl:async(url,options)=>{count++;assert.equal(url,'https://api.openai.com/v1/images/edits');const body=JSON.parse(options.body);assert.equal(body.model,IMAGE_MODEL);assert.equal(body.size,'1536x1024');assert.equal(body.quality,'medium');assert.equal(body.n,1);assert.equal(body.images.length,2);assert.equal(body.safety_identifier,actor);assert.match(body.prompt,/bright yellow/);return Response.json({data:[{b64_json:bytes.toString('base64')}]});}});assert(output.equals(bytes));assert.equal(count,1);
 count=0;await assert.rejects(()=>requestFootballEdit({env:{OPENAI_API_KEY:'synthetic-test-key-only'},club:'FBK Karlstad',photo:'synthetic',safetyIdentifier:actor,fetchImpl:async()=>{count++;throw Error('synthetic network timeout');}}),e=>e.uncertain===true);assert.equal(count,1);
 await assert.rejects(()=>requestFootballEdit({env:{OPENAI_API_KEY:'synthetic-test-key-only'},club:'FBK Karlstad',photo:'synthetic',safetyIdentifier:actor,fetchImpl:async()=>new Response('private provider error',{status:401})}),e=>e.disable===true&&!e.message.includes('private provider'));
});
test('Expired AI results are inaccessible and daily cleanup removes their bytes',async()=>{
 const{s,grant}=await setup(),id=randomUUID();await start(s,grant,id);await A.finishImage(s,id,{ok:true,imagePath:'ai/results/'+id+'.png'},NOW+60000);
 await assert.rejects(()=>A.ownImage(s,id,grant.code,actor,NOW+DAY+1),e=>e.status===410);
 const store=new Store();store.images.set('ai/results/old.png',{uploadedAt:new Date(Date.now()-2*DAY)});await cleanup(store);assert.equal(store.images.size,0);
});
test('Provider credential failures turn AI off without resetting the daily budget',async()=>{
 const{s,grant}=await setup(),id=randomUUID();await start(s,grant,id);await A.finishImage(s,id,{ok:false,disable:true,message:'Kontrollera anslutningen'},NOW+1000);
 const state=await A.readControl(s,NOW+1000);assert.equal(state.settings.enabled,false);assert.equal(state.usage['2026-10-26'],1);assert.equal(state.lastError,'Kontrollera anslutningen');
 await assert.rejects(()=>A.claimCode(s,grant.code,actor,NOW+31000),e=>e.status===503);
});
test('A completed image remains retrievable after the code expires, but never for another actor',async()=>{
 const{s,grant}=await setup(),id=randomUUID();await start(s,grant,id);await A.finishImage(s,id,{ok:true,imagePath:'ai/results/'+id+'.png'},NOW+60000);
 await A.configureAI(s,{enabled:false,dailyLimit:20},true,NOW+61000);assert.equal((await A.ownImage(s,id,grant.code,actor,NOW+3*3600000)).job.status,'done');
 await assert.rejects(()=>A.ownImage(s,id,grant.code,sha('other-person'),NOW+3*3600000),e=>e.status===403);
});
test('AI HTTP flow enforces admin, origin, consent and private image ownership end to end',async()=>{
 const s=new Store(),env={ADMIN_PASSWORD:'synthetic-admin-password-only',ADMIN_SESSION_SECRET:'synthetic-session-secret-longer-than-32',BLOB_READ_WRITE_TOKEN:'synthetic-blob-token',OPENAI_API_KEY:'synthetic-openai-key'};let calls=0;
 const handler=createAIHandler({loadStore:async()=>s,getEnv:()=>env,editImage:async args=>{calls++;assert.equal(args.club,'FBK Karlstad');assert.equal(args.safetyIdentifier,sha('customer-one'));assert(!('model' in args));return png(1536,1024);}});
 const cookie=(kind,id)=>'__Host-bb3d_'+kind+'='+token(kind,id,100,env);
 async function send(action,{who='customer',method='GET',body,code,origin='https://studio.test'}={}){const headers={origin};if(who==='admin')headers.cookie=cookie('admin','operator');if(who==='customer')headers.cookie=cookie('customer','customer-one');if(who==='other')headers.cookie=cookie('customer','customer-two');if(code)headers['x-bb3d-ai-code']=code;if(body)headers['content-type']='application/json';return handler(new Request('https://studio.test/api/ai?action='+action,{method,headers,...(body?{body:JSON.stringify(body)}:{})}));}
 assert.equal((await send('admin',{who:'customer'})).status,401);assert.equal((await send('config',{who:'none'})).status,401);
 assert.equal((await send('settings',{who:'admin',method:'POST',body:{enabled:true,dailyLimit:2},origin:'https://other.test'})).status,403);
 assert.equal((await send('settings',{who:'admin',method:'POST',body:{enabled:true,dailyLimit:2}})).status,200);
 const grant=await(await send('voucher',{who:'admin',method:'POST',body:{}})).json();assert(grant.code);
 const id=randomUUID(),body={id,code:grant.code,club:'FBK Karlstad',photo:'data:image/png;base64,'+png().toString('base64'),consent:false,model:'untrusted-client-model'};
 assert.equal((await send('generate',{method:'POST',body})).status,400);assert.equal(calls,0);
 body.consent=true;const generated=await(await send('generate',{method:'POST',body})).json();assert.equal(generated.status,'done');assert.equal(generated.remaining,1);assert(!('imagePath' in generated));assert.equal(calls,1);
 const replay=await(await send('generate',{method:'POST',body})).json();assert.equal(replay.status,'done');assert.equal(calls,1);
 assert.equal((await send('result&id='+id,{who:'other',code:grant.code})).status,403);
 const image=await send('result&id='+id,{code:grant.code});assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'no-store');assert.equal(image.headers.get('content-type'),'image/png');assert(Buffer.from(await image.arrayBuffer()).equals(png(1536,1024)));
});
