'use strict';
// Public examples are separate from customer photos and can never unlock printing.
window.BB3D_CARD_ART={};
window.BB3D_SAMPLE_ART_READY=Promise.allSettled(
 ['eld','vatten','skog','blixt','trainer','eld-classic','vatten-classic','skog-classic','blixt-classic'].map(async key=>{
  const response=await fetch('/card-art/'+key+'.webp');
  if(!response.ok)throw Error('Exempelbilden kunde inte hämtas.');
  const photo=await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;
   response.arrayBuffer().then(bytes=>reader.readAsDataURL(new Blob([bytes],{type:'image/webp'}))).catch(reject);
  });
  const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=photo;});
  window.BB3D_CARD_ART[key]={photo,width:image.naturalWidth,height:image.naturalHeight};
 })
);
