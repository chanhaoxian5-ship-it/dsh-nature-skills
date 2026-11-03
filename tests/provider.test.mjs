import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createProvider } from '../index.mjs';
import { resolveScript } from '../adapters/run.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const options = {checkUpdate: async () => ({status:'current'}), notice: async () => ''};

test('all upstream skills load, researchwrite keeps its name, shared is internal', async () => {
  const provider = createProvider(root, options);
  const list = await provider.list();
  assert.equal(list.length,25);
  assert.equal(new Set(list.map(e=>e.name)).size,25);
  assert.ok(list.some(e=>e.name==='researchwrite'));
  assert.ok(list.some(e=>e.name==='nature-paper2word'));
  const shared=list.find(e=>e.name==='nature-shared');
  assert.deepEqual(shared.invocation,{modelInvocable:false,userInvocable:false});
  for(const entry of list){
    const loaded=await provider.get(entry);
    assert.ok(loaded.content.length>300,entry.name);
    assert.ok(!loaded.content.startsWith('---\n'),entry.name);
    if(entry.name!=='nature-skills-update')assert.ok(loaded.content.includes('DSH 运行适配'));
  }
  assert.equal(await provider.get({locator:'../private'}),undefined);
});

test('paper-xray remains intact and its shared resource exists', async()=>{
  const provider=createProvider(root,options);
  const item=(await provider.list()).find(e=>e.name==='nature-paper-xray');
  const loaded=await provider.get(item);
  const raw=await readFile(item.path,'utf8');
  const body=raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u,'');
  assert.ok(loaded.content.endsWith(body));
  const taxonomy=await readFile(join(root,'skills/nature-shared/core/paper-type-taxonomy.md'),'utf8');
  assert.ok(taxonomy.length>100);
});

test('relocation and PowerShell quoting work with Chinese, spaces and apostrophes',async()=>{
  const temp=await mkdtemp(join(tmpdir(),"nature 中文's "));
  try{
    const target=join(temp,'skills/nature-paper-xray');
    await mkdir(target,{recursive:true});
    await copyFile(join(root,'skills/nature-paper-xray/SKILL.md'),join(target,'SKILL.md'));
    const provider=createProvider(temp,options);
    const entry=(await provider.list()).find(e=>e.name==='nature-paper-xray');
    const loaded=await provider.get(entry);
    assert.equal(entry.resourceBase.path,target);
    assert.ok(loaded.content.includes(join(temp,'adapters/run.mjs').replaceAll("'","''")));
    assert.ok(loaded.content.includes(join(temp,'skills/nature-shared')));
  }finally{await rm(temp,{recursive:true,force:true});}
});

test('launcher rejects absolute and escaping paths',()=>{
  assert.throws(()=>resolveScript('nature-shared','../../package.json'),/inside/);
  assert.throws(()=>resolveScript('nature-shared',join(root,'package.json')),/relative/);
  assert.throws(()=>resolveScript('unknown','scripts/a.py'),/Unknown/);
});

test('launcher runs the real upstream checker with Unicode path arguments',async()=>{
  const temp=await mkdtemp(join(tmpdir(),"nature input's 中文 "));
  try{
    const path=join(temp,'稿件 sample.md');
    await writeFile(path,'The scale bar is 10 mm. Another scale bar is 1 cm.\n','utf8');
    const result=spawnSync(process.execPath,[join(root,'adapters/run.mjs'),'--skill','nature-shared',
      '--script','scripts/check_consistency.py','--',path,'--json'],{encoding:'utf8',timeout:20000});
    assert.equal(result.status,0,result.stderr);
    const rows=JSON.parse(result.stdout);
    assert.ok(rows.some(e=>e.code==='EQUIVALENT_LENGTH_UNIT_VARIANT'));
  }finally{await rm(temp,{recursive:true,force:true});}
});

test('an unavailable update endpoint does not block a research skill',async()=>{
  const provider=createProvider(root,{...options,checkUpdate:async()=>{throw Error('offline')}});
  const entry=(await provider.list()).find(e=>e.name==='nature-paper-xray');
  assert.ok((await provider.get(entry)).content.includes('Nature Paper X-Ray'));
});

test('provenance covers an unchanged upstream and active skill files',async()=>{
  const provenance=JSON.parse(await readFile(join(root,'provenance.json'),'utf8'));
  assert.equal(provenance.commit,'69817e4dad8bfc52fa4e59a9d8355e4264a4d3a7');
  for(const [path,digest] of Object.entries(provenance.files)){
    const bytes=await readFile(join(root,'upstream/nature-skills',path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,path);
    if(path.startsWith('skills/')){
      const active=await readFile(join(root,path));
      assert.deepEqual(active,bytes,path);
    }
  }
});
