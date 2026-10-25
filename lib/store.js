export function blobStore(sdk){return{
async read(path){const r=await sdk.get(path,{access:'private',useCache:false});if(!r)return null;return{data:await new Response(r.stream).json(),etag:r.blob.etag}},
async stream(path){return sdk.get(path,{access:'private',useCache:false})},
async binary(path){const r=await sdk.get(path,{access:'private',useCache:false});if(!r)return null;if(r.blob.size>12*1024*1024)throw Error('Image exceeds size limit');return{bytes:Buffer.from(await new Response(r.stream).arrayBuffer())}},
async write(path,data,{etag}={}){try{return await sdk.put(path,JSON.stringify(data),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{})})}catch(e){if(e instanceof sdk.BlobAlreadyExistsError||e instanceof sdk.BlobPreconditionFailedError)e.conflict=true;throw e}},
async list(prefix){const all=[];let cursor;do{const page=await sdk.list({prefix,limit:1000,cursor});all.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined}while(cursor);return all},
async remove(path){await sdk.del(path)}
}}
