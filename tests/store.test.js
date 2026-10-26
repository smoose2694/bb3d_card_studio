import test from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '@vercel/blob';
import {blobStore} from '../lib/store.js';

test('The installed Blob SDK preserves conditional-write conflicts without an AlreadyExists export',async()=>{
 const error=new sdk.BlobPreconditionFailedError();
 const store=blobStore({...sdk,put:async()=>{throw error;}});
 await assert.rejects(()=>store.write('ai/control.json',{version:1},{etag:'old-etag'}),e=>e===error&&e.conflict===true);
});

test('Storage failures retain their original error and are not retried as conflicts',async()=>{
 const error=new sdk.BlobAccessError();
 const store=blobStore({...sdk,put:async()=>{throw error;}});
 await assert.rejects(()=>store.write('ai/control.json',{}),e=>e===error&&!e.conflict);
});
