# GitHub 选型记录

2026-10-09，结论：自写严格只读薄层，复用成熟 ImapFlow 与官方 MCP SDK，不运行或 fork 全功能邮件服务器。

以下是主线程提供的源码审查结论，仅源码审查，未安装、运行候选仓库或接入真实邮箱。活跃度和许可证属于审查时快照，不作为运行安全保证；除明确列出的 ni-c 提交外，其他链接指向上游当前仓库，可能随时间变化。

| 项目与上游链接 | 审查发现 | 取舍 |
| --- | --- | --- |
| [ni-c/imap-mcp](https://github.com/ni-c/imap-mcp) | MIT；审查提交 e114f6e82122d6ec766263e0be8528efce210481；10 月 7 日 CI 成功。默认 list_new_messages 在 readonly 下仍 STORE AiSeen。 | 可参考接口，不直接使用或复制写标记逻辑。 |
| [KelpHect/read-email-mcp](https://github.com/KelpHect/read-email-mcp) | 只读，但全量保存 .eml/SQLite；审查时仅 3 个提交。 | 不符合不存全量正文的最小隐私边界，未采用。 |
| [SinoEdwards/mail-agent-mcp](https://github.com/SinoEdwards/mail-agent-mcp) | 默认 41 个工具，readonly 仍 16 个；读取路径未 EXAMINE。 | 工具面和只读保证不符合四工具范围，未采用。 |
| [Wh1isper/mcp-email-server](https://github.com/Wh1isper/mcp-email-server) | BSD-3-Clause；审查时活跃版本 1.11.1；全功能，认证依赖外围；managed 凭据在 Linux/Windows 明文 SQLite。 | 不继承发送/写邮箱能力或其凭据存储方式，未采用。 |
| [guangxiangdebizi/email-mcp](https://github.com/guangxiangdebizi/email-mcp) | ISC；支持 QQ/HTTP，但 API key 可缺省，默认 send/reply/delete；header 可覆盖 host/credentials。 | 不直接部署，不继承可覆盖目标/凭据的远程接口。 |

ni-c 写标记的固定提交证据：[src/tools/read.ts 第 383–487 行](https://github.com/ni-c/imap-mcp/blob/e114f6e82122d6ec766263e0be8528efce210481/src/tools/read.ts#L383-L487)。

## 本项目依赖

从 https://registry.npmjs.org/ 安装，禁用生命周期脚本；版本精确固定，完整性记录在 package-lock.json。没有克隆或执行以上五个候选仓库代码，没有复制上游实现。

| 依赖 | 固定版本 | 发布包许可证 | 作用 |
| --- | --- | --- | --- |
| [ImapFlow](https://github.com/postalsys/imapflow) | 2.3.0 | MIT | TLS IMAP 协议实现 |
| [官方 MCP server SDK](https://github.com/modelcontextprotocol/typescript-sdk) | 2.3.1 | Apache-2.0 | 本地 stdio MCP 服务 |
| 官方 MCP client SDK（开发依赖） | 2.3.1 | Apache-2.0 | 真实 stdio 集成测试 |
| [Zod](https://github.com/colinhacks/zod) | 4.6.5 | MIT | 严格工具参数验证 |

SDK v2 已在官方仓库说明为稳定发布线；本项目使用分包 server/client。许可证以本地安装发布包的 package.json 和 LICENSE 为准。

依赖仍需正常维护。npm audit 只报告当时已知漏洞，不证明所有实现都无缺陷。本轮另以模拟 TLS IMAP 验证本项目的 EXAMINE、BODY.PEEK、错误不推进游标和工具白名单。