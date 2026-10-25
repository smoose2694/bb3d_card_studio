'use strict';
(() => {
  const button=document.getElementById('install-app');
  const help=document.getElementById('install-help');
  const message=document.getElementById('install-status');
  let invitation=null;
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function update(){if(installed()){button.hidden=true;help.hidden=true;message.textContent='BB3D är öppnad som app.';}}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();invitation=event;if(!installed())button.hidden=false;});
  window.addEventListener('appinstalled',()=>{invitation=null;update();message.textContent='BB3D har lagts till som app.';});
  button.addEventListener('click',async()=>{
    if(!invitation){help.open=true;return;}
    button.disabled=true;
    try{const prompt=invitation;invitation=null;await prompt.prompt();const result=await prompt.userChoice;message.textContent=result.outcome==='accepted'?'Följ webbläsarens steg för att slutföra installationen.':'Du kan lägga till BB3D senare via webbläsarens meny.';button.hidden=true;}
    catch{help.open=true;message.textContent='Använd instruktionerna nedan för att lägga till BB3D.';}
    finally{button.disabled=false;}
  });
  update();
})();
