# 验证范围

已验证：

- 24 个上游候选和 1 个更新检查入口均能由 DSH 0.2.1-rc.5 的实际技能注册表发现和加载。
- nature-shared 为内部引用包，不作为独立用户工作流；researchwrite 保留其原 frontmatter 名称。
- 15 项 Node 测试覆盖原文/哈希保留、目录迁移、中文/空格/单引号路径、脚本路径检查和真实上游脚本的合成输入运行。
- 更新测试使用模拟 GitHub 元数据，覆盖缓存、强制检查、并发、失败/限流、无效响应、关闭检查和单次提示。
- 一次真实 GitHub 元数据检查返回 current，最新 SHA 与固定上游提交相同。
- 全部 24 个原始 SKILL.md 通过 skill-creator 格式验证。

本地诊断可发现多数 PDF、Python 文档和绘图模块，以及 pandoc/pdftoppm。未发现 latex2mathml、tesseract、Rscript 和 md-to-word；这些分别影响部分专利公式、OCR、R 绘图与新增 Word 导出路径，并非所有工作流都需要。诊断结果随环境变化，以 doctor 当前输出为准。

未验证：实际 DSH 模型对话、全部科研产物质量、远程检索服务、机构全文访问、消息投递、定时运行、生图工具和 macOS 实机。CI 配置已提供，但没有将本地检查说成远程跨平台 CI 已通过。

本次没有安装本插件、更新本机 Codex skills、安装额外依赖或修改 DSH profile。按用户要求将源码和发布包上传到其 GitHub，供手动下载；更新器仍然只检查并提示。完整源码和标准 npm tarball 均可供审阅。
