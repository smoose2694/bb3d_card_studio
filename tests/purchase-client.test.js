import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('../purchase-client.js',import.meta.url),'utf8');
test('Payment watching reads only the selected purchase, stops after payment and expires when parked',async()=>{
 const nodes=new Map(),requests=[],timers=[];let now=1000,paid=false;
 const p={id:'own-purchase',paid:false,complete:false,status:'new',details:{packs:1},payment:{amountSEK:100,recipient:'test',message:'test',url:'test'},slots:[]};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,value:'',textContent:'',prepend(){},replaceChildren(){},append(){},setAttribute(){}});return nodes.get(id);};
 const document={hidden:false,getElementById:node,createElement:()=>node(Symbol()),querySelector:()=>node('host'),dispatchEvent(){}};
 const window={};
 await runInNewContext(source,{window,document,location:{pathname:'/fantasy'},Date:{now:()=>now},Event:class{},AbortSignal,setInterval:fn=>timers.push(fn),localStorage:{getItem:()=>JSON.stringify({id:p.id}),setItem(){}},fetch:async path=>{
  requests.push(path);const url=new URL(path,'https://test.invalid');
  if(url.pathname==='/api/config')return Response.json({orders:true});
  const action=url.searchParams.get('action');
  if(action==='list')return Response.json({purchases:[p]});
  if(action==='status'){assert.equal(url.searchParams.get('id'),p.id);return Response.json({purchase:{...p,paid}});}
  if(action==='presence')return Response.json({ok:true});
  throw Error('Unexpected request');
 }});
 await window.BB3D_PURCHASE.ready;await Promise.resolve();requests.length=0;
 await timers[0]();assert.equal(requests.length,1);assert.match(requests[0],/action=status&id=own-purchase/);
 now+=11*60000;await timers[0]();assert.equal(requests.length,1);
 node('purchase-refresh').onclick();await new Promise(resolve=>setImmediate(resolve));requests.length=0;
 document.hidden=true;await timers[0]();assert.equal(requests.length,0);
 document.hidden=false;paid=true;await timers[0]();requests.length=0;
 await timers[0]();assert.equal(requests.length,0);
});
