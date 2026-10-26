import fs from 'node:fs';
import {build} from 'esbuild';
import {cardProfiles} from '../lib/card-profiles.js';
fs.mkdirSync('public',{recursive:true});
fs.writeFileSync('public/card-profiles.js','window.BB3D_CARD_PROFILES='+JSON.stringify(cardProfiles)+';');
for(const file of ['studio.html','studio.css','studio.js','card-back.js','fantasy-elements.js','index.html','styles.css','app.js','assets.js','admin.html','admin.js','fiskeviks-logo.js','install.js','ai-client.js','purchase-client.js','print.js','ai-admin.js','fantasy-preview.html','fantasy-preview.css','fantasy-preview.js','fantasy-card.js','sample-art.js','manifest.webmanifest','README.md'])fs.copyFileSync(file,'public/'+file);
fs.cpSync('icons','public/icons',{recursive:true});
fs.mkdirSync('public/card-art',{recursive:true});
for(const name of ['eld','vatten','skog','blixt','trainer','eld-classic','vatten-classic','skog-classic','blixt-classic']){
 const path='card-art/'+name+'.webp',bytes=fs.readFileSync(path);
 if(bytes.length<12||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||bytes.readUInt32LE(4)+8!==bytes.length)throw Error('Invalid card artwork: '+path);
 fs.copyFileSync(path,'public/'+path);
}
await build({entryPoints:['src/upload.js'],bundle:true,minify:true,platform:'browser',target:['es2022'],outfile:'public/upload.js'});
console.log('Built BB3D customer studio, private admin UI and direct upload client.');

fs.copyFileSync('studio.html','public/index.html');
