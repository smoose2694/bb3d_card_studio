'use strict';
(()=>{
  const $=id=>document.getElementById(id);let busy=false,dirty=false,createdCode='';
  async function api(action,data){const response=await fetch('/api/ai?action='+action,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const result=await response.json();if(!response.ok)throw Error(result.error||'AI-inställningarna kunde inte hämtas.');return result;}
  async function load(){if(busy||$('admin-pane').hidden)return;busy=true;try{const state=await api('admin');
    if($('admin-pane').hidden)return;if(!dirty){$('ai-enabled').checked=state.enabled;$('ai-limit').value=state.dailyLimit;}$('ai-enabled').disabled=!state.providerReady&&!state.enabled;
    $('ai-admin-status').textContent=!state.providerReady?'OPENAI_API_KEY saknas i Vercel. AI-generering är avstängd.':state.enabled?'AI-foton är aktiverade. Två provförsök kan användas före betalning i samma webbläsare. Kontrollerad Swish krävs för utskrift.':'API-nyckel finns. Slå på AI-foton när anslutningen är redo att provköras.';
    if(state.lastError)$('ai-admin-status').textContent+=' Senaste AI-fel: '+state.lastError;
    $('ai-admin-usage').textContent='Idag: '+state.used+' av '+state.dailyLimit+' API-försök'+(state.active?' · En bild bearbetas just nu.':'.');
  }catch(e){$('ai-admin-status').textContent=e.message;}finally{busy=false;}}
  $('ai-settings-form').addEventListener('input',()=>{dirty=true;});
  $('ai-settings-form').onsubmit=async event=>{event.preventDefault();try{await api('settings',{enabled:$('ai-enabled').checked,dailyLimit:Number($('ai-limit').value)});dirty=false;await load();}catch(e){$('ai-admin-status').textContent=e.message;}};
  document.addEventListener('bb3d:admin-ready',load);
  document.addEventListener('bb3d:admin-logout',()=>{createdCode='';$('ai-admin-status').textContent='Logga in för att hantera AI-foton.';});
  load();
})();
