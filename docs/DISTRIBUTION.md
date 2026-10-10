# 分发与官方目录路线 / Distribution

核验日期：2026-10-10。当前可用路线是 GitHub 源码 + Windows / Codex CLI 本地 marketplace；[安装说明](../README.md#windows-快速安装)。项目为独立社区实现，不是腾讯或 OpenAI 官方 QQ 连接器。

## 当前 GitHub 分发

v0.1.0 定位为早期版本。能力、限制和验收边界以 [README](../README.md) 为准。GitHub Release 提供固定源码快照，不意味着 npm 发布、公共插件市场收录或官方目录批准。不要使用猜测的 npx 命令。

## 官方插件目录：先判断资格

OpenAI 文档说明目录供 ChatGPT 与 Codex 使用。符合资格的插件可将 ZIP 提交到 [Plugins 门户](https://platform.openai.com/plugins)，完成自动检查和审核，获批后再选择发布。[官方提交说明](https://developers.openai.com/plugins/deploy/submission)

当前 QQ Mail MCP 不能承诺符合资格。官方指南限制主要作为第三方非官方连接器的插件；本项目未提供腾讯授权证明，因此存在实质资格障碍。这是基于指南的判断，并非已经收到官方拒绝。[第三方集成政策](https://developers.openai.com/plugins/plugin-guidelines#third-party-content-and-integrations)

当前还只有本地 stdio。官方公开 MCP 投稿要求稳定公网 HTTPS 与 Streamable HTTP，不能把本地 marketplace 文件直接当作远程服务提交。[公开 MCP 要求](https://developers.openai.com/plugins/build/mcp-server#deploy-the-endpoint)

即使补齐托管，也不代表通过政策审核。需要先解决授权和资格问题，再另行评估安全认证、隐私政策、域名验证、测试材料及运营成本。本轮未创建公网服务、开发者账号或新凭据，未接受法律条款，未提交官方申请。

## 推广顺序

1. 先完善 GitHub 安装、支持矩阵、Release、贡献与安全报告入口，接收可复现反馈。
2. 用户审阅已有中文主稿和 V2EX 短稿后，再决定具体发布渠道；目前未对外发文章。
3. 外部目录收录、npm 包与官方申请各自独立评估，不能用 GitHub 开源或 Release 替代它们。

可观察结果是安装反馈、复现问题和修复情况；不承诺星数、转化率、收录时间或上架成功。

具体执行顺序与直接 GitHub marketplace 评估见 [推广执行方案](PROMOTION.md)。
