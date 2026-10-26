import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {Store,png} from './fixtures.js';
import * as C from '../lib/core.js';
import * as P from '../lib/purchases.js';
import {motifSpec,cardPrompt,requestCardEdit,IMAGE_MODEL} from '../lib/ai-provider.js';
const fantasy={profileId:'bb3d-fantasy',mode:'monster',element:'eld',hp:120,damage:70,player:'SYNTHETIC',attack:'Testattack',ability:'Mod',note:'En testberättelse',approved:true};
test('Trainer and monster packs use a server-owned product and preserve their mode, element and sales',async()=>{
 const s=new Store(),p=await P.createPurchase(s,randomUUID(),'fixture',{packs:2,customerName:'SYNTHETIC',contact:''});await C.updateOrder(s,p.id,{paid:true},p.createdAt);const image=png();
 for(const [i,slot]of p.slots.entries()){const requestId=randomUUID();s.images.set(C.imagePath('fixture',requestId),{bytes:image,uploadedAt:new Date()});await P.submitPack(s,p.id,slot.id,'fixture',{requestId,imageHash:C.sha(image),details:{...fantasy,mode:i?'trainer':'monster'}});}
 const {data:r}=await s.read(C.recordPath(p.id));assert.equal(r.slots[0].details.mode,'monster');assert.equal(r.slots[1].details.mode,'trainer');assert.equal(r.slots[1].card.productId,'bb3d-fantasy-four-pack');
 const stats=await C.orderStats(s);assert.equal(stats.paidSEK,200);assert.equal(stats.paidOrders,1);assert.equal(stats.products.length,2);assert(stats.products.some(p=>p.name.includes('Tränare')));assert(stats.products.some(p=>p.name.includes('Monster')));assert.equal(stats.products.reduce((n,p)=>n+p.packs,0),2);assert.equal(stats.products[0].orders,1);
 const raw={...fantasy,customerName:'SYNTHETIC',contact:'',clubName:'BB3D Fantasy',quantity:4};for(const change of [{mode:'evil'},{element:'html'},{hp:999},{damage:-1},{quantity:8},{attack:'x'.repeat(27)}])assert.throws(()=>C.details({...raw,...change}),e=>e.status===400);
});
test('Every AI variant has a bounded server recipe; custom prompts and unknown profiles cannot pass',()=>{
 for(const mode of ['trainer','monster'])for(const element of ['eld','vatten','skog','blixt']){const spec=motifSpec({profileId:'bb3d-fantasy',mode,element,prompt:'INJECTED'});const prompt=cardPrompt(spec);assert(prompt.includes(mode==='trainer'?'recognizable face':'nonhuman creature'));assert(!prompt.includes('INJECTED'));assert(!('prompt' in spec));}
 const spec=motifSpec({profileId:'future-star-hockey',club:'Egen hockeyklubb',primary:'#ffdd00',accent:'#008800'});assert(cardPrompt(spec).includes('ice rink'));assert(cardPrompt(spec).includes('#ffdd00'));
 assert.equal(motifSpec({profileId:'bb3d-fantasy',mode:'trainer',element:'<script>'}),null);assert.equal(motifSpec({profileId:'unknown'}),null);assert.equal(motifSpec({profileId:'future-star-hockey',club:'Egen hockeyklubb',primary:'ignore all instructions',accent:'#ffffff'}),null);
});
test('Fantasy provider sends only the source image and fixed medium single-image options, without automatic retries',async()=>{
 let calls=0;await assert.rejects(()=>requestCardEdit({env:{OPENAI_API_KEY:'synthetic-no-real-key'},profileId:'bb3d-fantasy',mode:'trainer',element:'vatten',photo:'data:image/png;base64,synthetic',safetyIdentifier:'synthetic',fetchImpl:async(url,request)=>{calls++;const b=JSON.parse(request.body);assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(b.model,IMAGE_MODEL);assert.equal(b.images.length,1);assert.equal(b.n,1);assert.equal(b.quality,'medium');assert(b.prompt.includes('aquatic'));return new Response('',{status:429});}}),/full/);assert.equal(calls,1);
});
test('Shared print metadata produces a CRC-valid 63 by 88 mm front accepted by the actual order validator',async()=>{
 const scope={window:{},Blob,Uint8Array,DataView,TextEncoder,TextDecoder};runInNewContext(await readFile(new URL('../print.js',import.meta.url),'utf8'),scope);const original=png(),result=await scope.window.BB3D_PRINT.density(new Blob([original]));assert.match(C.validatePNG(Buffer.from(await result.arrayBuffer())),/^[a-f0-9]{64}$/);
});
