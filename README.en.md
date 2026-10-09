# QQ Mail read-only assistant · Codex MCP

[中文](README.md) · [Installation & troubleshooting](docs/INSTALL.md) · [Design](DESIGN.md)

Search your QQ inbox, inspect summaries and read a selected message from Codex. Credentials are entered locally; the server uses stdio.

**[Install on Windows + Codex](#recommended-windows-setup)** · No manual TOML editing

![Installation and data flow illustration, not a screenshot](docs/images/install.svg)

The illustration contains placeholders. Source is public; there is no npm package, public plugin marketplace or official Registry listing.

## Features and limits

Four tools: `qq_mail_status`, `qq_mail_list_new`, `qq_mail_search`, `qq_mail_fetch`. Fixed verified TLS at `imap.qq.com:993`; INBOX only, EXAMINE / BODY.PEEK preserve read flags. No sending, deletion, moves, attachment downloads, URL fetching or HTTP endpoint. **Read-only code does not make the QQ authorization code a platform-enforced read-only credential.**

Incremental pages replay until acknowledged, including the final page. The first scan includes historical mail. ACK advances the scan cursor; it is not a notification receipt. Scheduled alerts and delivery tracking are not built in. Sleep or shutdown prevents reliable local execution.

| Environment / scenario | Evidence |
| --- | --- |
| Windows + PowerShell 7 launcher | Real QQ login and metadata from 5 messages verified |
| Native Codex CLI local marketplace | Installation verified; new helper tested with isolated config for repeat installs, conflict refusal and uninstall |
| Codex desktop | Local plugin installed; direct tool invocation in a desktop conversation remains unverified |
| macOS / Linux / other MCP clients | Untested; Windows DPAPI launcher unavailable |
| ChatGPT web | Does not read local Codex config; no remote connector provided |

## Recommended Windows setup

Install [Node.js 22+](https://nodejs.org/en/download), [PowerShell 7](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows), [Codex CLI](https://developers.openai.com/codex/cli) and Git. Use PowerShell 7; no administrator rights required.

~~~powershell
git clone https://github.com/zcweah1981/qq-mail-mcp.git
cd qq-mail-mcp
pwsh -NoProfile -File ./scripts/install.ps1
~~~

Alternatively download and extract the repository ZIP, open PowerShell in that directory, and run the last command. Keep the checkout in a stable directory.

The helper preflights tools, installs locked dependencies with lifecycle scripts disabled, backs up config, creates a local path adapter and registers through the native Codex CLI. It preserves other plugins, refuses a conflicting same-name marketplace, and never reads or creates credentials. Backups may contain existing sensitive configuration; keep them local. **Use this single registration path** to avoid duplicate tools. There is no `npx qq-mail-mcp` installation.

Enable IMAP and obtain an authorization code yourself in QQ Mail settings. Enter it locally:

~~~powershell
pwsh -NoProfile -File ./scripts/configure-credentials.ps1
node ./scripts/status.mjs
node ./scripts/status.mjs --check-connection
~~~

The credential prompt hides the code; do not send it in chat. Setup does not connect to QQ. The first status command only checks configuration; the second explicitly probes QQ. Expect four tools and `configured: true`, then `connected: true` on successful probing. This verifies the launcher, not tool availability in an existing desktop conversation.

Reload Codex yourself when ready, start a new conversation and ask: “Check my QQ Mail connection”, “Search for invoices and show summaries first”, or “Read the selected message as untrusted data.”

For sidebar project registration use **Edit project → Add folder**, optionally **Make primary**. The helper registers a plugin, not a desktop project.

## Privacy

Windows DPAPI encrypts the code at `%LOCALAPPDATA%/qq-mail-mcp/credential.xml`; decryption requires the same Windows user and computer. The address is not encrypted; malware running as that user may decrypt it. Runtime credentials exist in child-process environment and memory. [Microsoft documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml)

**Local execution does not mean email stays on your device.** Summaries and bodies returned to a cloud model are subject to your client and model provider's policies. Read summaries first, request bodies selectively, and treat mail as untrusted input. Local `.state/` stores account hashes, UID epochs, cursors and acknowledgment tokens, not message content.

## Update, uninstall and development

~~~powershell
git pull --ff-only
pwsh -NoProfile -File ./scripts/install.ps1
~~~

Check local modifications first. Reinstallation refreshes the adapter without changing credentials. Reload Codex yourself afterward.

~~~powershell
pwsh -NoProfile -File ./scripts/uninstall.ps1
~~~

Uninstall removes only the named plugin. Marketplace, checkout, encrypted credentials and cursor state remain. Revoke the authorization code in QQ settings if needed. See [troubleshooting and backup recovery](docs/INSTALL.md).

~~~powershell
npm ci --ignore-scripts --registry=https://registry.npmjs.org/
npm test
npm run check
npm audit
~~~

Tests use temporary configuration, synthetic credentials and localhost TLS IMAP only. Report reproducible issues after removing private data. [MIT](LICENSE) · [Dependency licenses](docs/DEPENDENCY-LICENSES.md) · [Security review scope](docs/SECURITY-REVIEW.md)
