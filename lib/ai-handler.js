import * as C from './core.js';
import * as A from './ai-control.js';
import {inputImage} from './ai-images.js';
import {providerReady,motifSpec,requestCardEdit} from './ai-provider.js';
import {paidPackGrant} from './purchases.js';
import {blobStore} from './store.js';
let storage;
const getStore=async()=>storage??=blobStore(await import('@vercel/blob'));
async function bodyJSON(request,max=3600000){if(Number(request.headers.get('content-length')||0)>max)C.fail(413,'Bilden är för stor.');const text=await request.text();if(text.length>max)C.fail(413,'Bilden är för stor.');try{return JSON.parse(text);}catch{C.fail(400,'Anropet kunde inte läsas.');}}
const purchaseHeader=request=>request.headers.get('x-bb3d-purchase')||'';
const slotHeader=request=>request.headers.get('x-bb3d-slot')||'';
const jobResult=(job,remaining)=>({id:job.id,status:job.status,message:job.message||null,remaining});
export function createAIHandler({loadStore=getStore,getEnv=()=>process.env,editImage=requestCardEdit}={}){return async function aiHandler(request){const env=getEnv();let startedId=null;try{
  if(!C.ready(env))C.fail(503,'Kortstudion är inte ansluten ännu.');const store=await loadStore(),url=new URL(request.url),action=url.searchParams.get('action')||'config',ready=providerReady(env);
  if(action==='admin'){C.admin(request,env);if(request.method!=='GET')C.fail(405,'Metoden stöds inte.');return C.json(A.controlSummary(await A.readControl(store),ready));}
  if(action==='bonus'){
    C.admin(request,env);C.sameOrigin(request);if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');const b=await bodyJSON(request,1500);if(!C.UUID.test(b.purchaseId))C.fail(400,'Ogiltigt köp.');const r=(await store.read(C.recordPath(b.purchaseId)))?.data;if(r?.kind!=='purchase')C.fail(404,'Köpet finns inte.');
    const grant=await paidPackGrant(store,r.id,b.slotId,r.customer);return C.json(await A.addPaidAttempts(store,grant,C.sha(r.customer),b.requestId));
  }
  if(action==='settings'||action==='voucher'){
    C.admin(request,env);C.sameOrigin(request);if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');
    if(action==='settings')return C.json(await A.configureAI(store,await bodyJSON(request,1000),ready));
    C.fail(410,'Mässkoder har ersatts av betalda 4-pack.');
  }
  const actor=C.sha(C.actor(request,env));
  if(action==='quota'&&request.method==='GET'){const grant=await paidPackGrant(store,url.searchParams.get('purchaseId')||'',url.searchParams.get('slotId')||'',C.actor(request,env),false);const control=await A.readControl(store);return C.json({...A.paidGrantInfo(control,grant.code),available:A.controlSummary(control,ready).available});}
  if(action==='config'&&request.method==='GET'){const summary=A.controlSummary(await A.readControl(store),ready);return C.json({available:summary.available,maxImages:summary.maxImages});}
  if(action==='claim'){
    C.sameOrigin(request);if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');if(!ready)C.fail(503,'AI-foton är inte anslutna ännu.');await C.rateLimit(store,request,env,'ai-code',120);const body=await bodyJSON(request,1000);const grant=await paidPackGrant(store,body.purchaseId,body.slotId,C.actor(request,env));return C.json(await A.ensurePaidGrant(store,grant,actor));
  }
  if(action==='status'||action==='result'){
    if(request.method!=='GET')C.fail(405,'Metoden stöds inte.');const grant=await paidPackGrant(store,purchaseHeader(request),slotHeader(request),C.actor(request,env),false);const own=await A.ownImage(store,url.searchParams.get('id')||'',grant.code,actor);
    if(action==='status')return C.json({...jobResult(own.job,own.remaining),attemptsRemaining:own.attemptsRemaining,cooldownUntil:own.cooldownUntil});if(own.job.status!=='done')C.fail(409,'Bilden är inte färdig ännu.');const image=await store.stream(own.job.imagePath);if(!image)C.fail(410,'AI-bilden har gått ut.');return new Response(image.stream,{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
  }
  if(action==='generate'){
    C.sameOrigin(request);if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');if(!ready)C.fail(503,'AI-foton är inte anslutna ännu.');await C.rateLimit(store,request,env,'ai-generate',80);
    const body=await bodyJSON(request);if(body.consent!==true)C.fail(400,'Godkänn att fotot skickas till OpenAI först.');const spec=motifSpec(body);if(!spec)C.fail(400,'Välj en giltig korttyp, klubbfärger eller Pokémonkortvariant.');const grant=await paidPackGrant(store,body.purchaseId,body.slotId,C.actor(request,env));await A.ensurePaidGrant(store,grant,actor);const image=inputImage(body.photo),fingerprint=C.sha(image.hash+JSON.stringify(spec));
    const reservation=await A.beginImage(store,{id:body.id,code:grant.code,actor,fingerprint});if(!reservation.start)return C.json(jobResult(reservation.job,reservation.remaining));startedId=body.id;
    let output;
    try{output=await editImage({env,...spec,photo:body.photo,safetyIdentifier:actor});}
    catch(e){const j=await A.finishImage(store,body.id,{ok:false,message:e.message,uncertain:e.uncertain===true,disable:e.disable===true});return C.json(jobResult(j,reservation.remaining));}
    const path='ai/results/'+body.id+'.png';
    try{await store.writeBytes(path,output);const j=await A.finishImage(store,body.id,{ok:true,imagePath:path});return C.json(jobResult(j,reservation.remaining-1));}
    catch{const j=await A.finishImage(store,body.id,{ok:false,message:'AI-bilden skapades men kunde inte sparas. Kontakta BB3D.'});return C.json(jobResult(j,reservation.remaining));}
  }
  C.fail(405,'Metoden stöds inte.');
}catch(e){if(!(e instanceof C.HTTPError))console.error('BB3D AI request failed',{type:e.name});return C.json({error:e instanceof C.HTTPError?e.message:'AI-funktionen kunde inte svara. Försök igen om en stund.',jobId:startedId},e.status||503);}}
}
export const aiHandler=createAIHandler();
