# Security review and verification scope

Independent review identified premature cursor commitment after lost responses and stale lockfiles after hard exit. Explicit page acknowledgment and an OS-owned process-lifetime mutex replaced these designs.

Actual SDK stdio clients and ImapFlow against synthetic localhost TLS verify four tools, strict arguments, EXAMINE/BODY.PEEK, flags, bounded large-body fetch, untrusted injection text, failed searches/fetches, UID gaps/epochs, corrupt state, process concurrency/hard exit, restart replay, repeated acknowledgment and final-page confirmation. Windows tests verify synthetic DPAPI encryption and launcher stdio without probing QQ.

Fixture TLS certificates/keys are deliberately public localhost material, not production credentials. Candidate repositories were source-reviewed, never executed/copied. Dependencies are pinned from the official npm registry with lifecycle scripts disabled.

Limitations: no real QQ/desktop-plugin validation, no scheduler/delivery ledger, no downstream-model injection guarantee, single-machine local state. Audit covers known advisories at execution time. Tests need no real credentials, mailbox data or production state.
