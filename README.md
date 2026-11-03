# DSH Nature Skills

将 [Yuan1z0825/nature-skills](https://github.com/Yuan1z0825/nature-skills) 的科研技能封装成 DeepSeek Harness 插件。包含 23 个上游工作流、1 个内部共享包和 1 个更新检查入口。

[下载发布包与源码](https://github.com/chanhaoxian5-ship-it/dsh-nature-skills/releases)。

固定上游提交：`69817e4dad8bfc52fa4e59a9d8355e4264a4d3a7`（2026-11-02）。适配器不改写上游技能与脚本，原始副本和文件 SHA-256 位于 `upstream/`、`provenance.json`。

## 安装

要求 DSH `>=0.2.1-rc.5 <0.3.0`、Node >=22，profile 提供 skills 服务。运行 Python 脚本时需要 Python >=3.10。

```powershell
dsh plugin --profile desktop add 'D:/下载目录/dsh-nature-skills-0.1.0.tgz'
dsh --profile desktop --dump-config
```

确认配置包含 `dsh-nature-skills` 后，重新启动 DSH，在新对话中使用：

> 用 nature-paper-xray 精读这篇论文，包括正文和已有补充材料。

DSH 会根据 `dsh.bundle` 自动维护 profile，不必复制技能到全局目录。卸载使用 `dsh plugin --profile desktop remove dsh-nature-skills`。

## 工作流

| 名称 | 用途 |
| --- | --- |
| nature-paper-xray | 深读论文、设计思路、关键公式和证据边界 |
| nature-paper-card | 结构化精读卡 |
| nature-reader | 来源对应的中英文阅读稿 |
| nature-downloader | 合法全文与补充材料获取流程 |
| nature-academic-search | 多来源文献检索 |
| nature-citation | Nature/CNS 范围的支撑文献 |
| nature-ref-verifier | 参考文献逐字段核对 |
| nature-writing | 科研手稿起草和论证重构 |
| nature-polishing | 保留事实的润色与翻译 |
| nature-reviewer | 有条件隔离上下文的模拟审稿 |
| nature-response | 审稿回复与返修材料 |
| nature-data | 数据与代码可用性 |
| nature-statistics | 统计报告核查 |
| nature-figure | 科研绘图与配图检查 |
| nature-image2ppt | 图片重建为可编辑 PPT |
| nature-paper2ppt | 论文汇报 PPT |
| nature-paper2word | 学术 Markdown 导出 Word 的外部引擎流程 |
| nature-paper-trans | 依赖兼容生图工具的逐页中文 PDF |
| nature-paper-to-patent | 论文到技术交底/专利草稿 |
| researchwrite | 开题报告与研究计划，目录为 nature-proposal-writer |
| nature-social-science | 社会科学选题与论证 |
| nature-experiment-log | 实验记录整理 |
| nature-literature-pipeline | 条件配置的文献发现、投递与归档 |
| nature-skills-update | 只检查并报告上游更新 |

`nature-shared` 随包提供，保留兄弟目录结构；它不是独立工作流，不向用户或模型开放独立调用。

## 更新行为：只检查并提示

使用普通 Nature 技能时自动检查上游 main 的提交，每 24 小时最多请求一次。发现新 SHA 后，在下次加载技能时把一次更新提示交给模型显示；这不是后台弹窗服务，未使用技能时不主动唤醒 DSH。并发加载会合并请求，网络失败不阻断科研技能。

也可说“用 nature-skills-update 检查有没有上游更新”，或执行：

```powershell
node adapters/update-check.mjs --force
```

结果为 current、update-available、unknown 或 disabled。unknown 包括网络失败/限流，不会被说成“已经最新”。上游新提交不代表本 DSH 插件已有对应发布版。

检查只读取 GitHub 元数据、保存本地缓存和提示状态。不会下载技能、改写安装、创建 PR、自动发布、配置定时任务或改动 DSH profile。更新本包仍通过正常的插件安装/升级流程进行。

环境变量：

| 变量 | 作用 |
| --- | --- |
| NATURE_SKILLS_CHECK_UPDATES=0 | 关闭自动与手动网络检查 |
| NATURE_SKILLS_STATE_DIR | 指定缓存目录，默认 DSH_HOME/state/dsh-nature-skills |
| NATURE_SKILLS_PYTHON | 指定 Python 可执行文件完整路径，不附带参数 |
| DSH_HOME | 按 DSH 用户目录选择状态目录及配套 Python |

## 运行适配与依赖

DSH 提供器为技能加载结果附加实际绝对路径、Windows PowerShell 指引和能力要求，原文件本身保持不变。相对 references/scripts 路径以技能目录为基准，`../nature-shared` 指向共享兄弟目录。

运行技能附带脚本：

```powershell
node adapters/run.mjs --skill nature-shared --script scripts/check_consistency.py -- 'D:/项目/稿件.md' --json
```

启动器支持 Python、Node 和 R，采用参数数组调用，并检查脚本实际路径位于所选技能目录内。优先选择指定 Python、DSH 配套 Python，再选择 PATH 的解释器；设置 UTF-8。它不安装依赖，也不负责给脚本本身增加沙箱。

依赖诊断：`node adapters/doctor.mjs`。它只检查模块是否可发现和部分 CLI 的版本命令，不等于实际任务运行通过。

- 纯阅读/写作流程使用 DSH 当前模型及可用文件/PDF 能力。
- 检索 MCP、Firecrawl、机构浏览器登录态、Zotero、飞书/Telegram 和定时能力需要另行连接；本插件不附带这些服务或账户。
- 生图流程要求当前会话提供相应能力；缺失时应明确停止对应流程，而非伪造图片或改成交付其他产物。
- 绘图、文档、PDF 处理依技能的 requirements 和所选路径安装模块。`nature-paper2word` 只提供流程文档，实际引擎是额外的 `md-to-word` CLI。
- 若已安装 dsh-zotero，复用其去重导入流程；本包不内嵌第二套 Zotero 连接。

## 验证与来源

```powershell
npm test
npm pack --dry-run
```

包含技能发现/加载、原文与来源哈希、路径迁移、真实上游检查脚本的合成输入，以及更新缓存、并发、错误和提示去重测试。`tests/runtime-check.cjs` 可在已安装 DSH 的 Electron Node 环境下验证实际注册表，需用 `DSH_RUNTIME_ROOT` 指向包含 DSH node_modules 的目录。

本机已通过 DSH 0.2.1-rc.5 的隔离注册检查；未进行实际模型对话和全部科研任务验收。跨平台 CI 的实际结果见 [Actions](https://github.com/chanhaoxian5-ship-it/dsh-nature-skills/actions)，不以本地通过替代远程结果。

来源对比见 [上游检查](docs/upstream-report.md)，适配与测试边界见 [验证说明](docs/validation.md)。根许可证为上游 Apache-2.0；各文件原有的 MIT 或第三方许可声明保留。此包为社区适配，非 Nature、Springer Nature、DeepSeek 或上游项目的官方发行。
