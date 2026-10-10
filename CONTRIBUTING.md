# Contributing / 贡献

欢迎反馈 Windows + Codex 安装体验、只读搜索行为与文档问题。先阅读 [支持矩阵](README.md#已验证范围)、[安装排障](docs/INSTALL.md) 和 [安全政策](SECURITY.md)。

## 报告问题

使用 [Bug report](https://github.com/zcweah1981/qq-mail-mcp/issues/new?template=bug_report.md) 或 [Feature request](https://github.com/zcweah1981/qq-mail-mcp/issues/new?template=feature_request.md)。描述版本、操作系统、Node.js / PowerShell / Codex 版本、可复现步骤、预期与实际行为。

只提交合成数据或已脱敏的最小输出。不要附授权码、邮箱地址、真实邮件、个人路径、配置备份、credential.xml、.env、.state 或私有运行状态。安全漏洞请使用私密报告渠道，不公开贴复现细节。

## 修改与验证

基于最新 main 创建分支，提交聚焦改动。保持固定验证 TLS 的 QQ IMAP、INBOX EXAMINE / BODY.PEEK、四项只读工具和显式扫描确认，不扩大邮箱权限。

~~~powershell
npm ci --ignore-scripts --registry=https://registry.npmjs.org/
npm test
npm run check
npm audit
~~~

测试必须使用合成凭据、localhost TLS 和隔离配置目录，不调用真实邮箱，不修改用户 Codex 配置或安全凭据。行为修复请提供能复现问题的回归测试。仅修改文档时检查链接、命令和支持范围。

Do not include private mail or credentials in issues or pull requests. Keep tests local and synthetic. Do not probe a contributor's real mailbox.

## 范围与许可

HTTP 托管、定时通知、附件下载和邮件写入没有在当前版本实现。提议新能力时先解释具体需求与隐私影响；不要为了兼容或推广移除只读约束。贡献以仓库的 [MIT 许可](LICENSE) 提交。维护者不承诺响应时间或新增功能日期。
