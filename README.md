# QQ 邮箱只读 MCP

[English](README.en.md)。本地 stdio 最小实现：固定 imap.qq.com:993、严格 TLS、仅 INBOX，使用 EXAMINE 和 BODY.PEEK 保持已读标记。只有状态、增量列表、搜索、读取正文，无发信、删除、移动、附件下载、URL 请求或公网服务。

需要 Node.js >=22。在项目目录执行：

~~~powershell
npm ci --ignore-scripts --registry=https://registry.npmjs.org/
npm test
npm run check
npm audit
~~~

测试仅使用合成凭据和 localhost TLS IMAP，不连接 QQ。npm start 等待 stdio 客户端。无凭据可查状态，读取工具返回 credentials_not_configured。

## 工具与确认

| 工具 | 行为 |
| --- | --- |
| qq_mail_status | check=false 仅报告配置；true 才连接 QQ。 |
| qq_mail_list_new | limit=1..50；处理完返回页后，下次传 ackToken 确认，才推进游标。 |
| qq_mail_search | subject/from/since/before/unread；用 nextAfterUid 和 uidValidity 继续，不改变增量游标。日期 YYYY-MM-DD，since 包含当天，before 不包含当天。 |
| qq_mail_fetch | uid、uidValidity；取一个非附件文本部分，优先纯文本；maxBytes=1..65536。HTML 仅作为不可信文本。 |

首次包含历史邮件，不等于仅未读。每次扫描最多 1000 个 UID 数值范围；空页可能 hasMore=true。未确认页在丢失响应/重启后重放，保留原页大小。即使最后一页 hasMore=false 也须确认。重复上一确认可安全重试，其他令牌拒绝。消息 ID 包含账号哈希、INBOX、UIDVALIDITY、UID，可用于去重。

确认不代表通知成功。重要邮件提醒需要独立持久化投递记录。目前无分类器、提醒或调度。

## 安全录入与接入

不要把授权码发到聊天、写进配置、命令参数或仓库。QQ 授权码由用户在邮箱设置自行生成。Windows + PowerShell 7 可手动运行：

~~~powershell
pwsh -NoProfile -File ./scripts/configure-credentials.ps1
~~~

隐藏输入授权码，经 Windows DPAPI 加密存至当前用户 %LOCALAPPDATA%/qq-mail-mcp/credential.xml，不连接邮箱。只能同一用户在同一电脑解密；邮箱地址未加密，同用户恶意软件仍可解密。[Microsoft 文档](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml)。非交互 start-secure.ps1 解密并通过子进程环境传入 Node，运行时凭据存在内存中。

docs/codex-mcp.toml.example 默认禁用。按 [Codex MCP 文档](https://developers.openai.com/codex/mcp) 写入可信项目 .codex/config.toml 或用户配置，替换路径，选择 Windows 启动器或外部安全环境提供的 Node 入口，不重复注册。.env.example 仅说明变量，本程序不自动加载 .env。

Windows 配置示例：

~~~toml
[mcp_servers.qq-mail-readonly]
command = "pwsh"
args = ["-NoProfile", "-NonInteractive", "-File", "REPLACE_WITH_ABSOLUTE_PROJECT_PATH/scripts/start-secure.ps1"]
enabled = true
~~~

先不录入真实凭据，核对四个工具及 configured=false；录入后先 check=false，再由用户决定连接邮箱。.codex-plugin/plugin.json 与 .mcp.json 是打包模板，须替换绝对路径，桌面插件安装尚未验证；参考 [插件清单文档](https://developers.openai.com/plugins/build/plugins)。模板存在不代表登记项目或安装插件。

已有项目可按 [官方项目文档](https://developers.openai.com/codex/projects) 打开项目菜单 → Edit project → Add folder，添加本机目录，必要时 Make primary。新建项目界面随版本变化。本项目没有修改私有注册数据库。CLI 可运行 codex -C "ABSOLUTE_PROJECT_DIRECTORY"，不会登记桌面侧栏。

## 边界与故障

默认 .state/ 只存账号哈希、UIDVALIDITY、已确认/待确认 UID 与随机令牌，不存摘要、正文、凭据。原子替换和跨进程互斥防竞争。互斥短暂占用本机回环端口，无 HTTP/MCP 接口，无数据交换；进程退出由操作系统释放，端口哈希冲突拒绝操作。仅支持单机私人本地磁盘目录；UNC 拒绝，映射网络盘、共享、跨主机不支持。Windows 文件继承目录 ACL。

UIDVALIDITY 改变、状态损坏、SEARCH/FETCH 失败拒绝推进。待确认邮件被外部删除会阻塞该页，需人工核对迁移状态，不自动跳过。正文限制是 IMAP 编码字节；截断 MIME/字符可能出现替代字符，嵌套邮件不展开。邮件始终为不可信数据；下游模型须抵御提示注入，不执行正文指令、渲染 HTML 或打开链接。

真实 QQ 及桌面插件安装尚未验收。见 [选型](docs/SELECTION.md)、[设计](DESIGN.md)、[审核范围](docs/SECURITY-REVIEW.md)。源码许可证待所有者确定；依赖保留各自许可证。
