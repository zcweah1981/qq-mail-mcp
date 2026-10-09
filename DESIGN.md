# Read-only design

Fixed QQ TLS endpoint; stdio only; four strict tools. Public inputs cannot override endpoints/credentials. Production imports no fixtures. Stable error codes hide raw protocol errors and secrets.

Each bounded-time connection opens INBOX with EXAMINE, validates read-only mode, performs SEARCH/FETCH, logs out. Bounded BODY.PEEK retrieves one non-attachment text part. No full source is fetched/persisted.

State machine: committed UID → finite SEARCH → pending exact UID page/token → replay until acknowledged → confirm and produce next page. Confirmation and generation share an atomic transaction; errors roll back both. Repeated previous acknowledgment replays current pending mail. Empty windows can commit. Epoch changes reject tokens. Consumers deduplicate stable IDs; this is at-least-once replay, not delivery confirmation.

Unique temporary file, fsync, atomic replacement; exclusive OS-owned loopback port derived from canonical directory/account is a process-lifetime mutex. Accepted connections are destroyed without data. Hard exit releases ownership; collisions fail closed. Local single-machine disk only; UNC refused and mapped network disks unsupported. Durability/ACLs depend on the host.

Environment credentials in Node; optional Windows PowerShell 7 DPAPI helper stores outside the repo and a noninteractive launcher supplies child environment. Synthetic tests provision only isolated temporary credentials. Same-user malicious software is outside this boundary.

Mail content is untrusted data. Downstream models must enforce this. No rendering, attachments, links, autonomous alerts or public deployment. Future alerts need persistent delivery records and authorized schedule.
