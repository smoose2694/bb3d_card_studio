'use strict';
(async()=>{
  const editor=window.BB3D_AI_EDITOR;if(!editor)return;await editor.ready;await window.BB3D_PURCHASE.ready;
  const $=id=>document.getElementById(id),KEY='bb3d-paid-ai-v1';let available=false,quota=null,resultURL=null,working=false,claimed=false,pending=null;
  let resultMotif=null;let context=null,contextKey=null;const versions=[];const scope=()=>context?{purchaseId:context.purchaseId,slotId:context.slotId}:{};const headers=()=>context?{'X-BB3D-Purchase':context.purchaseId,'X-BB3D-Slot':context.slotId}:{};
  const supportsAI=()=>true;
  const panel=()=>{$('ai-photo-panel').hidden=!supportsAI();};
  document.addEventListener('bb3d:editor-idle',refresh);
  document.addEventListener('bb3d:profile-change',()=>{panel();refresh();});
  const message=text=>$('ai-photo-status').textContent=text;
  const remember=()=>{try{if(pending)sessionStorage.setItem(KEY+contextKey,JSON.stringify({id:pending.id,motif:pending.motif}));else sessionStorage.removeItem(KEY+contextKey);}catch{}};
  async function api(action,options={}){let response;try{response=await fetch('/api/ai?action='+action,options);}catch{const error=Error('Anslutningen avbröts. Kontrollera det senaste försöket innan du skapar en ny bild.');error.unknown=true;throw error;}let data;try{data=await response.json();}catch{const error=Error('Svaret kunde inte läsas. Kontrollera senaste försöket.');error.unknown=true;throw error;}if(!response.ok){const error=Error(data.error||'AI-funktionen kunde inte svara.');error.status=response.status;error.jobId=data.jobId;throw error;}return data;}
  const post=(action,data)=>api(action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  function refresh(){
    const waiting=pending?.status==='running';$('ai-generate').textContent=waiting?'Kontrollera senaste försöket':quota?.remaining===1?'Skapa en ny version':'Skapa AI-foto';
    $('ai-generate').disabled=!supportsAI()||working||(!waiting&&(!context?.paid||!available||!claimed||!quota?.remaining||quota?.attemptsRemaining===0));
    $('ai-use').disabled=working||!resultURL;
    if(quota)$('ai-quota').textContent=quota.attemptsRemaining+' av 2 AI-försök kvar för detta 4-pack. Även tekniska fel kan förbruka ett försök.';
  }
  async function showResult(id){
    let version=versions.find(v=>v.id===id);
    if(!version){const response=await fetch('/api/ai?action=result&id='+encodeURIComponent(id),{headers:headers()});if(!response.ok)throw Error('Bilden kunde inte hämtas. Kontrollera koden och försök igen.');version={id,motif:pending?.motif,url:URL.createObjectURL(await response.blob())};versions.push(version);}
    resultURL=version.url;resultMotif=version.motif;$('ai-result-image').src=resultURL;$('ai-result').hidden=false;$('ai-versions').replaceChildren();versions.forEach((v,i)=>{const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Visa version '+(i+1);button.onclick=()=>{resultURL=v.url;resultMotif=v.motif;$('ai-result-image').src=v.url;};$('ai-versions').append(button);});message('Din AI-bild är färdig. Välj Använd AI-bilden om du vill ha den på kortet.');
  }
  async function resume(){
    const captured=contextKey,jobId=pending.id;const data=await api('status&id='+encodeURIComponent(jobId),{headers:headers()});if(captured!==contextKey||pending?.id!==jobId)return data;pending.status=data.status;quota={...quota,remaining:data.remaining,attemptsRemaining:data.attemptsRemaining??quota?.attemptsRemaining??0};remember();
    if(data.status==='done')await showResult(data.id);else message(data.message||(data.status==='running'?'Bilden bearbetas fortfarande. Kontrollera igen om en stund.':'Försöket misslyckades. Du kan göra ett nytt försök om ditt 4-pack har försök kvar.'));
    return data;
  }
  async function loadContext(){
    const next=window.BB3D_PURCHASE.current(),key=next?.slotId||'';
    if(key===contextKey&&context?.paid===next?.paid)return;
    context=next;contextKey=key;claimed=false;quota=null;pending=null;resultURL=null;for(const v of versions)URL.revokeObjectURL(v.url);versions.length=0;$('ai-result').hidden=true;$('ai-consent').checked=false;$('ai-quota').textContent='';
    try{const saved=JSON.parse(sessionStorage.getItem(KEY+contextKey)||'null');if(saved?.id)pending={id:saved.id,status:'running',motif:saved.motif};}catch{}
    if(!context?.paid){message('Beställ och betala ett 4-pack, välj sedan en motivplats överst på sidan.');refresh();return;}
    const captured=contextKey;
    try{const result=await post('claim',scope());if(captured!==contextKey)return;quota=result;claimed=true;if(pending)await resume();else message('Två AI-försök ingår. Ladda upp ett foto och godkänn AI-bearbetningen.');}
    catch(e){if(captured===contextKey){if(e.status===410){pending=null;remember();}message(e.message);}}finally{refresh();}
  }
  document.addEventListener('bb3d:purchase-change',()=>loadContext());
  async function photoPNG(){const src=editor.getPhoto();if(!src)throw Error('Ladda upp ett spelarfoto först.');const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Fotot kunde inte läsas.'));i.src=src;});const scale=Math.min(1,768/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');}
  $('ai-generate').onclick=async()=>{
    if(working)return;let locked=false,previous=pending;
    try{
      if(!supportsAI())throw Error('AI-foto för detta kort är inte öppet ännu.');
      if(!context?.paid)throw Error('Välj ett betalt 4-pack först.');
      if(pending?.status==='running'){working=true;refresh();await resume();return;}
      if(!$('ai-consent').checked)throw Error('Godkänn att fotot skickas till OpenAI först.');if(!claimed)throw Error('Välj din betalda motivplats först.');

      editor.busy(true);locked=true;working=true;refresh();const photo=await photoPNG();pending={id:crypto.randomUUID(),status:'running',motif:editor.getMotif?.()||{club:editor.getClub()}};remember();refresh();message('Skapar ditt kortmotiv. Det kan ta några minuter. Låt sidan vara öppen.');
      const data=await post('generate',{id:pending.id,...scope(),...pending.motif,photo,consent:true});pending.status=data.status;quota.remaining=data.remaining;remember();
      if(data.status==='done')await showResult(data.id);else message(data.message||'Bilden bearbetas fortfarande. Kontrollera senaste försöket om en stund.');
      try{quota=await post('claim',scope());}catch{}
    }catch(e){if(e.status===410){pending=null;claimed=false;remember();}else if(!e.unknown&&!e.jobId&&e.status){pending=previous;remember();}message(e.message);}
    finally{if(locked)editor.busy(false);working=false;refresh();}
  };
  $('ai-use').onclick=async()=>{try{if(!supportsAI())throw Error('Välj en motivplats för att använda AI-bilden.');if(!resultURL)return;if(JSON.stringify(resultMotif)!==JSON.stringify(editor.getMotif?.()||{club:editor.getClub()}))throw Error('Denna AI-bild skapades med andra motivval. Återställ korttyp, klubb och element för att använda den.');const blob=await(await fetch(resultURL)).blob(),src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Bilden kunde inte läsas.'));reader.readAsDataURL(blob);});await editor.apply(src);message('AI-bilden används nu. Granska kortet och godkänn beställningen.');}catch(e){message(e.message);}};
  try{if(!editor.getConnection()?.orders)return;const config=await api('config');available=config.available;panel();await loadContext();refresh();}
  catch{}
})();
