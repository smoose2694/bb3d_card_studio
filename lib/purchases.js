import {randomUUID} from 'node:crypto';
import * as C from './core.js';
import {cardIdentity,cardProfile} from './card-profiles.js';

const purchaseDetails=raw=>{
 const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))C.fail(400,'Ange ditt namn och kontrollera kontaktuppgiften.');return v.trim();};
 if(!Number.isInteger(raw?.packs)||raw.packs<1||raw.packs>25)C.fail(400,'Välj 1–25 stycken 4-pack.');
 return{customerName:text(raw.customerName,100,true),contact:text(raw.contact,180),packs:raw.packs,quantity:raw.packs*4,amountSEK:raw.packs*100,player:'Motiv väljs efter betalning',club:'Ej valt',clubName:'Ej valt'};
};
export async function ownPurchase(store,id,customer,{paid=false,open=false}={}){
 if(!C.UUID.test(id))C.fail(404,'Köpet finns inte.');const found=await store.read(C.recordPath(id)),r=found?.data;
 if(!r||r.kind!=='purchase'||r.customer!==customer)C.fail(404,'Köpet finns inte i denna kundsession.');
 if(Date.parse(r.expiresAt)<=Date.now())C.fail(410,'Köpet har gått ut. Kontakta BB3D.');
 if(paid&&!r.paid)C.fail(403,'BB3D behöver kontrollera din Swish-betalning först.');
 if(open&&r.status!=='new')C.fail(409,'Köpet är redan under produktion. Kontakta BB3D.');return found;
}
export function purchaseView(r){return{id:r.id,createdAt:r.createdAt,expiresAt:r.expiresAt,status:r.status,paid:r.paid===true,details:r.details,payment:C.payment(r),slots:r.slots.map((s,index)=>({id:s.id,index,ready:!!s.imagePath,player:s.details?.player||null,profileId:s.card?.profileId||null,editor:s.editor||null})),complete:r.slots.every(s=>!!s.imagePath)};}
export async function createPurchase(store,id,customer,raw){
 if(!C.UUID.test(id))C.fail(400,'Ogiltigt köp.');const details=purchaseDetails(raw),fingerprint=C.sha(JSON.stringify(details));
 const old=await store.read(C.recordPath(id));if(old){if(old.data.kind!=='purchase'||old.data.customer!==customer||old.data.fingerprint!==fingerprint)C.fail(409,'Köpet har ändrats. Börja ett nytt köp.');await ownPurchase(store,id,customer);await C.statistics(store,old.data);return purchaseView(old.data);}
 const r={id,kind:'purchase',customer,details,fingerprint,status:'new',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*C.DAY).toISOString(),slots:Array.from({length:details.packs},()=>({id:randomUUID()}))};
 try{await store.write(C.recordPath(id),r);}catch(e){if(!e.conflict)throw e;return createPurchase(store,id,customer,raw);}
 await C.statistics(store,r);return purchaseView(r);
}
export async function listPurchases(store,customer){const result=[];for(const item of await store.list('orders/')){const r=(await store.read(item.pathname))?.data;if(r?.kind==='purchase'&&r.customer===customer&&Date.parse(r.expiresAt)>Date.now())result.push(purchaseView(r));}return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
function editorSnapshot(raw){
 if(!raw||typeof raw!=='object')return null;
 const out={};for(const key of ['primary','accent'])if(/^#[a-f0-9]{6}$/i.test(raw[key]||''))out[key]=raw[key];
 // Photos and personal logos are deliberately not kept in the JSON draft.
 return out;
}
export async function submitPack(store,purchaseId,slotId,customer,body){
 if(!C.UUID.test(slotId)||!C.UUID.test(body.requestId)||!/^[a-f0-9]{64}$/.test(body.imageHash||''))C.fail(400,'Motivet har fel format.');
 const initial=await ownPurchase(store,purchaseId,customer,{paid:true}),slot=initial.data.slots.find(s=>s.id===slotId);if(!slot)C.fail(404,'Motivplatsen finns inte.');
 const details=C.details({...body.details,customerName:initial.data.details.customerName,contact:initial.data.details.contact,quantity:4}),fingerprint=C.sha(JSON.stringify(details)+body.imageHash);
 if(slot.imagePath){if(slot.fingerprint!==fingerprint)C.fail(409,'Detta 4-pack är redan godkänt. Kontakta BB3D för ändringar.');await C.statistics(store,initial.data);return purchaseView(initial.data);}
 const path=C.imagePath(customer,body.requestId),image=await store.binary(path);if(!image||C.validatePNG(image.bytes)!==body.imageHash)C.fail(400,'Tryckfilen saknas eller stämmer inte med godkännandet.');
 for(let n=0;n<6;n++){const found=await ownPurchase(store,purchaseId,customer,{paid:true,open:true}),r=found.data,s=r.slots.find(s=>s.id===slotId);if(s.imagePath){if(s.fingerprint!==fingerprint)C.fail(409,'Motivet godkändes i en annan flik.');await C.statistics(store,r);return purchaseView(r);}
 s.details=details;s.card=cardIdentity(cardProfile(details.profileId),details.position);s.imagePath=path;s.fingerprint=fingerprint;s.editor=editorSnapshot(body.editor);s.approvedAt=new Date().toISOString();r.updatedAt=new Date(Math.max(Date.now(),Date.parse(r.updatedAt||r.createdAt)+1)).toISOString();
 try{await store.write(C.recordPath(purchaseId),r,{etag:found.etag});await C.statistics(store,r);return purchaseView(r);}catch(e){if(!e.conflict)throw e;}}
 C.fail(409,'Köpet ändrades samtidigt. Uppdatera sidan.');
}
// The customer cannot mint grants or change their allowance. Each paid slot has
// one stable internal grant, shared by all tabs, re-logins and payment corrections.
export async function paidPackGrant(store,purchaseId,slotId,customer,generation=true){const {data:r}=await ownPurchase(store,purchaseId,customer,{paid:true,open:generation});const slot=r.slots.find(s=>s.id===slotId);if(!slot)C.fail(404,'Motivplatsen finns inte.');if(generation&&slot.imagePath)C.fail(409,'Motivet är redan godkänt för utskrift.');return{code:C.sha('paid-pack:'+r.id+':'+slot.id+':'+customer).slice(0,16).toUpperCase(),expiresAt:Date.parse(r.expiresAt)};}
