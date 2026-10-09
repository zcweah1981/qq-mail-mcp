# QQ Mail Read-only MCP

[中文](README.md). Local stdio, one QQ account, fixed imap.qq.com:993, verified TLS, INBOX, EXAMINE and BODY.PEEK. Four tools provide status, incremental summaries, structured search and bounded text. No SMTP, deletion, movement, attachment download, URL requests or HTTP service.

Node.js >=22. Run npm ci --ignore-scripts --registry=https://registry.npmjs.org/, npm test, npm run check, npm audit. Tests use synthetic credentials and localhost TLS only, never QQ.

Acknowledge each successfully handled list page by passing its ackToken on the next call, including the final page. Unacknowledged pages replay after response loss/restart. Repeating the previous acknowledgment is safe. Initial scans include historical mail; each call scans at most 1000 UID values. Empty pages may have more work. Stable IDs combine account hash, mailbox, UIDVALIDITY and UID. Acknowledgment is not notification delivery; alerts need a separate ledger. No schedule/classifier exists.

Fetch requires UID and UIDVALIDITY; one non-attachment text part, preferably plain text, bounded to 1–65536 encoded bytes. Truncation can produce replacement characters. HTML and all mail content are untrusted data. Clients must not execute instructions, render active HTML or follow links. Server tests do not guarantee downstream model immunity to injection.

Never share codes in chat, command arguments, configuration or commits. Windows PowerShell 7 users may manually run scripts/configure-credentials.ps1 for hidden local input. DPAPI encrypts the code at %LOCALAPPDATA%/qq-mail-mcp/credential.xml for the same user/computer. The address remains visible; same-user software can decrypt it. [Microsoft restrictions](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml). The noninteractive start-secure.ps1 passes credentials via child environment; runtime secrets exist in memory.

Replace paths in the disabled docs/codex-mcp.toml.example; choose the Windows launcher or externally secured environment for Node. The app does not load .env. See [Codex MCP docs](https://developers.openai.com/codex/mcp). Plugin templates require path replacement; desktop installation is untested. No private registry/global config was modified.

State stores hashes, epochs, committed/pending UIDs and random tokens, not mail/credentials. Atomic writes and a short-lived exclusive loopback-port mutex prevent concurrent writes and recover after hard exit. No data is exchanged; collisions fail closed. State requires a private local disk on one machine; UNC is rejected, mapped/network storage and cross-host sharing are unsupported. Windows ACLs inherit directory permissions.

Invalid state, changed UIDVALIDITY and search/fetch errors fail closed. External deletion of pending messages needs manual reconciliation. Real QQ and desktop installation are unverified. Source licensing awaits owner choice; dependencies retain their licenses. See [selection](docs/SELECTION.md), [design](DESIGN.md), [review](docs/SECURITY-REVIEW.md).
