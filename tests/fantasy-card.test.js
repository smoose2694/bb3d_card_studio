import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const context={window:{}};runInNewContext(await readFile(new URL('../fantasy-card.js',import.meta.url),'utf8'),context);
const {render,palettes}=context.window.BB3D_FANTASY_CARD;
test('Fantasy renderer supports both modes and four palettes in the print aspect ratio',()=>{
 for(const mode of ['trainer','monster'])for(const element of Object.keys(palettes)){const svg=render({mode,element,name:'Example',hp:120,damage:70});assert(svg.startsWith('<svg'));assert(svg.includes('width="1488" height="2079" viewBox="0 0 630 880"'));assert(svg.includes(mode==='trainer'?'TRÄNARE':'MONSTER'));assert(svg.includes(palettes[element].name));assert(!svg.includes('foreignObject'));assert(!svg.includes('FOOTBALL CARDS'));}
});
test('Untrusted names, moves and image locations cannot become active SVG content',()=>{
 const svg=render({name:'<script>alert(1)</script>',attack:'<img src=x onerror=evil()>',ability:'A&B',note:'</text><script>evil()</script>',photo:'https://untrusted.example/image.png'});
 assert(!svg.includes('<script>'));assert(!svg.includes('<img'));assert(!svg.includes('untrusted.example'));assert(svg.includes('&lt;script&gt;'));assert(svg.includes('A&amp;B'));
 const image=render({photo:'data:image/png;base64,AAAA',zoom:500,width:600,height:450});assert(image.includes('clip-path="url(#fantasy-art)"'));assert(image.includes('href="data:image/png;base64,AAAA"'));
});
test('Fantasy values stay bounded and the page uses shared paid purchase and AI controls',async()=>{
 const svg=render({hp:9999,damage:-1,name:'W'.repeat(100),note:'A '.repeat(100)});assert(svg.includes('>300</text>'));assert(svg.includes('>0</text>'));assert(!svg.includes('W'.repeat(29)));assert(svg.includes('lengthAdjust="spacingAndGlyphs"'));
 const page=await readFile(new URL('../fantasy-preview.html',import.meta.url),'utf8'),client=await readFile(new URL('../fantasy-preview.js',import.meta.url),'utf8');assert(!client.includes('fetch('));assert(!page.includes('/api/'));assert(page.includes('/purchase-client.js'));assert(page.includes('/ai-client.js'));assert(client.includes('BB3D_PURCHASE.submit'));assert(client.includes('BB3D_PRINT.create'));
});
