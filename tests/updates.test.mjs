import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkForUpdates, takeUpdateNotice } from '../adapters/update-check.mjs';
const old='a'.repeat(40), latest='b'.repeat(40);
const response=sha=>({ok:true,json:async()=>({sha,commit:{message:'Synthetic upstream change',committer:{date:'2026-11-03T00:00:00Z'}}})});

async function scenario(action){
  const path=await mkdtemp(join(tmpdir(),'nature-update-'));
  try{await action({env:{NATURE_SKILLS_STATE_DIR:path},installedCommit:old,now:1000000000},path);}
  finally{await rm(path,{recursive:true,force:true});}
}

test('checks metadata only, caches daily and can force a fresh check',async()=>scenario(async(options,path)=>{
  let calls=0;
  const fetchImpl=async url=>{calls++;assert.match(url,/api.github.com\/repos\/Yuan1z0825\/nature-skills\/commits\/main$/);return response(old)};
  const first=await checkForUpdates({...options,fetchImpl});
  assert.equal(first.status,'current');
  const cached=await checkForUpdates({...options,now:options.now+1000,fetchImpl});
  assert.equal(cached.cached,true);
  assert.equal(calls,1);
  await checkForUpdates({...options,force:true,fetchImpl});
  assert.equal(calls,2);
  assert.deepEqual((await readdir(path)).sort(),['upstream-check.json']);
}));

test('new commit produces one notice and does not change the pinned installed commit',async()=>scenario(async options=>{
  const result=await checkForUpdates({...options,fetchImpl:async()=>response(latest)});
  assert.equal(result.status,'update-available');
  assert.equal(result.installedCommit,old);
  const notices=await Promise.all([takeUpdateNotice(result),takeUpdateNotice(result),takeUpdateNotice(result)]);
  assert.equal(notices.filter(Boolean).length,1);
  assert.ok(notices.find(Boolean).includes('不要自动下载'));
  const state=JSON.parse(await readFile(result.cacheFile,'utf8'));
  assert.equal(state.notifiedCommit,latest);
  assert.equal(state.latestCommit,latest);
}));

test('offline and rate-limit failures remain unknown, not current',async()=>scenario(async options=>{
  const offline=await checkForUpdates({...options,fetchImpl:async()=>{throw Error('offline')}});
  assert.equal(offline.status,'unknown');
  const limited=await checkForUpdates({...options,force:true,fetchImpl:async()=>({ok:false,status:403})});
  assert.equal(limited.status,'unknown');
  assert.match(limited.error,/403/);
}));

test('invalid responses cannot announce an update',async()=>scenario(async options=>{
  const result=await checkForUpdates({...options,fetchImpl:async()=>response('not-a-commit')});
  assert.equal(result.status,'unknown');
  assert.equal(await takeUpdateNotice(result),'');
}));

test('explicitly disabled checking makes no network request and creates no cache',async()=>scenario(async(options,path)=>{
  const result=await checkForUpdates({...options,env:{...options.env,NATURE_SKILLS_CHECK_UPDATES:'0'},fetchImpl:async()=>{throw Error('must not run')}});
  assert.equal(result.status,'disabled');
  assert.deepEqual(await readdir(path),[]);
}));

test('concurrent loads share one upstream request',async()=>scenario(async options=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;await new Promise(r=>setTimeout(r,20));return response(latest)};
  await Promise.all(Array.from({length:8},()=>checkForUpdates({...options,fetchImpl})));
  assert.equal(calls,1);
}));

test('an expired cache checks again',async()=>scenario(async options=>{
  await checkForUpdates({...options,fetchImpl:async()=>response(old)});
  const result=await checkForUpdates({...options,now:options.now+25*60*60*1000,fetchImpl:async()=>response(latest)});
  assert.equal(result.status,'update-available');
  assert.equal(result.cached,false);
}));

test('the update command rejects apply/install flags instead of silently accepting them',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../adapters/update-check.mjs',import.meta.url)),'--apply'],{encoding:'utf8'});
  assert.equal(result.status,2);
  assert.match(result.stderr,/only checks/);
});
