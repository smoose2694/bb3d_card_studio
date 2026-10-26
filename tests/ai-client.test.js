import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
const source=await readFile(new URL('../ai-client.js',import.meta.url),'utf8');
const KEY='bb3d-paid-ai-v1slot-test',CODE='AAAA-BBBB-CCCC-DDDD';
class Element{
 constructor(){this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.textContent='';this.children=[];this.listeners={};}
 addEventListener(type,fn){this.listeners[type]=fn;}
 replaceChildren(){this.children=[];}
 append(node){this.children.push(node);}
}
async function client({available=true,saved=null,networkFailure=false}={}){
 const nodes=new Map(),storage=new Map(),locks=[],requests=[],jobs=new Map(),urls=[],listeners={};let profileId="future-star-football";
 if(saved)storage.set(KEY,JSON.stringify({id:saved}));
 const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 node('ai-photo-panel').hidden=true;node('ai-result').hidden=true;
 let finished=0,status=410;
 const quota=()=>({remaining:2-finished,attemptsRemaining:2-finished});
 const json=(value,code=200)=>Response.json(value,{status:code});
 const fetch=async(path,options={})=>{
  const url=new URL(path,'https://synthetic.test'),action=url.searchParams.get('action');requests.push({action,body:options.body?JSON.parse(options.body):null});
  if(action==='config')return json({available});
  if(action==='claim')return json(quota());
  if(action==='generate'){
   const body=JSON.parse(options.body);finished++;jobs.set(body.id,{id:body.id,status:'done',...quota()});
   if(networkFailure){networkFailure=false;throw Error('synthetic lost response');}
   return json(jobs.get(body.id));
  }
  if(action==='status'){const job=jobs.get(url.searchParams.get('id'));return job?json(job):json({error:'Expired fixture'},status);}
  if(action==='result')return new Response(new Blob(['synthetic image'],{type:'image/png'}));
  throw Error('Unexpected fixture request');
 };
 const editor={ready:Promise.resolve(),getConnection:()=>({orders:true}),getPhoto:()=>'data:image/png;base64,synthetic',getClub:()=>'FBK Karlstad',getProfile:()=>profileId,busy:value=>locks.push(value)};
 class Image{constructor(){this.width=100;this.height=100;}set src(value){queueMicrotask(()=>this.onload());}}
 await runInNewContext(source,{window:{BB3D_AI_EDITOR:editor,BB3D_PURCHASE:{ready:Promise.resolve(),current:()=>({purchaseId:'purchase-test',slotId:'slot-test',paid:true})}},document:{getElementById:node,addEventListener:(name,fn)=>{listeners[name]=fn;},createElement:tag=>tag==='canvas'?{getContext:()=>({drawImage(){}}),toDataURL:()=>'data:image/png;base64,synthetic'}:new Element()},fetch,Image,crypto:{randomUUID},URL:{createObjectURL:()=>{const u='blob:synthetic-'+urls.length;urls.push(u);return u;},revokeObjectURL(){}},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
 return{node,storage,locks,requests,jobs,changeProfile:value=>{profileId=value;listeners["bb3d:profile-change"]();},setStatus:value=>{status=value;},activate:async()=>{}};
}
test('AI client stays hidden when disabled and never sends a photo without consent',async()=>{
 const off=await client({available:false});assert.equal(off.node('ai-generate').disabled,true);
 const c=await client();await c.activate();await c.node('ai-generate').onclick();assert.equal(c.requests.filter(r=>r.action==='generate').length,0);assert.equal(c.storage.has(KEY),false);assert.deepEqual(c.locks,[]);
});
test('A lost generation response resumes the existing job instead of paying for another attempt',async()=>{
 const c=await client({networkFailure:true});await c.activate();c.node('ai-consent').checked=true;
 await c.node('ai-generate').onclick();assert.deepEqual(c.locks,[true,false]);assert.equal(c.requests.filter(r=>r.action==='generate').length,1);
 const saved=JSON.parse(c.storage.get(KEY));assert(saved.id);assert.deepEqual(Object.keys(saved),['id']);assert(!c.storage.get(KEY).includes(CODE));
 await c.node('ai-generate').onclick();assert.equal(c.requests.filter(r=>r.action==='generate').length,1);assert.equal(c.requests.filter(r=>r.action==='status').length,1);assert.equal(c.node('ai-result').hidden,false);assert.equal(c.node('ai-versions').children.length,1);
 // Rechecking the same completed result also reuses the already fetched image.
 assert.equal(c.requests.filter(r=>r.action==='result').length,1);
});
test('An expired pending job is cleared and two completed versions disable further generation',async()=>{
 const c=await client({saved:randomUUID()});await c.activate();assert.equal(c.storage.has(KEY),false);c.node('ai-consent').checked=true;
 await c.node('ai-generate').onclick();await c.node('ai-generate').onclick();assert.equal(c.requests.filter(r=>r.action==='generate').length,2);assert.equal(c.node('ai-generate').disabled,true);assert.equal(c.node('ai-versions').children.length,2);
 const image=c.node('ai-result-image'),first=c.node('ai-versions').children[0];first.onclick();assert.equal(image.src,'blob:synthetic-0');
});

test('Football AI cannot generate or apply a result while the editor is set to hockey',async()=>{
 const c=await client();await c.activate();c.node('ai-consent').checked=true;c.changeProfile('future-star-hockey');
 assert.equal(c.node('ai-photo-panel').hidden,true);assert.equal(c.node('ai-generate').disabled,true);
 await c.node('ai-generate').onclick();await c.node('ai-use').onclick();assert.equal(c.requests.filter(r=>r.action==='generate').length,0);
 c.changeProfile('future-star-football');assert.equal(c.node('ai-photo-panel').hidden,false);assert.equal(c.node('ai-generate').disabled,false);
});
