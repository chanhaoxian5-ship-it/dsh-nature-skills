// SPDX-License-Identifier: Apache-2.0
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkForUpdates, takeUpdateNotice } from './adapters/update-check.mjs';

export const name = 'nature-skills-integration';
export const inject = ['skills'];
const defaultRoot = fileURLToPath(new URL('./', import.meta.url));
const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
const quote = value => `'${value.replaceAll("'", "''")}'`;

function guidance(entry, root) {
  const directory = join(root, 'skills', entry.directory);
  const runner = join(root, 'adapters', 'run.mjs');
  const specific = {
    'nature-paper-trans': '本流程要求图像编辑/生图工具。先确认当前 DSH 会话确实提供兼容工具；不可用时停止该流程并说明，不伪造已生成页面，也不擅自换成另一种交付。',
    'nature-paper2word': '该技能仅携带流程文档，md-to-word 是额外 CLI；先检查 md-to-word --version，缺失时按任务授权配置环境，未执行则不能声称导出成功。',
    'nature-reviewer': '互盲审稿依赖隔离上下文；只在用户授权且 DSH 当前提供该能力时调用。不能隔离时按上游降级说明，不能将同一上下文的多角色称为独立审稿。',
    'nature-literature-pipeline': '定时唤醒、飞书/Telegram 发送和归档通道需要另行配置及相应授权。安装本包不会创建定时任务或连接消息服务。',
    'nature-ref-verifier': '如已安装 dsh-zotero，新增文献使用其去重导入流程并复用已有 key；Word 引用、原生合并与字段写入是独立操作，不通过重新导入来修复引用关系。',
  }[entry.directory];
  return `## DSH 运行适配\n\n` +
    `本技能目录：\`${directory}\`\n共享参考目录：\`${join(root, 'skills', 'nature-shared')}\`\n` +
    `原技能中的 references/、scripts/、manifest.yaml 等路径相对此技能目录解析；../nature-shared/ 相对兄弟目录解析，不相对当前项目目录。` +
    `Codex/Claude 默认安装路径只是上游示例，此处实际路径优先。\n\n` +
    `Windows 使用 PowerShell。把上游 bash 示例换成等价 PowerShell 参数写法；不要原样执行 Bash 的 heredoc、export 或反斜杠续行。` +
    `Python/Node/R 脚本可通过下列启动器执行（示例中的 scripts/文件.py 换成技能实际提供的脚本）：\n\n` +
    '```powershell\n' + `node ${quote(runner)} --skill ${entry.directory} --script 'scripts/文件.py' -- <脚本参数>\n` + '```\n\n' +
    `启动器透传参数，选择 Python 并设置 UTF-8；不安装 Python 包、外部 CLI 或 MCP。缺少模块时先核对该技能 requirements 与当前任务需要。` +
    `本包不附带浏览器登录态、Zotero 连接、检索 MCP、生图服务、PDF 工具、Office 或定时/消息服务。使用当前 DSH 会话实际可用的能力；` +
    `缺少必需能力时说明具体缺项，不把上游工具名称当成已连接服务。` +
    `示例中的 /tmp 或 /mnt/data 输出路径应改为本次任务的实际工作目录。\n\n` +
    (specific ? `${specific}\n\n` : '') +
    `以下为上游技能正文，保留其证据要求、交付形式和授权边界。\n\n---\n\n`;
}

export function createProvider(root = defaultRoot, {checkUpdate = checkForUpdates, notice = takeUpdateNotice} = {}) {
  return {
    name: 'dsh-nature-skills',
    async list() {
      const entries = catalog.map(entry => ({name: entry.name, description: entry.description,
        provider: 'dsh-nature-skills', source: 'bundled', rank: 600,
        invocation: entry.invocation, locator: entry.directory,
        resourceBase: {kind: 'directory', path: join(root, 'skills', entry.directory)},
        path: join(root, 'skills', entry.directory, 'SKILL.md')}));
      entries.push({name: 'nature-skills-update', description: '检查 Nature Skills 原仓库更新，只提示，不同步、安装或发布。',
        provider: 'dsh-nature-skills', source: 'bundled', rank: 600,
        invocation: {modelInvocable: true, userInvocable: true}, locator: '@update',
        resourceBase: {kind: 'directory', path: root}, path: join(root, 'adapters', 'UPDATE_SKILL.md')});
      return entries;
    },
    async get(candidate, options = {}) {
      if (candidate.locator === '@update') {
        const raw = await readFile(join(root, 'adapters', 'UPDATE_SKILL.md'), {encoding: 'utf8', signal: options.signal});
        return {...candidate, content: raw.replaceAll('{{UPDATE_COMMAND_PS}}', quote(join(root, 'adapters', 'update-check.mjs')))};
      }
      const entry = catalog.find(e => e.directory === candidate.locator);
      if (!entry) return undefined;
      const path = join(root, 'skills', entry.directory, 'SKILL.md');
      const raw = await readFile(path, {encoding: 'utf8', signal: options.signal});
      const body = raw.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/u, '');
      let updateNotice = '';
      if (entry.directory !== 'nature-shared') {
        try { updateNotice = await notice(await checkUpdate({signal: options.signal})); }
        catch(error) { if (options.signal?.aborted) throw error; }
      }
      return {...candidate, path, content: updateNotice + guidance(entry, root) + body};
    },
  };
}

export function apply(ctx) {
  ctx.skills.registerProvider(() => createProvider());
}
