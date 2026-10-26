import * as C from './core.js';
import * as P from './purchases.js';
import {blobStore} from './store.js';
let storage;
const getStore=async()=>storage??=blobStore(await import('@vercel/blob'));
export function createPurchaseHandler({loadStore=getStore,getEnv=()=>process.env}={}){return async request=>{try{const env=getEnv();if(!C.ready(env))C.fail(503,'Beställningar är inte anslutna.');const customer=C.actor(request,env),store=await loadStore(),url=new URL(request.url),action=url.searchParams.get('action')||'list';
 if(request.method==='GET'){if(action==='status')return C.json({purchase:P.purchaseView((await P.ownPurchase(store,url.searchParams.get('id')||'',customer)).data)});if(action==='list')return C.json({purchases:await P.listPurchases(store,customer)});C.fail(405,'Metoden stöds inte.');}
 C.sameOrigin(request);if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');await C.rateLimit(store,request,env,action==='presence'?'presence':'purchase',action==='presence'?600:60);const raw=await request.text();if(raw.length>15000)C.fail(413,'Anropet är för stort.');let b;try{b=JSON.parse(raw);}catch{C.fail(400,'Anropet kunde inte läsas.');}
 if(action==='presence')return C.json(await P.touchPurchase(store,b.purchaseId,b.slotId??null,customer));
 if(action==='create')return C.json({purchase:await P.createPurchase(store,b.id,customer,b.details)},201);
 if(action==='submit')return C.json({purchase:await P.submitPack(store,b.purchaseId,b.slotId,customer,b)});
 C.fail(405,'Metoden stöds inte.');
 }catch(e){return C.json({error:e instanceof C.HTTPError?e.message:'Köpet kunde inte sparas. Försök igen.'},e.status||503);}};}
export const purchaseHandler=createPurchaseHandler();
