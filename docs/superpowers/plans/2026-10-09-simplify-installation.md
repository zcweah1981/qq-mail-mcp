# Local installation and documentation plan
Goal: one reviewed Windows + Codex plugin installation path, bilingual instructions and honest illustrations.
Constraints: original directory, task branch, no push/publication, no real credentials/config mutation during tests. Runtime and DPAPI format unchanged.
Architecture: PowerShell helper generates a local marketplace adapter; native Codex CLI owns registration. Explicit credential setup remains separate. No duplicate direct MCP registration.
Tasks:
1. RED→GREEN isolated installation integration test, preserving unrelated config and rejecting foreign adapters.
2. Status and uninstall helpers; test idempotence, backup, secret/state preservation with synthetic temporary directories.
3. Bilingual README, installation illustration and troubleshooting, supported/untested matrix.
4. Full suite/check/audit, image/link checks, independent review.
Review focus: installer ownership and path validation, failure recovery, CLI compatibility, stdout secrets, truthful platform/privacy claims.
Ruling: user explicitly requires original directory and inline implementation; use branch instead of a worktree. Preserve the existing service and local adapter until the user explicitly runs the new helper.

Completion: installer RED (missing script) -> GREEN in isolated CODEX_HOME. Final suite 21 tests; local documentation links/personal paths checked; SVG rendered and visually inspected. Independent review identified status isError handling and uninstall ownership; both fixed with regression checks. Existing service, credential scripts, lockfile and tracked manifests unchanged. No real config/credential mutation or remote publication. Backup recovery intentionally manual to preserve concurrent edits.
