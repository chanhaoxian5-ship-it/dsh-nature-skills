// SPDX-License-Identifier: Apache-2.0
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { relative, isAbsolute, resolve, extname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findPython, pythonEnvironment } from './runtime.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
export function resolveScript(skill, script, baseRoot = root) {
  const entry = catalog.find(e => e.directory === skill || e.name === skill);
  if (!entry) throw Error('Unknown Nature skill');
  if (isAbsolute(script)) throw Error('Script path must be relative to its skill directory');
  const base = realpathSync(resolve(baseRoot, 'skills', entry.directory));
  const target = realpathSync(resolve(base, script));
  const rel = relative(base, target);
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep) || !statSync(target).isFile()) {
    throw Error('Script must stay inside the selected skill directory');
  }
  return target;
}

export function main(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    console.log('Usage: node adapters/run.mjs --skill NAME --script scripts/FILE.py -- [script arguments]');
    return 0;
  }
  if (args[0] !== '--skill' || args[2] !== '--script' || args[4] !== '--') {
    throw Error('Expected --skill NAME --script RELATIVE_PATH -- [script arguments]');
  }
  const script = resolveScript(args[1], args[3]);
  const suffix = extname(script).toLowerCase();
  let command, prefix = [];
  if (suffix === '.py') {
    const python = findPython();
    command = python.command;
    prefix = [...python.prefix, '-X', 'utf8'];
  } else if (['.mjs', '.js', '.cjs'].includes(suffix)) {
    command = process.execPath;
  } else if (suffix === '.r') {
    command = 'Rscript';
  } else {
    throw Error('Only Python, Node and R scripts are supported by this launcher');
  }
  const result = spawnSync(command, [...prefix, script, ...args.slice(5)],
    {stdio: 'inherit', env: pythonEnvironment(), shell: false, windowsHide: true});
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch(error) { console.error(error.message); process.exitCode = 1; }
}
