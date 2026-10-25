'use strict';
(async()=>{
  const editor=window.BB3D_AI_EDITOR;if(!editor)return;await editor.ready;
  const $=id=>document.getElementById(id),KEY='bb3d-ai-job-v1';let available=false,quota=null,resultURL=null,working=false,claimed=false,pending=null;
  const versions=[];
  try{const saved=JSON.parse(sessionStorage.getItem(KEY)||'null');if(saved&&typeof saved.id==='string')pending={id:saved.id,status:'running'};}catch{}
  const message=text=>$('ai-photo-status').textContent=text;
  const remember=()=>{try{if(pending)sessionStorage.setItem(KEY,JSON.stringify({id:pending.id}));else sessionStorage.removeItem(KEY);}catch{}};
  async function api(action,options={}){let response;try{response=await fetch('/api/ai?action='+action,options);}catch{const error=Error('Anslutningen avbröts. Kontrollera det senaste försöket innan du skapar en ny bild.');error.unknown=true;throw error;}let data;try{data=await response.json();}catch{const error=Error('Svaret kunde inte läsas. Kontrollera senaste försöket.');error.unknown=true;throw error;}if(!response.ok){const error=Error(data.error||'AI-funktionen kunde inte svara.');error.status=response.status;error.jobId=data.jobId;throw error;}return data;}
  const post=(action,data)=>api(action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  function refresh(){
    const waiting=pending?.status==='running';$('ai-generate').textContent=waiting?'Kontrollera senaste försöket':quota?.remaining===1?'Skapa en ny version':'Skapa AI-foto';
    $('ai-generate').disabled=working||(!waiting&&(!available||!claimed||!quota?.remaining||quota?.attemptsRemaining===0));
    $('ai-claim').disabled=working;$('ai-use').disabled=working||!resultURL;
    if(quota)$('ai-quota').textContent=quota.remaining+' färdiga bilder kvar · '+quota.attemptsRemaining+' API-försök kvar. Tekniska fel kan också förbruka API-försök.';
  }
  async function showResult(id){
    let version=versions.find(v=>v.id===id);
    if(!version){const response=await fetch('/api/ai?action=result&id='+encodeURIComponent(id),{headers:{'X-BB3D-AI-Code':$('ai-code').value}});if(!response.ok)throw Error('Bilden kunde inte hämtas. Kontrollera koden och försök igen.');version={id,url:URL.createObjectURL(await response.blob())};versions.push(version);}
    resultURL=version.url;$('ai-result-image').src=resultURL;$('ai-result').hidden=false;$('ai-versions').replaceChildren();versions.forEach((v,i)=>{const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Visa version '+(i+1);button.onclick=()=>{resultURL=v.url;$('ai-result-image').src=v.url;};$('ai-versions').append(button);});message('Din AI-bild är färdig. Välj Använd AI-bilden om du vill ha den på kortet.');
  }
  async function resume(){
    const data=await api('status&id='+encodeURIComponent(pending.id),{headers:{'X-BB3D-AI-Code':$('ai-code').value}});pending.status=data.status;quota={...quota,remaining:data.remaining,attemptsRemaining:data.attemptsRemaining??quota?.attemptsRemaining??0};remember();
    if(data.status==='done')await showResult(data.id);else message(data.message||(data.status==='running'?'Bilden bearbetas fortfarande. Kontrollera igen om en stund.':'Försöket misslyckades. Du kan göra ett nytt försök om koden har utrymme kvar.'));
    return data;
  }
  $('ai-claim').onclick=async()=>{
    try{if(!$('ai-code').value.trim())throw Error('Ange din mässkod först.');working=true;refresh();let differentCode=false;
      if(pending){try{await resume();}catch(e){if(e.status===410){pending=null;remember();}else if(e.status===403)differentCode=true;else throw e;}}
      if(available){quota=await post('claim',{code:$('ai-code').value});claimed=true;if(differentCode){pending=null;remember();for(const version of versions)URL.revokeObjectURL(version.url);versions.length=0;resultURL=null;$('ai-result').hidden=true;}message(resultURL?'Din tidigare AI-bild är hämtad. Du kan använda den på kortet.':'Mässkoden är aktiverad. Ladda upp ett foto och godkänn AI-bearbetningen.');}
      else if(!resultURL)message('Nya AI-foton är tillfälligt avstängda. En färdig bild kan fortfarande hämtas med samma kod.');
    }catch(e){message(e.message);}finally{working=false;refresh();}
  };
  $('ai-code').addEventListener('input',()=>{claimed=false;quota=null;refresh();});
  async function photoPNG(){const src=editor.getPhoto();if(!src)throw Error('Ladda upp ett spelarfoto först.');const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Fotot kunde inte läsas.'));i.src=src;});const scale=Math.min(1,768/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');}
  $('ai-generate').onclick=async()=>{
    if(working)return;let locked=false,previous=pending;
    try{
      if(!$('ai-code').value.trim())throw Error('Ange din mässkod.');
      if(pending?.status==='running'){working=true;refresh();await resume();return;}
      if(!$('ai-consent').checked)throw Error('Godkänn att fotot skickas till OpenAI först.');if(!claimed)throw Error('Aktivera mässkoden först.');
      if(editor.getClub()==='Egen klubb')throw Error('Välj en av de förberedda klubbmallarna för AI-fotot.');
      editor.busy(true);locked=true;working=true;refresh();const photo=await photoPNG();pending={id:crypto.randomUUID(),status:'running'};remember();refresh();message('Skapar ditt fotbollsmotiv. Det kan ta några minuter. Låt sidan vara öppen.');
      const data=await post('generate',{id:pending.id,code:$('ai-code').value,club:editor.getClub(),photo,consent:true});pending.status=data.status;quota.remaining=data.remaining;remember();
      if(data.status==='done')await showResult(data.id);else message(data.message||'Bilden bearbetas fortfarande. Kontrollera senaste försöket om en stund.');
      try{quota=await post('claim',{code:$('ai-code').value});}catch{}
    }catch(e){if(e.status===410){pending=null;claimed=false;remember();}else if(!e.unknown&&!e.jobId&&e.status){pending=previous;remember();}message(e.message);}
    finally{if(locked)editor.busy(false);working=false;refresh();}
  };
  $('ai-use').onclick=async()=>{try{if(!resultURL)return;const blob=await(await fetch(resultURL)).blob(),src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Bilden kunde inte läsas.'));reader.readAsDataURL(blob);});await editor.apply(src);message('AI-bilden används nu. Granska kortet och godkänn beställningen.');}catch(e){message(e.message);}};
  try{if(!editor.getConnection()?.orders)return;const config=await api('config');available=config.available;if(available||pending){$('ai-photo-panel').hidden=false;if(pending)message('Ett tidigare AI-försök kan finnas. Ange samma mässkod och aktivera den för att kontrollera resultatet.');refresh();}}
  catch{}
})();
