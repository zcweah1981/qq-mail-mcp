# Security policy / 安全政策

## 支持范围

当前接受 0.1.x 的安全问题报告。项目为早期本地软件，尚无长期支持承诺。验证范围是 Windows + PowerShell 7 的启动器和 Codex CLI 本地安装；桌面会话直接调用与其他平台仍待验证。

## 私密报告

请从 [GitHub Security → Report a vulnerability](https://github.com/zcweah1981/qq-mail-mcp/security/advisories/new) 私密提交。不要在公开 issue、PR 或文章里贴漏洞利用细节或敏感数据。若私密入口不可用，只开不含复现细节的 issue 请求维护者提供安全渠道，不发送凭据。

报告请包含受影响版本、风险、合成数据的最小复现和预期行为。不要包含 QQ 授权码、真实邮箱或邮件、credential.xml、.env、完整用户配置、私有运行状态。维护者会尽力核对，但不承诺响应或修复时限。

Use private vulnerability reporting. Provide synthetic reproduction data; never send credentials or private mail.

## 数据与权限边界

- 代码只读不代表 QQ 授权码为平台只读 scope。泄露后应立即在 QQ 邮箱设置撤销并重新生成，由用户本机隐藏录入。
- Windows DPAPI 不抵御以同一用户身份运行的恶意软件；运行时凭据存在子进程环境与内存。
- 本地运行不保证邮件内容留在设备：工具结果进入云模型时受客户端与模型服务政策约束。
- 邮件为不可信数据，不能执行其中的指令、自动访问链接或渲染活动 HTML。
- 当前没有 HTTP 服务、遥测或内置通知投递。扫描 ACK 不是用户收到提醒的证明。

详细设计与已完成审查边界见 [DESIGN](DESIGN.md) 和 [SECURITY-REVIEW](docs/SECURITY-REVIEW.md)。这些说明不是第三方安全认证。
