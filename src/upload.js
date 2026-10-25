import {upload} from '@vercel/blob/client';
window.BB3D_UPLOAD=(pathname,blob,onUploadProgress)=>upload(pathname,blob,{access:'private',handleUploadUrl:'/api/upload',contentType:'image/png',onUploadProgress});
