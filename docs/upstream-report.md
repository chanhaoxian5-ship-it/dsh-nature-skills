# 上游检查（2026-11-03）

来源已确认：[Yuan1z0825/nature-skills](https://github.com/Yuan1z0825/nature-skills)。本地已有技能与上游大部分文件一致，包含 paper-xray 及其共享资源；原仓库也提供 `.codex-plugin/plugin.json`，本地独立 skills 目录不是唯一分发方式。

本次检查 main 最新提交：[`69817e4dad8bfc52fa4e59a9d8355e4264a4d3a7`](https://github.com/Yuan1z0825/nature-skills/commit/69817e4dad8bfc52fa4e59a9d8355e4264a4d3a7)，2026-11-02 03:21:16 UTC。提交主题为学术检索和引用技能增加可选 Firecrawl 页面/PDF 阅读路径。

比较忽略纯 CRLF/LF 差异，不改动本机 Codex 安装：

| 上游相对本地的差异 | 内容 |
| --- | --- |
| 新增 nature-paper2word | 6 个文件；提供外部 md-to-word 引擎的使用流程 |
| nature-academic-search | 6 个文件有内容差异，涉及检索脚本、路由、参考文献管理和影响力核查说明 |
| nature-citation | static/core/principles.md 有内容差异 |
| nature-figure | validate_figure.py 及其安全测试有内容差异 |
| nature-paper-xray | 无内容差异 |
| 其他已有 Nature 技能 | 无内容差异 |

完整路径清单保存在 provenance.json 的 localComparison 中。该比较描述文件差异，不把每一处差异自动认定为本地缺陷。

打包基于上述固定上游提交，包含 24 个上游目录（23 个工作流、1 个内部共享包）。884 个上游文件均与 GitHub tree 中的 Git blob 哈希核对；来源 SHA-256 另存于 provenance.json。适配层不改写这些技能文件。

用户选择的更新模式是“只检查并提示”。更新器不会同步上游，也不会改变当前固定提交。未来上游发生变化时，应先检查差异、验证 DSH 适配，再通过正式发布包升级。
