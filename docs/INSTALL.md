# 安装与排障 / Installation & troubleshooting

推荐 Windows + Codex 本地 marketplace，完整步骤见 [中文](../README.md) / [English](../README.en.md)。不要同时启用 [直接 MCP 配置示例](codex-mcp.toml.example)。该手工备选路线需要自行提供安全环境变量；macOS / Linux 与其他客户端尚未实测，Windows DPAPI 文件不可迁移。

## 预备工具 / Prerequisites

`node --version` 应为 22+，`pwsh --version` 应为 7+，`codex plugin --help` 应包含插件管理命令。按 [官方 Codex CLI 文档](https://developers.openai.com/codex/cli) 安装 CLI（例如 `npm install -g @openai/codex`）。安装本地插件不替你登录 Codex；需要登录时自行使用客户端登录流程。

## 常见问题 / Troubleshooting

| 现象 / Symptom | 处理 / Action |
| --- | --- |
| 找不到 node/npm/pwsh/codex | 安装前置工具，重新打开终端 / Install prerequisites and reopen the terminal |
| CLI 不支持 plugin 命令 | 更新官方 Codex CLI / Update the official CLI |
| 旧 CLI 报 max_concurrent_threads_per_session 配置解析错误 | 脚本只在本次命令使用兼容覆盖，不编辑该设置 / Process-only compatibility override; no setting rewrite |
| 同名市场属于另一目录 | 使用原始安装目录；勿强制覆盖 / Use the original checkout; do not force overwrite |
| configured=false | 当前 Windows 用户尚未录入凭据 / Configure credentials for the current user |
| 连接失败 / Connection failed | 检查网络、IMAP 开关、授权码是否撤销；重新录入，不发送错误里的私密信息 / Check network, IMAP and code validity |
| 本地 status 成功，桌面无工具 | 自行重新加载 Codex，新建会话；CLI SDK 检查不等于桌面加载 / Reload Codex and start a fresh conversation |
| list_new 重复返回 | 成功处理后传 ackToken；不是按“未读”去重 / Acknowledge processed pages |
| UIDVALIDITY 变化、损坏状态或 pending mail 消失 | 停止自动确认，人工核对后迁移状态；不自动清空 / Stop automatic ACK and inspect before migration |
| 文件安全策略阻止脚本 | 按组织政策处理；不要为安装全局关闭安全策略 / Follow organizational policy; no global policy bypass |

安装器不更改权限、执行策略或 IMAP 开关，不重启应用。依赖从官方 npm 注册表安装，`--ignore-scripts` 禁用依赖生命周期脚本。

## 备份与失败恢复 / Backups and recovery

脚本输出备份目录，位于所选 Codex 配置目录的 `backups/qq-mail-<随机标识>/`。保存原 `config.toml`，更新已有适配器时也保存 marketplace 副本。不要公开备份。CLI 失败时不会自动回滚整个配置：其他客户端可能同时修改配置，盲目恢复会丢失其修改。核对差异后只恢复 QQ 插件条目；原始备份用于人工恢复。CLI 部分成功后可检查注册状态，再在同目录重新运行安装器。

Backups retain original config and, when present, the adapter. There is no automatic whole-config rollback because another client may modify it concurrently. Inspect differences, restore only affected QQ entries and retry from the original checkout.

隔离测试可使用 `-ConfigHome <临时目录> -InstallRoot <临时适配目录> -SkipDependencyInstall`；最后选项仅用于依赖已经安装的测试环境。正常用户不需要这些参数。不得拿真实凭据做测试。

## 工具参数 / Tool details

搜索字段 subject/from/since/before/unread；日期 YYYY-MM-DD，since 包含当天、before 不含。使用 nextAfterUid 与 uidValidity 继续分页。每页 limit 1..50，每次扫描最多 1000 UID 范围，稀疏页也可能 hasMore=true。fetch 需要 uid 与 uidValidity，maxBytes 1..65536，是编码字节上限；HTML 仅作为不可信文本展示，MIME 或字符截断可能显示替换字符。

最后一页也必须 ACK。重复上一确认可安全重试；错误或崩溃不会自动推进游标。默认 `.state/` 仅支持单主机私有本地目录，拒绝 UNC；映射网络盘、云同步与跨主机共享不支持。账号或状态迁移应人工核对。

## 卸载后的数据 / Data after uninstall

脚本保留加密凭据和游标，避免意外丢失。撤销 QQ 授权码与移除本地文件是独立步骤；删除前核对 `%LOCALAPPDATA%/qq-mail-mcp/` 与项目 `.state/`。marketplace 注册仍保留，可在确认不用后自行通过 `codex plugin marketplace remove qq-mail-local --json` 移除。不要删除其他客户端配置。
