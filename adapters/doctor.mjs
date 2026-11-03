// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import { findPython, pythonEnvironment } from './runtime.mjs';

const modules = ['yaml','jsonschema','requests','fitz','PIL','pypdf','pdfplumber','pypdfium2',
  'numpy','matplotlib','docx','pptx','openai','defusedxml','latex2mathml','mammoth'];
const result = {node: process.versions.node, python: null, modules: {}, cli: {},
  capabilities: {imageGeneration: 'check in the target DSH chat',
    browserLogin: 'requires separately configured browser capability',
    zotero: 'requires a separate connector, such as dsh-zotero',
    searchMcp: 'not bundled', schedulingAndMessaging: 'not configured by this plugin'}};
try {
  const python = findPython();
  const probe = spawnSync(python.command, [...python.prefix, '-X', 'utf8', '-c',
    'import importlib.util,json,sys;print(json.dumps({"version":sys.version,"modules":{m:importlib.util.find_spec(m) is not None for m in sys.argv[1:]}}))', ...modules],
    {encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000, env: pythonEnvironment()});
  if (probe.status !== 0) throw Error(probe.stderr || probe.error?.message || 'Python probe failed');
  const data = JSON.parse(probe.stdout);
  result.python = {command: python.command, version: data.version};
  result.modules = data.modules;
} catch(error) { result.python = {error: error.message}; }
for (const command of ['pandoc','pdftoppm','tesseract','Rscript','md-to-word']) {
  const probe = spawnSync(command, [command === 'pdftoppm' ? '-v' : '--version'], {encoding: 'utf8', shell: false, windowsHide: true, timeout: 3000});
  result.cli[command] = {available: !probe.error && probe.status === 0};
}
console.log(JSON.stringify(result, null, 2));
if (result.python?.error) process.exitCode = 1;
