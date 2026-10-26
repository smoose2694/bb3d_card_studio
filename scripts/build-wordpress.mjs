import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import elements from '../lib/fantasy-elements.json' with {type:'json'};
import {cardProfiles} from '../lib/card-profiles.js';
import {cardPrompt,IMAGE_MODEL} from '../lib/ai-provider.js';
const root='wordpress/bb3d-card-studio',out=root+'/assets';
fs.mkdirSync(out,{recursive:true});
const clubs=JSON.parse(fs.readFileSync('lib/ai-clubs.json','utf8'));
for(const [name,club]of Object.entries(clubs))club.prompt=cardPrompt({profileId:'future-star-football',club:name});
const prompts={fantasy:{trainer:cardPrompt({profileId:'bb3d-fantasy',mode:'trainer'}),monster:{}}};
for(const element of Object.keys(elements))prompts.fantasy.monster[element]=cardPrompt({profileId:'bb3d-fantasy',mode:'monster',element});
for(const p of cardProfiles.filter(p=>p.id!=='bb3d-fantasy'))prompts[p.id]=cardPrompt({profileId:p.id,club:p.clubs[0],primary:'__PRIMARY__',accent:'__ACCENT__'});
fs.writeFileSync(root+'/catalogue.json',JSON.stringify({profiles:cardProfiles,clubs,prompts,elements,model:IMAGE_MODEL}));
for(const f of ['studio.html','studio.css','studio.js','fantasy-elements.js','index.html','styles.css','app.js','assets.js','fiskeviks-logo.js','card-profiles.js','print.js','fantasy-preview.html','fantasy-preview.css','fantasy-preview.js','fantasy-card.js','card-fonts.js','sample-art.js','purchase-client.js','ai-client.js','admin.html','admin.js','ai-admin.js']){
 let s=f==='fantasy-elements.js'?'window.BB3D_ELEMENTS='+JSON.stringify(elements)+';':f==='card-profiles.js'?'window.BB3D_CARD_PROFILES='+JSON.stringify(cardProfiles)+';':fs.readFileSync(f,'utf8');
 if(f.endsWith('.html')){
  s=s.replace(/<script src="\/?(?:upload|install)\.js" defer><\/script>/g,'').replace(/<link rel="manifest"[^>]*>/g,'');
  s=s.replace(/(src|href)="\/?([\w.-]+\.(?:js|css)|icons\/[^" ]+)"/g,'$1="__BB3D_ASSETS__$2?ver=0.2.2"');
  s=s.replaceAll('https://bb3d-card-studio.vercel.app/bestallningar','__BB3D_ADMIN__').replaceAll('bb3d-card-studio.vercel.app/bestallningar','BB3D:s produktionskö');
  s=s.replaceAll('href="/fantasy"','href="__BB3D_FANTASY__"').replaceAll('href="/bestallningar"','href="__BB3D_ADMIN__"').replaceAll('href="/"','href="__BB3D_STUDIO__"').replaceAll('href="./"','href="__BB3D_STUDIO__"');
  s=s.replace('Kunden beställer valfritt antal 4-pack och swishar. Markera Swish som kontrollerad i kön. Varje 4-pack öppnar automatiskt två AI-försök i kundens webbläsare. Nya obetalda köp ger inga försök.','Kunden väljer 4-pack och får två AI-provförsök före betalning, delade mellan obetalda köp i samma webbläsare. Provförsöken räknas mot motivets försök och återställs inte vid betalning. Markera Swish som kontrollerad innan utskrift. Fler betalda 4-pack har egna försök. Nya obetalda köp återställer inte provförsöken.');
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

fs.cpSync('font-licenses','wordpress/bb3d-card-studio/assets/font-licenses',{recursive:true});
