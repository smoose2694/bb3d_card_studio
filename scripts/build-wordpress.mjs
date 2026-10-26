import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {cardProfiles} from '../lib/card-profiles.js';
import {cardPrompt,IMAGE_MODEL} from '../lib/ai-provider.js';
const root='wordpress/bb3d-card-studio',out=root+'/assets';
fs.mkdirSync(out,{recursive:true});
const clubs=JSON.parse(fs.readFileSync('lib/ai-clubs.json','utf8'));
for(const [name,club]of Object.entries(clubs))club.prompt=cardPrompt({profileId:'future-star-football',club:name});
const prompts={fantasy:{trainer:{},monster:{}}};
for(const mode of ['trainer','monster'])for(const element of ['eld','vatten','skog','blixt'])prompts.fantasy[mode][element]=cardPrompt({profileId:'bb3d-fantasy',mode,element});
for(const profileId of ['future-star-football','future-star-hockey'])prompts[profileId]=cardPrompt({profileId,club:profileId==='future-star-hockey'?'Egen hockeyklubb':'Egen klubb',primary:'__PRIMARY__',accent:'__ACCENT__'});
fs.writeFileSync(root+'/catalogue.json',JSON.stringify({profiles:cardProfiles,clubs,prompts,model:IMAGE_MODEL}));
for(const f of ['index.html','styles.css','app.js','assets.js','fiskeviks-logo.js','card-profiles.js','print.js','fantasy-preview.html','fantasy-preview.css','fantasy-preview.js','fantasy-card.js','sample-art.js','purchase-client.js','ai-client.js','admin.html','admin.js','ai-admin.js']){
 let s=f==='card-profiles.js'?'window.BB3D_CARD_PROFILES='+JSON.stringify(cardProfiles)+';':fs.readFileSync(f,'utf8');
 if(f.endsWith('.html')){
  s=s.replace(/<script src="\/?(?:upload|install)\.js" defer><\/script>/g,'').replace(/<link rel="manifest"[^>]*>/g,'');
  s=s.replace(/(src|href)="\/?([\w.-]+\.(?:js|css)|icons\/[^" ]+)"/g,'$1="__BB3D_ASSETS__$2"');
  s=s.replaceAll('https://bb3d-card-studio.vercel.app/bestallningar','__BB3D_ADMIN__').replaceAll('bb3d-card-studio.vercel.app/bestallningar','BB3D:s produktionskö');
  s=s.replaceAll('href="/fantasy"','href="__BB3D_FANTASY__"').replaceAll('href="/bestallningar"','href="__BB3D_ADMIN__"').replaceAll('href="/"','href="__BB3D_STUDIO__"').replaceAll('href="./"','href="__BB3D_STUDIO__"');
  s=s.replace('Använd administratörslösenordet du valde i Vercel.','Logga in med ditt behöriga WordPress-konto.').replace('Aktivitet uppdateras ungefär varje minut när kundens sida är synlig.','Aktivitet visas när kunden väljer köp, motivplats eller uppdaterar sitt köp.').replace('AI-foton är aktiverade.','AI-foton är aktiverade.');
  s=s.replace(/<section id="login-pane">[\s\S]*?<\/section>/,'<section id="login-pane"><h2>WordPress-inloggning</h2><p>Öppna produktionskön med ditt behöriga WordPress-konto.</p><a href="__BB3D_ADMIN__">Öppna WordPress-inloggningen</a><p id="login-status" role="status"></p></section>');
  s=s.replace('<button id="logout" style="margin-left:auto">Logga ut</button>','<button id="logout" style="margin-left:auto">Till kortstudion</button>');
 }
 if(f==='purchase-client.js')s=s.replaceAll("location.pathname==='/fantasy'","window.BB3D_WP.page==='fantasy'").replace("?'/':'/fantasy'","?window.BB3D_WP.studio:window.BB3D_WP.fantasy");
 if(f==='admin.js'){
  s=s.replaceAll("'/api/card?id='",'window.BB3D_WP.cardURL');
  s=s.replace(/\$\('logout'\)\.onclick=async\(\)=>\{[^\n]+/g,"$('logout').onclick=()=>{location.href=window.BB3D_WP.studio;};");
  s=s.replace(/\$\('login-form'\)\.onsubmit=async event=>\{[\s\S]*?\n\};\n/,'');
 }
 if(f==='ai-admin.js')s=s.replace('OPENAI_API_KEY saknas i Vercel.','AI-nyckeln saknas på webbhotellet.');
 fs.writeFileSync(path.join(out,f),s);
}
fs.copyFileSync(root+'/runtime.js',out+'/runtime.js');
for(const folder of ['card-art','icons']){
 fs.mkdirSync(out+'/'+folder,{recursive:true});
 for(const f of fs.readdirSync(folder))if(/\.(webp|png)$/.test(f))fs.copyFileSync(folder+'/'+f,out+'/'+folder+'/'+f);
}
for(const f of fs.readdirSync(out))if(f.endsWith('.js'))execFileSync(process.execPath,['--check',out+'/'+f],{stdio:'pipe'});
console.log('Built WordPress plugin with existing card renderers and no Vercel runtime dependencies.');
