import {randomBytes} from 'node:crypto';
import {fail,sha,UUID,DAY} from './core.js';
import {stockholmDay} from './sales.js';
const PATH='ai/control.json',LEASE=6*60000,MAX_SUCCESSES=2,MAX_ATTEMPTS=4;
const initial=()=>({version:1,settings:{enabled:false,dailyLimit:20},usage:{},grants:{},jobs:{},active:null});
export const normalCode=code=>typeof code==='string'?code.replace(/[\s-]/g,'').toUpperCase():'';
const codeKey=code=>sha(normalCode(code));
export function tidy(state,now){
  for(const [key,g]of Object.entries(state.grants))if(g.expiresAt<now-DAY)delete state.grants[key];
  for(const [id,j]of Object.entries(state.jobs))if(j.expiresAt<now)delete state.jobs[id];
  for(const day of Object.keys(state.usage))if(day<stockholmDay(now-3*DAY))delete state.usage[day];
  if(state.active&&state.active.until<=now){const job=state.jobs[state.active.id];if(job&&job.status==='running'){job.status='uncertain';job.message='Försöket kunde inte bekräftas. Gör inte om samma anrop. Kontakta BB3D vid behov.';}state.active=null;}
  return state;
}
export async function readControl(store,now=Date.now()){return tidy((await store.read(PATH))?.data||initial(),now);}
export const pruneControl=(store,now=Date.now())=>change(store,()=>({ok:true}),now);
async function change(store,fn,now){for(let i=0;i<10;i++){const old=await store.read(PATH),state=tidy(old?.data||initial(),now),result=fn(state);try{await store.write(PATH,state,{etag:old?.etag});return result;}catch(e){if(!e.conflict)throw e;}}fail(409,'Många samtidiga AI-försök. Vänta en stund.');}
function lookup(state,code,actor,now){const key=codeKey(code),g=state.grants[key];if(!/^[0-9A-F]{16}$/.test(normalCode(code))||!g||g.expiresAt<=now)fail(403,'Mässkoden är felaktig eller har gått ut.');if(g.actor&&g.actor!==actor)fail(403,'Koden används redan i en annan kundsession.');return{key,g};}
function info(g){return{remaining:Math.max(0,(g.maxImages??MAX_SUCCESSES)-g.successes),attemptsRemaining:Math.max(0,(g.maxAttempts??MAX_ATTEMPTS)-g.attempts),maxAttempts:g.maxAttempts??MAX_ATTEMPTS,expiresAt:g.expiresAt,cooldownUntil:g.lastAttemptAt?g.lastAttemptAt+30000:0};}
export const paidGrantInfo=(state,code)=>info(state.grants[codeKey(code)]||{maxImages:2,maxAttempts:2,successes:0,attempts:0});
export async function addPaidAttempts(store,{code,expiresAt},actor,requestId,now=Date.now()){
 if(!UUID.test(requestId))fail(400,'Tilldelningen har fel format.');
 return change(store,s=>{const key=codeKey(code);s.grants[key]??={createdAt:now,expiresAt,successes:0,attempts:0,actor,maxImages:2,maxAttempts:2,kind:'paid-pack'};const {g}=lookup(s,code,actor,now);g.bonusRequests??=[];
 if(!g.bonusRequests.includes(requestId)){if(g.maxAttempts>=100)fail(400,'Motivplatsens säkerhetstak är nått.');g.maxAttempts+=2;g.maxImages+=2;g.bonusRequests.push(requestId);}
 return{...info(g),dailyCapReached:(s.usage[stockholmDay(now)]||0)>=s.settings.dailyLimit};},now);
}
export async function ensurePaidGrant(store,{code,expiresAt},actor,now=Date.now()){
 const existing=await readControl(store,now);
 if(existing.grants[codeKey(code)])return info(lookup(existing,code,actor,now).g);
 return change(store,s=>{const key=codeKey(code);if(!s.grants[key])s.grants[key]={createdAt:now,expiresAt,successes:0,attempts:0,actor,maxImages:2,maxAttempts:2,kind:'paid-pack'};const {g}=lookup(s,code,actor,now);return info(g);},now);
}
export function controlSummary(state,providerReady,now=Date.now()){return{enabled:state.settings.enabled,available:state.settings.enabled&&providerReady,providerReady,dailyLimit:state.settings.dailyLimit,used:state.usage[stockholmDay(now)]||0,active:!!state.active,activeUntil:state.active?.until||null,maxImages:MAX_SUCCESSES,maxAttempts:MAX_ATTEMPTS,activeCodes:Object.values(state.grants).filter(g=>g.expiresAt>now).length,lastError:state.lastError||null};}
export async function configureAI(store,settings,providerReady,now=Date.now()){
  if(typeof settings.enabled!=='boolean'||!Number.isInteger(settings.dailyLimit)||settings.dailyLimit<0||settings.dailyLimit>5000)fail(400,'Välj 0–5000 API-försök per dygn.');
  if(settings.enabled&&!providerReady)fail(400,'OPENAI_API_KEY saknas. AI kan inte slås på ännu.');
  return change(store,s=>{s.settings={enabled:settings.enabled,dailyLimit:settings.dailyLimit};if(settings.enabled)s.lastError=null;return controlSummary(s,providerReady,now);},now);
}
export async function issueCode(store,now=Date.now()){
  const raw=randomBytes(8).toString('hex').toUpperCase(),key=codeKey(raw);
  return change(store,s=>{if(Object.values(s.grants).filter(g=>g.expiresAt>now).length>=100)fail(429,'Det finns redan 100 aktiva mässkoder.');const g={createdAt:now,expiresAt:now+2*3600000,successes:0,attempts:0,actor:null};s.grants[key]=g;return{code:raw.match(/.{4}/g).join('-'),...info(g)};},now);
}
export async function claimCode(store,code,actor,now=Date.now()){return change(store,s=>{if(!s.settings.enabled)fail(503,'AI-foton är tillfälligt avstängda.');const{g}=lookup(s,code,actor,now);g.actor=actor;return info(g);},now);}
export async function beginImage(store,{id,code,actor,fingerprint},now=Date.now()){
  if(!UUID.test(id)||!/^[a-f0-9]{64}$/.test(fingerprint))fail(400,'AI-försöket har fel format.');
  return change(store,s=>{
    const key=codeKey(code),old=s.jobs[id];
    if(old){if(old.actor!==actor||old.grant!==key||old.fingerprint!==fingerprint)fail(409,'Det här AI-försöket har ändrats.');return{start:false,job:old,remaining:info(s.grants[key]||{successes:2,attempts:4}).remaining};}
    if(!s.settings.enabled)fail(503,'AI-foton är tillfälligt avstängda.');const{g}=lookup(s,code,actor,now);if(s.active)fail(409,'AI arbetar redan med en bild. Försök om en liten stund.');
    if(g.successes>=(g.maxImages??MAX_SUCCESSES))fail(429,'Båda AI-bilderna för detta 4-pack är använda.');if(g.attempts>=(g.maxAttempts??MAX_ATTEMPTS))fail(429,'Detta 4-packs försökstak är nått. Kontakta BB3D.');
    if(g.lastAttemptAt&&now-g.lastAttemptAt<30000)fail(429,'Vänta minst 30 sekunder mellan bildförsöken.');
    const day=stockholmDay(now);if((s.usage[day]||0)>=s.settings.dailyLimit)fail(429,'Dagens AI-tak är nått. Kontakta BB3D.');
    g.actor=actor;g.attempts++;g.lastAttemptAt=now;s.usage[day]=(s.usage[day]||0)+1;
    const job={id,actor,grant:key,fingerprint,status:'running',createdAt:now,expiresAt:now+DAY};s.jobs[id]=job;s.active={id,until:now+LEASE};return{start:true,job,remaining:MAX_SUCCESSES-g.successes};
  },now);
}
export async function finishImage(store,id,{ok,imagePath,message,uncertain=false,disable=false},now=Date.now()){
  return change(store,s=>{const j=s.jobs[id];if(!j)fail(410,'AI-försöket har gått ut.');if(j.status!=='running')return j;
    j.status=ok?'done':uncertain?'uncertain':'failed';if(ok){j.imagePath=imagePath;const g=s.grants[j.grant];if(g)g.successes++;}else j.message=message||'AI-bilden kunde inte skapas.';
    if(!ok)s.lastError=j.message;if(disable)s.settings.enabled=false;if(s.active?.id===id&&!uncertain)s.active=null;return j;
  },now);
}
export async function ownImage(store,id,code,actor,now=Date.now()){
  if(!UUID.test(id))fail(404,'AI-bilden finns inte.');const s=await readControl(store,now),j=s.jobs[id];
  if(!j||j.expiresAt<=now)fail(410,'AI-bilden har gått ut.');if(j.actor!==actor||j.grant!==codeKey(code))fail(403,'AI-bilden tillhör en annan kundsession.');
  return{job:j,...info(s.grants[j.grant]||{successes:2,attempts:4})};
}
