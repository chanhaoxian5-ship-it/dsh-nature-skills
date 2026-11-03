// SPDX-License-Identifier: Apache-2.0
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function pythonCandidates(env = process.env, platform = process.platform) {
  if (env.NATURE_SKILLS_PYTHON) return [{command: env.NATURE_SKILLS_PYTHON, prefix: []}];
  const bundled = join(env.DSH_HOME || join(homedir(), '.dsh'), 'dsh-runtimes', 'dsh-primary-runtime',
    'dependencies', 'python', ...(platform === 'win32' ? ['python.exe'] : ['bin', 'python3']));
  return [...(existsSync(bundled) ? [{command: bundled, prefix: []}] : []),
    ...(platform === 'win32' ? [{command: 'python', prefix: []}, {command: 'py', prefix: ['-3']}]
      : [{command: 'python3', prefix: []}, {command: 'python', prefix: []}])];
}

export function pythonEnvironment(env = process.env) {
  return {...env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1'};
}

export function findPython(env = process.env) {
  const found = pythonCandidates(env).find(({command, prefix}) => spawnSync(command,
    [...prefix, '-c', 'import sys;sys.exit(0 if sys.version_info >= (3,10) else 1)'],
    {env: pythonEnvironment(env), stdio: 'ignore', shell: false, windowsHide: true, timeout: 10000}).status === 0);
  if (!found) throw Error('需要 Python >=3.10；可用 NATURE_SKILLS_PYTHON 指定解释器完整路径。');
  return found;
}
