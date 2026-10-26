import test from 'node:test';
import assert from 'node:assert/strict';
import {motifSpec,requestCardEdit,supportedClubs} from '../lib/ai-provider.js';

// Inspect the actual provider payload rather than just the prompt helper.
async function payload(raw){
 let sent;
 await assert.rejects(()=>requestCardEdit({
  env:{OPENAI_API_KEY:'synthetic-no-real-key'},
  ...motifSpec({...raw,prompt:'KEEP ORIGINAL CLOTHES AND BACKGROUND'}),
  photo:'data:image/png;base64,synthetic',safetyIdentifier:'synthetic',
  fetchImpl:async(url,request)=>{sent=JSON.parse(request.body);return new Response('',{status:429});}
 }),/full/);
 assert(!sent.prompt.includes('KEEP ORIGINAL CLOTHES AND BACKGROUND'));
 assert.equal(sent.n,1);
 return sent;
}

test('Every prepared football club sends its kit, emblem and replacement pitch scene to the provider',async()=>{
 for(const club of supportedClubs){
  const sent=await payload({profileId:'future-star-football',club});
  assert.equal(sent.images.length,2);
  assert(sent.prompt.includes(club));
  assert.match(sent.prompt,/short-sleeved football match shirt/);
  assert.match(sent.prompt,/green grass football pitch/);
  assert.match(sent.prompt,/Replace the original clothing and background completely/);
  assert.match(sent.prompt,/Preserve facial features and apparent age/);
  assert.match(sent.prompt,/whole head and hair inside the image/);
  if(club==='FBK Karlstad')assert.match(sent.prompt,/red jersey with white collar/);
 }
});

test('Custom sports send selected colors with different sport-specific clothing and environments',async()=>{
 for(const sport of ['football','hockey']){
  const sent=await payload({profileId:'future-star-'+sport,club:sport==='hockey'?'Egen hockeyklubb':'Egen klubb',primary:'#FF0000',accent:'#FFFFFF'});
  assert.equal(sent.images.length,1);
  assert.match(sent.prompt,/#ff0000/);assert.match(sent.prompt,/#ffffff/);
  assert.match(sent.prompt,/Replace the original clothing and background completely/);
  assert.match(sent.prompt,/Match the lighting, shadows, perspective and scale/);
  if(sport==='hockey'){
   assert.match(sent.prompt,/long-sleeved ice hockey jersey over shoulder and chest protection/);
   assert.match(sent.prompt,/indoor ice hockey arena/);
   assert.match(sent.prompt,/visible ice, rink boards/);
   assert.match(sent.prompt,/no helmet, face cage or visor covering it/);
  }else{
   assert.match(sent.prompt,/short-sleeved football match shirt/);
   assert.match(sent.prompt,/green grass football pitch/);
  }
 }
});

test('Trainers use one adventure recipe independent of legacy element selections',async()=>{
 const settings={eld:['red and charcoal','volcanic rock trail'],vatten:['blue and teal','rocky lakeshore'],skog:['green and earth-tone','lush forest trail'],blixt:['yellow and dark blue','rocky highland overlook']};
 for(const [element,[colors,scene]]of Object.entries(settings)){
  const sent=await payload({profileId:'bb3d-fantasy',mode:'trainer',element});
  assert.equal(sent.images.length,1);
  assert(sent.prompt.includes('practical adventure jacket'));
  assert.match(sent.prompt,/adventure jacket/);
  assert(sent.prompt.includes('sunny adventure town'));
  assert.match(sent.prompt,/same recognizable face, age, skin tone, hair and expression/);
  assert.match(sent.prompt,/age-appropriate, fully covering/);
  assert.match(sent.prompt,/Replace the original clothing and background completely/);
 }
});

test('Monster variants replace human clothing and use element habitats with full-creature framing',async()=>{
 const settings={eld:'volcanic rock trail',vatten:'rocky lakeshore',skog:'lush forest trail',blixt:'rocky highland overlook'};
 for(const [element,scene]of Object.entries(settings)){
  const sent=await payload({profileId:'bb3d-fantasy',mode:'monster',element});
  assert(sent.prompt.includes(scene));
  assert.match(sent.prompt,/all human clothing with creature anatomy/);
  assert.match(sent.prompt,/Do not paste a human face onto an animal body/);
  assert.match(sent.prompt,/Show the entire creature/);
  assert(!sent.prompt.includes('Compose head and upper body'));
 }
});
