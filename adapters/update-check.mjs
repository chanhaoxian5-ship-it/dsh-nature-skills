// SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const provenance = JSON.parse(readFileSync(new URL('../provenance.json', import.meta.url), 'utf8'));
const repository = 'Yuan1z0825/nature-skills';
const endpoint = `https://api.github.com/repos/${repository}/commits/main`;
const day = 24 * 60 * 60 * 1000;
const inFlight = new Map();
const seenNotices = new Set();
const memoryState = new Map();

function cachePath(env) {
  return join(env.NATURE_SKILLS_STATE_DIR || join(env.DSH_HOME || join(homedir(), '.dsh'),
    'state', 'dsh-nature-skills'), 'upstream-check.json');
}
async function readState(path) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    return value?.repository === repository && Number.isFinite(value.checkedAt) ? value : {};
  } catch { return memoryState.get(path) || {}; }
}
async function saveState(path, state) {
  memoryState.set(path, state);
  await mkdir(dirname(path), {recursive: true});
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2) + '\n', 'utf8');
  await rename(temporary, path);
}
function report(state, installed, path, cached) {
  const valid = /^[a-f0-9]{40}$/u.test(state.latestCommit || '');
  return {status: state.error || !valid ? 'unknown' : state.latestCommit === installed ? 'current' : 'update-available',
    repository, installedCommit: installed, latestCommit: valid ? state.latestCommit : null,
    checkedAt: state.checkedAt ?? null, commitDate: state.commitDate ?? null,
    message: state.message ?? '', url: state.url ?? `https://github.com/${repository}`,
    cached, ...(state.error ? {error: state.error} : {}), cacheFile: path};
}

export async function checkForUpdates({force = false, env = process.env, fetchImpl = globalThis.fetch,
  now = Date.now(), installedCommit = provenance.commit, signal} = {}) {
  if (env.NATURE_SKILLS_CHECK_UPDATES === '0') {
    return {status: 'disabled', repository, installedCommit};
  }
  signal?.throwIfAborted();
  const path = cachePath(env);
  const state = await readState(path);
  if (!force && now >= state.checkedAt && now - state.checkedAt < day) {
    return report(state, installedCommit, path, true);
  }
  if (inFlight.has(path)) {
    const result = await inFlight.get(path);
    return {...result, installedCommit, status: result.status === 'unknown' ? 'unknown'
      : result.latestCommit === installedCommit ? 'current' : 'update-available'};
  }
  const task = (async () => {
    let next;
    try {
      const response = await fetchImpl(endpoint, {headers: {'Accept': 'application/vnd.github+json',
        'User-Agent': 'dsh-nature-skills-update-check'},
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000)});
      if (!response.ok) throw Error(`GitHub HTTP ${response.status}`);
      const body = await response.json();
      if (!/^[a-f0-9]{40}$/u.test(body.sha || '')) throw Error('Invalid upstream commit response');
      next = {repository, checkedAt: now, latestCommit: body.sha,
        message: String(body.commit?.message || '').split('\n')[0].slice(0, 300),
        commitDate: body.commit?.committer?.date ?? null,
        url: `https://github.com/${repository}/commit/${body.sha}`,
        notifiedCommit: state.notifiedCommit ?? null};
    } catch(error) {
      if (signal?.aborted) throw error;
      next = {...state, repository, checkedAt: now, error: String(error.message).slice(0, 300)};
    }
    try { await saveState(path, next); } catch { /* Read-only installs can still check; cache is optional. */ }
    return report(next, installedCommit, path, false);
  })();
  inFlight.set(path, task);
  try { return await task; }
  finally { inFlight.delete(path); }
}

export async function takeUpdateNotice(result) {
  if (result.status !== 'update-available') return '';
  const key = result.cacheFile + ':' + result.latestCommit;
  if (seenNotices.has(key)) return '';
  const state = await readState(result.cacheFile);
  if (seenNotices.has(key) || state.notifiedCommit === result.latestCommit) return '';
  seenNotices.add(key);
  try { await saveState(result.cacheFile, {...state, notifiedCommit: result.latestCommit}); } catch { /* In-process deduplication remains. */ }
  return `Nature Skills 上游发现新提交 ${result.latestCommit.slice(0, 7)}：${result.url}。` +
    `请在答复中向用户简短提示一次；当前包仍固定在 ${result.installedCommit.slice(0, 7)}，这不是已适配新发布版的保证。` +
    `用户选择了仅检查并提示，不要自动下载、同步、安装、创建 PR 或发布。\n\n`;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const unknown = process.argv.slice(2).find(arg => !['--help', '--force'].includes(arg));
  if (unknown) {
    console.error(`Unsupported option: ${unknown}. This command only checks for updates.`);
    process.exitCode = 2;
  } else if (process.argv.includes('--help')) {
    console.log('Usage: node adapters/update-check.mjs [--force]\nOnly checks the upstream commit; never changes installed skills.');
  } else {
    try {
      const result = await checkForUpdates({force: process.argv.includes('--force')});
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.status === 'unknown' ? 1 : 0;
    } catch(error) { console.error(error.message); process.exitCode = 1; }
  }
}
