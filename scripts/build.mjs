import fs from 'node:fs';
import {build} from 'esbuild';
import {cardProfiles} from '../lib/card-profiles.js';
fs.mkdirSync('public',{recursive:true});
fs.writeFileSync('public/card-profiles.js','window.BB3D_CARD_PROFILES='+JSON.stringify(cardProfiles)+';');
for(const file of ['index.html','styles.css','app.js','assets.js','admin.html','admin.js','fiskeviks-logo.js','install.js','ai-client.js','purchase-client.js','ai-admin.js','fantasy-preview.html','fantasy-preview.css','fantasy-preview.js','fantasy-card.js','manifest.webmanifest','README.md'])fs.copyFileSync(file,'public/'+file);
fs.cpSync('icons','public/icons',{recursive:true});
await build({entryPoints:['src/upload.js'],bundle:true,minify:true,platform:'browser',target:['es2022'],outfile:'public/upload.js'});
console.log('Built BB3D customer studio, private admin UI and direct upload client.');
