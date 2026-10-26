'use strict';
(()=>{
 const c=window.BB3D_WP,nativeFetch=window.fetch.bind(window);
 const apiURL=path=>{const old=new URL(path,location.origin),route=old.pathname.slice(5);const url=new URL(c.api+route);for(const [key,value] of old.searchParams)url.searchParams.set(key,value);return url.href;};
 window.fetch=(input,options={})=>{
  if(typeof input==='string'&&input.startsWith('/api/')){
   const headers=new Headers(options.headers||{});headers.set('X-WP-Nonce',c.nonce);headers.set('X-BB3D-CSRF',c.csrf);
   return nativeFetch(apiURL(input),{...options,headers,credentials:'same-origin'}).then(async r=>{
    if(r.ok)return r;
    // Native WordPress permission failures use "message"; the existing editor
    // expects "error". Preserve the status and never retry a paid request.
    const copy=r.clone();try{const data=await copy.json();if(data.message&&!data.error)return Response.json({...data,error:data.message},{status:r.status});}catch{}
    return r;
   });
  }
  if(typeof input==='string'&&input.startsWith('/card-art/'))return nativeFetch(c.base+input.slice(1),options);
  return nativeFetch(input,options);
 };
 window.BB3D_UPLOAD=async(pathname,blob,onProgress)=>{
  if(blob.size>12*1024*1024)throw Error('Kortfilen är för stor.');
  const r=await fetch('/api/upload?pathname='+encodeURIComponent(pathname),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:blob,signal:AbortSignal.timeout(90000)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Tryckfilen kunde inte sparas.');onProgress?.({percentage:100});return data;
 };
})();
