import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createStore } from '../server/store.js';
import { Factory } from '../server/factory.js';
import { startServer } from '../server/http.js';

async function setup(){const dir=mkdtempSync(join(tmpdir(),'shift-http-'));const store=createStore(dir);const factory=new Factory(store);const server=await startServer(factory,{port:0,host:'127.0.0.1'});const address=server.address();return{dir,store,factory,server,base:`http://127.0.0.1:${address.port}`,close:async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true});}};}
test('serves app and CRUD API with same-origin mutation guard',async()=>{const t=await setup();try{let r=await fetch(t.base);assert.equal(r.status,200);assert.match(await r.text(),/SHIFT_13/);r=await fetch(`${t.base}/api/episodes`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);r=await fetch(`${t.base}/api/episodes`,{method:'POST',headers:{Origin:t.base,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,201);const e=(await r.json()).episode;assert.ok(e.id);assert.equal((await(await fetch(`${t.base}/api/state`)).json()).episodes.length,1);r=await fetch(`${t.base}/api/episodes/${e.id}/export`);assert.equal(r.status,409);}finally{await t.close();}});
test('rejects oversized JSON and traversal',async()=>{const t=await setup();try{let r=await fetch(`${t.base}/api/episodes`,{method:'POST',headers:{Origin:t.base,'Content-Type':'application/json'},body:JSON.stringify({title:'x'.repeat(300000)})});assert.equal(r.status,413);r=await fetch(`${t.base}/media/../../package.json`);assert.equal(r.status,404);}finally{await t.close();}});
test('rejects tiny special clips and removes partial upload files',async()=>{const t=await setup();try{let r=await fetch(`${t.base}/api/episodes`,{method:'POST',headers:{Origin:t.base,'Content-Type':'application/json'},body:'{}'});const e=(await r.json()).episode;r=await fetch(`${t.base}/api/episodes/${e.id}/special-clip`,{method:'PUT',headers:{Origin:t.base,'Content-Type':'video/mp4'},body:Buffer.alloc(32)});assert.equal(r.status,400);const imports=join(t.dir,'imports');assert.ok(!existsSync(imports)||readdirSync(imports).length===0);}finally{await t.close();}});
