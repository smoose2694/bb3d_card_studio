import * as C from './core.js';
import {blobStore} from './store.js';
let storage;
async function getStore(){return storage??=blobStore(await import('@vercel/blob'))}
async function readJSON(request,max=15000){if(Number(request.headers.get('content-length')||0)>max)C.fail(413,'Anropet är för stort.');const raw=await request.text();if(raw.length>max)C.fail(413,'Anropet är för stort.');try{return JSON.parse(raw)}catch{C.fail(400,'Anropet kunde inte läsas.')}}
export function makeHandler(route){return async request=>{const env=process.env;try{
if(route==='config'){const configured=C.ready(env);const id=C.session(request,'customer',env)||C.newActor();return C.json({orders:configured,admin:configured&&C.session(request,'admin',env)!==null,setup:configured?null:{storage:!!(env.BLOB_READ_WRITE_TOKEN||env.BLOB_STORE_ID),password:env.ADMIN_PASSWORD?.length>=16,session:env.ADMIN_SESSION_SECRET?.length>=32},uploadPrefix:configured?'incoming/'+C.sha(id).slice(0,24)+'/':null},200,configured?{'Set-Cookie':C.cookie('customer',C.token('customer',id,86400,env),86400)}:{});}
if(route==='cleanup'){if(!env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${env.CRON_SECRET}`)C.fail(401,'Behörighet saknas.');const s=await getStore();return C.json({removed:await C.cleanup(s)});}
if(!C.ready(env))C.fail(503,'Beställningsmottagningen är inte färdigansluten. Inget har skickats.');
const store=await getStore(),url=new URL(request.url);
if(route==='session'){
if(request.method==='GET')return C.json({admin:!!C.session(request,'admin',env)});
C.sameOrigin(request);if(request.method==='DELETE')return C.json({ok:true},200,{'Set-Cookie':C.cookie('admin','',0)});
if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');await C.rateLimit(store,request,env,'login',8);const body=await readJSON(request,1000);if(!C.passwordOK(body.password,env))C.fail(401,'Fel lösenord.');return C.json({ok:true},200,{'Set-Cookie':C.cookie('admin',C.token('admin',C.newActor(),43200,env),43200)});
}
if(route==='upload'){
if(request.method!=='POST')C.fail(405,'Metoden stöds inte.');const body=await readJSON(request);const {handleUpload}=await import('@vercel/blob/client');const result=await handleUpload({body,request,onBeforeGenerateToken:async(pathname)=>{C.sameOrigin(request);const customer=C.actor(request,env);if(!/^incoming\/[a-f0-9]{24}\/[a-f0-9-]+\.png$/.test(pathname))C.fail(400,'Ogiltig bildsökväg.');const id=pathname.split('/').pop().replace('.png','');if(!C.UUID.test(id)||pathname!==C.imagePath(customer,id))C.fail(403,'Bilden tillhör inte din beställning.');await C.rateLimit(store,request,env,'upload',20);return{allowedContentTypes:['image/png'],maximumSizeInBytes:C.MAX_IMAGE,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+600000,tokenPayload:JSON.stringify({id})}},onUploadCompleted:async()=>{}});return C.json(result);
}
if(route==='orders'&&request.method==='POST'){C.sameOrigin(request);const customer=C.actor(request,env);await C.rateLimit(store,request,env,'order',30);const body=await readJSON(request);const receipt=await C.receipt(store,body.requestId,customer,body);return C.json({receipt},201);}

C.admin(request,env);
if(route==='orders'&&request.method==='GET')return C.json({orders:await C.orderList(store)});
if(route==='order'&&request.method==='PATCH'){C.sameOrigin(request);const body=await readJSON(request);return C.json({order:await C.updateOrder(store,url.searchParams.get('id')||'',body,body.updatedAt)})}
if(route==='card'&&request.method==='GET'){const id=url.searchParams.get('id')||'';if(!C.UUID.test(id))C.fail(404,'Beställningen finns inte.');const found=await store.read(C.recordPath(id));if(!found)C.fail(404,'Beställningen finns inte.');if(Date.parse(found.data.expiresAt)<=Date.now())C.fail(410,'Kortfilen har gått ut.');const image=await store.stream(found.data.imagePath);if(!image)C.fail(404,'Kortfilen saknas.');return new Response(image.stream,{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`${url.searchParams.has('download')?'attachment':'inline'}; filename="BB3D-${id.slice(0,8)}-63x88.png"`}});}
if(route==='stats'&&request.method==='GET')return C.json(await C.orderStats(store,{from:url.searchParams.get('from')||'',to:url.searchParams.get('to')||''}));
C.fail(405,'Metoden stöds inte.');
}catch(e){if(!(e instanceof C.HTTPError))console.error('BB3D request failed',{route,type:e.name});return C.json({error:e instanceof C.HTTPError?e.message:'Tjänsten kunde inte slutföra åtgärden. Försök igen.'},e.status||503)}}}
