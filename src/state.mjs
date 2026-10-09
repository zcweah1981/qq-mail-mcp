import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, stat, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MailError } from './errors.mjs';

// Only hashes, UID epochs/cursors, pending UID pages and ACK tokens; no mail or credentials.
export async function withState(config, action) {
  if (/^(?:\\\\|\/\/)/.test(config.stateDir)) throw new MailError('state_unavailable');
  try { await mkdir(config.stateDir, {recursive: true, mode: 0o700}); }
  catch { throw new MailError('state_unavailable'); }
  const file = join(config.stateDir, `${config.accountKey}.json`);
  const lock = await acquireLock(config);
  try {
    let cursor = null;
    try {
      if ((await stat(file)).size > 8192) throw new MailError('state_invalid');
      cursor = JSON.parse(await readFile(file, 'utf8'));
      if (![1, 2].includes(cursor.version) || cursor.accountKey !== config.accountKey || cursor.mailbox !== 'INBOX' || !/^[1-9]\d{0,19}$/.test(cursor.uidValidity) || !Number.isInteger(cursor.lastUid) || cursor.lastUid < 0 || cursor.lastUid > 4294967295) throw new MailError('state_invalid');
      if (!validPending(cursor)) throw new MailError('state_invalid');
    } catch (error) {
      if (error.code !== 'ENOENT') throw new MailError('state_invalid');
    }
    const {result, next} = await action(cursor);
    const temporary = `${file}.tmp-${randomUUID()}`;
    try {
      await readWrite(temporary, JSON.stringify({version: 2, accountKey: config.accountKey, mailbox: 'INBOX', ...next}));
      if (!lock.listening) throw new MailError('state_lock_lost');
      await rename(temporary, file);
    } catch { throw new MailError('state_write_failed'); }
    finally { await rm(temporary, {force: true}).catch(() => {}); }
    return result;
  } finally { await new Promise(resolve => lock.close(resolve)); }
}

async function readWrite(file, data) {
  const handle = await open(file, 'wx', 0o600);
  try { await handle.writeFile(data, 'utf8'); await handle.sync(); } finally { await handle.close(); }
}
function validPending(cursor) {
  if (cursor.lastAck != null && !/^[a-f0-9]{32}$/.test(cursor.lastAck)) return false;
  const pending = cursor.pending;
  if (pending == null) return true;
  return /^[a-f0-9]{32}$/.test(pending.token) && Number.isInteger(pending.scannedThrough) && pending.scannedThrough > cursor.lastUid && pending.scannedThrough <= 4294967295 && Array.isArray(pending.uids) && pending.uids.length >= 1 && pending.uids.length <= 50 && pending.uids.every((uid, index) => Number.isInteger(uid) && uid > (index ? pending.uids[index - 1] : cursor.lastUid) && uid <= pending.scannedThrough);
}
// An OS-owned, exclusive loopback port is used only as a process-lifetime mutex.
// It is not HTTP/MCP: accepted connections are destroyed, no data is read or sent.
// Unlike a stale lockfile or time lease, a hard process exit releases ownership.
// Canonical paths bind aliases to the same mutex. Hash collisions fail closed.
async function acquireLock(config) {
  let directory;
  try { directory = await realpath(config.stateDir); } catch { throw new MailError('state_unavailable'); }
  if (/^(?:\\\\|\/\/)/.test(directory)) throw new MailError('state_unavailable');
  if (process.platform === 'win32') directory = directory.toLowerCase();
  const hash = createHash('sha256').update(`${directory}\0${config.accountKey}`).digest();
  const port = 20000 + hash.readUInt32BE(0) % 30000;
  const lock = createServer(socket => socket.destroy());
  try {
    await new Promise((resolve, reject) => {
      lock.once('error', reject);
      lock.listen({host: '127.0.0.1', port, exclusive: true}, resolve);
    });
    return lock;
  } catch (error) { throw new MailError(error.code === 'EADDRINUSE' ? 'state_busy' : 'state_unavailable'); }
}
