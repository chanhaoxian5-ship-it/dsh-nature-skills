# Nature Skills 上游更新检查

用户选择“只检查并提示更新”。通过以下命令查询原仓库 main 的最新提交：

```powershell
node {{UPDATE_COMMAND_PS}} --force
```

解释结果：current 表示与本包固定提交一致；update-available 表示上游有不同的新提交；unknown 表示网络、限流或响应错误，本次不能判断；disabled 表示 NATURE_SKILLS_CHECK_UPDATES=0。

报告当前固定 SHA、上游 SHA、提交时间及链接。检查只访问上游元数据并保存本机缓存，不下载技能或修改安装文件。上游新提交不等于本 DSH 插件已有对应发布版。

不得自动同步、安装、创建更新 PR、发布、修改 DSH profile 或创建定时任务。正常使用其他 Nature 技能时也会自动检查，每 24 小时最多检查一次；发现新提交后在技能加载时提示一次。检查失败不阻断原有科研流程。缓存位于 DSH_HOME/state/dsh-nature-skills，可用 NATURE_SKILLS_STATE_DIR 改变位置。
