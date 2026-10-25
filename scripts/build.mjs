import fs from 'node:fs';
import {build} from 'esbuild';
fs.mkdirSync('public',{recursive:true});
for(const file of ['index.html','styles.css','app.js','assets.js','admin.html','admin.js','README.md'])fs.copyFileSync(file,'public/'+file);
await build({entryPoints:['src/upload.js'],bundle:true,minify:true,platform:'browser',target:['es2022'],outfile:'public/upload.js'});
console.log('Built BB3D customer studio, private admin UI and direct upload client.');
