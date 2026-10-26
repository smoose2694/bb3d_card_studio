import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../bb3d-card-studio/runtime.js',import.meta.url),'utf8');
test('WordPress adapter maps API/query routes and auth headers, but does not transmit credentials to OpenAI or assets',async()=>{
 const calls=[],c={api:'https://example.test/shop/wp-json/bb3d-cards/v1/',base:'https://example.test/shop/wp-content/plugins/bb3d-card-studio/assets/',nonce:'synthetic-nonce',csrf:'synthetic-csrf'};
 const window={BB3D_WP:c,fetch:async(url,options)=>{calls.push({url,options});return Response.json({ok:true});}};
 const context={window,location:{origin:'https://example.test'},URL,Headers,Response,AbortSignal,fetch:(...args)=>window.fetch(...args)};
 vm.runInNewContext(source,context);
 await window.fetch('/api/purchase?action=status&id=own',{method:'GET'});
 assert.equal(calls[0].url,c.api+'purchase?action=status&id=own');assert.equal(calls[0].options.headers.get('X-WP-Nonce'),c.nonce);assert.equal(calls[0].options.headers.get('X-BB3D-CSRF'),c.csrf);
 await window.fetch('/card-art/trainer.webp');assert.equal(calls[1].url,c.base+'card-art/trainer.webp');assert.equal(calls[1].options.headers,undefined);
 await window.fetch('https://api.openai.com/anything');assert.equal(calls[2].options.headers,undefined);
 await window.BB3D_UPLOAD('incoming/own/image.png',new Blob(['synthetic']));assert.equal(calls[3].options.method,'POST');assert.match(calls[3].url,/upload\?pathname=incoming%2Fown%2Fimage.png/);
});
test('WordPress build uses the approved artwork and maps private print images through authenticated routes',()=>{
 const base=new URL('../bb3d-card-studio/assets/',import.meta.url);
 const admin=fs.readFileSync(new URL('admin.js',base),'utf8');assert(!admin.includes("'/api/card?id='"));assert(admin.includes('window.BB3D_WP.cardURL'));
 const purchase=fs.readFileSync(new URL('purchase-client.js',base),'utf8');assert(purchase.includes("window.BB3D_WP.page==='fantasy'"));assert(purchase.includes('window.BB3D_WP.fantasy'));
 for(const html of ['index.html','fantasy-preview.html','admin.html']){const s=fs.readFileSync(new URL(html,base),'utf8');assert(!s.includes('vercel.app'));assert(!s.includes('src="/'));assert(!s.includes('upload.js'));}
 const php=fs.readFileSync(new URL('../bb3d-card-studio/bb3d-card-studio.php',import.meta.url),'utf8');assert(php.includes('X-Content-Type-Options'));assert(php.includes('JSON_HEX_TAG'));
 for(const key of ['eld','vatten','skog','blixt','trainer','eld-classic','vatten-classic','skog-classic','blixt-classic'])assert(fs.readFileSync(new URL('card-art/'+key+'.webp',base)).equals(fs.readFileSync(new URL('../../card-art/'+key+'.webp',import.meta.url))));
});
