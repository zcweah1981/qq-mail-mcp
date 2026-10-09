# Project conventions

Modify only this project. Preserve fixed verified-TLS QQ IMAP, INBOX EXAMINE, BODY.PEEK and the four-tool read-only surface. Do not introduce SMTP, mailbox writes, downloads, HTTP transport or schedules. Never commit real credentials, mail or local state.

Tests use synthetic credentials and localhost TLS only. Run npm test, npm run check and npm audit after meaningful changes. Incremental pages require explicit acknowledgment; failures must not advance committed state. Scan acknowledgment is not notification delivery. State contains only hashes, epochs, UID cursors/pending pages and random acknowledgment tokens.
