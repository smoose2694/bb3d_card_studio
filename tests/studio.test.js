import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML,DOMParser} from 'linkedom';
import elements from '../lib/fantasy-elements.json' with {type:'json'};
import {cardProfiles} from '../lib/card-profiles.js';
import {motifSpec,cardPrompt} from '../lib/ai-provider.js';
import {details} from '../lib/core.js';
const html=fs.readFileSync(new URL('../studio.html',import.meta.url),'utf8');
async function setup(){
 const {window}=parseHTML(html),{document}=window;const errors=[];
 Object.defineProperty(window.HTMLElement.prototype,'htmlFor',{configurable:true,get(){return this.getAttribute('for');},set(v){this.setAttribute('for',v);}});
 const selectProto=window.HTMLSelectElement.prototype;
 Object.defineProperty(selectProto,'value',{configurable:true,get(){return [...this.options].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.options[0]?.getAttribute('value')??this.options[0]?.textContent??'';},set(v){for(const o of this.options){if((o.getAttribute('value')??o.textContent)===String(v))o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 window.HTMLCanvasElement.prototype.getContext=()=>({measureText:s=>({width:s.length*8}),drawImage(){}});
 document.fonts={add(){},ready:Promise.resolve()};
 class FontFace {load(){return Promise.resolve(this);}}
 class Image {constructor(){this.width=this.naturalWidth=512;this.height=this.naturalHeight=512;}set src(v){queueMicrotask(()=>this.onload?.());}}
 const storage={getItem:()=>null,setItem(){},removeItem(){}};
 const fetch=async url=>{if(url==='/api/config')return Response.json({orders:true});if(url.startsWith('/api/purchase'))return Response.json({purchases:[],ok:true});if(url==='/api/ai?action=config')return Response.json({available:false});throw Error('Unexpected request '+url);};
 const context=vm.createContext({window,document,DOMParser,XMLSerializer:class{serializeToString(n){return n.toString();}},FontFace,Image,Event:window.Event,URL,Blob,Response,Headers,AbortSignal,crypto:globalThis.crypto,fetch,localStorage:storage,sessionStorage:storage,location:{pathname:'/',origin:'https://fixture.test'},setInterval(){},console:{error:e=>errors.push(e),log(){}}});
 window.BB3D_CARD_PROFILES=cardProfiles;window.BB3D_ELEMENTS=elements;window.BB3D_CARD_ART={};window.BB3D_SAMPLE_ART_READY=Promise.resolve();
 for(const file of ['assets.js','fiskeviks-logo.js','card-back.js','fantasy-card.js','app.js','fantasy-preview.js','studio.js','purchase-client.js','ai-client.js'])vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
 await window.BB3D_AI_EDITOR.ready;await window.BB3D_PURCHASE.ready;await new Promise(resolve=>setImmediate(resolve));
 return {window,document,errors,change:(id,value)=>{document.getElementById(id).value=value;document.getElementById(id).dispatchEvent(new window.Event('input'));document.getElementById(id).dispatchEvent(new window.Event('change'));}};
}
test('One page has unique fields, one shared purchase/AI panel, and no crop controls',()=>{
 const {document}=parseHTML(html),ids=[...document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
 assert.equal(document.querySelectorAll('#ai-photo-panel').length,1);assert.equal(document.querySelectorAll('[data-editor]').length,2);assert(!document.querySelector('iframe'));
 assert.equal(document.querySelectorAll('input[type=range]').length,0);assert(document.querySelector('#purchase-mount'));
});
test('Switching card families keeps both drafts and moves the one AI panel beside the active input',async()=>{
 const c=await setup(),d=c.document;assert.equal(c.window.BB3D_AI_EDITOR.getProfile(),'future-star-football');
 assert.equal(d.getElementById('primary').value,'#15181f');assert.equal(d.getElementById('club').value,'Egen klubb');
 assert(!d.getElementById('status').textContent.includes('Kunde inte'),d.getElementById('status').textContent);assert(!d.getElementById('f-status').textContent.includes('Kunde inte'));
 c.change('name','SPORTAREN');d.querySelector('[data-editor=fantasy]').click();assert.equal(c.window.BB3D_AI_EDITOR.getProfile(),'bb3d-fantasy');
 assert.equal(d.getElementById('ai-photo-panel').parentNode.dataset.aiMount,'fantasy');c.change('f-fantasy-name','ÄVENTYRAREN');c.change('f-mode','trainer');
 assert.equal(d.getElementById('f-element-field').hidden,true);assert.equal(c.window.BB3D_AI_EDITOR.getMotif().element,undefined);
 d.querySelector('[data-editor=sports]').click();assert.equal(d.getElementById('name').value,'SPORTAREN');assert.equal(d.getElementById('ai-photo-panel').parentNode.dataset.aiMount,'sports');
 for(const profile of ['future-star-hockey','future-star-floorball','future-star-handball']){c.change('sport',profile);assert.equal(c.window.BB3D_AI_EDITOR.getProfile(),profile);assert(d.querySelector('#card svg'));}
 d.querySelector('[data-editor=fantasy]').click();assert.equal(d.getElementById('f-fantasy-name').value,'ÄVENTYRAREN');assert.equal(c.errors.length,0);
});
test('Back preview stays identical while front fields change, in both families',async()=>{
 const c=await setup(),d=c.document;d.getElementById('show-back').click();const back=d.getElementById('card').innerHTML;
 c.change('name','ÄNDRAT NAMN');c.change('primary','#ff0000');assert.equal(d.getElementById('card').innerHTML,back);assert(back.includes('BB3D'));
 d.querySelector('[data-editor=fantasy]').click();d.getElementById('f-fantasy-back').click();const fantasyBack=d.getElementById('f-fantasy-card').innerHTML;
 c.change('f-element','is');c.change('f-fantasy-name','NYTT');assert.equal(d.getElementById('f-fantasy-card').innerHTML,fantasyBack);assert.equal(fantasyBack,back);
});
test('All 18 monster recipes and both new sports are server validated with distinct environments',()=>{
 assert.equal(Object.keys(elements).length,18);
 for(const [element,v]of Object.entries(elements)){const spec=motifSpec({profileId:'bb3d-fantasy',mode:'monster',element});assert(spec);assert(cardPrompt(spec).includes(v.setting));}
 assert.deepEqual(motifSpec({profileId:'bb3d-fantasy',mode:'trainer',element:'is'}),motifSpec({profileId:'bb3d-fantasy',mode:'trainer'}));
 for(const id of ['future-star-floorball','future-star-handball']){const p=cardProfiles.find(p=>p.id===id);const spec=motifSpec({profileId:id,club:p.clubs[0],primary:'#15181f',accent:'#ffffff'});assert(cardPrompt(spec).includes('indoor'));const d=details({profileId:id,approved:true,player:'TEST',customerName:'TEST',contact:'',club:p.clubs[0],clubName:'MIN KLUBB',position:p.positions[0],stats:[90,90,90,90,90,90],total:90,quantity:4});assert.equal(d.profileId,id);}
});
