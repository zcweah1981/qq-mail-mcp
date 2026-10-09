import { MailError } from './errors.mjs';
import { withState } from './state.mjs';
import { ImapFlow } from 'imapflow';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function loadConfig(env = process.env) {
  if (env.QQ_MAIL_TRANSPORT && env.QQ_MAIL_TRANSPORT !== 'stdio') throw new Error('transport_not_supported');
  if (['QQ_MAIL_HOST', 'QQ_MAIL_PORT', 'QQ_MAIL_ALLOW_INSECURE'].some(key => env[key] !== undefined)) throw new Error('configuration_invalid');
  const user = env.QQ_MAIL_ADDRESS;
  const pass = env.QQ_MAIL_AUTH_CODE;
  if ((user || pass) && (!user || !pass || !/^\d{5,12}@qq\.com$/i.test(user) || /[\r\n\x00]/.test(pass))) throw new Error('configuration_invalid');
  return {
    configured: Boolean(user && pass), host: 'imap.qq.com', port: 993, secure: true,
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    user: user?.toLowerCase(), pass,
    accountKey: user ? createHash('sha256').update(user.toLowerCase()).digest('hex') : undefined,
    stateDir: env.QQ_MAIL_STATE_DIR || fileURLToPath(new URL('../.state/', import.meta.url))
  };
}
export function createMailService({config, clientFactory = options => new ImapFlow(options)}) {
  async function withInbox(action) {
    if (!config.configured) throw new MailError('credentials_not_configured');
    const client = clientFactory({
      host: config.host, port: config.port, secure: true, tls: config.tls,
      auth: {user: config.user, pass: config.pass}, logger: false,
      disableAutoIdle: true, disableCompression: true,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    });
    client.on('error', () => {});
    try {
      await client.connect();
      const mailbox = await client.mailboxOpen('INBOX', {readOnly: true});
      if (!mailbox.readOnly) throw new Error('mailbox_not_readonly');
      return await action(client, mailbox);
    } catch (error) { if (error instanceof MailError) throw error; throw new MailError('imap_operation_failed'); }
    finally { try { await client.logout(); } catch { client.close(); } }
  }
  return {
    async search({subject, from, since, before, unread, afterUid = 0, uidValidity, limit = 20} = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(afterUid) || afterUid < 0 || afterUid > 4294967295 || (afterUid > 0 && !/^\d+$/.test(uidValidity)) || (unread !== undefined && typeof unread !== 'boolean')) throw new MailError('invalid_arguments');
      for (const value of [subject, from]) if (value !== undefined && (typeof value !== 'string' || !value.length || value.length > 256 || /[\r\n\x00]/.test(value))) throw new MailError('invalid_arguments');
      for (const value of [since, before]) if (value !== undefined && !validDate(value)) throw new MailError('invalid_arguments');
      return withInbox(async (client, mailbox) => {
        const epoch = String(mailbox.uidValidity);
        if (uidValidity !== undefined && uidValidity !== epoch) throw new MailError('uidvalidity_changed');
        const highest = Number(mailbox.uidNext) - 1;
        const upper = Math.min(highest, afterUid + 1000);
        const query = {uid: `${afterUid + 1}:${upper}`};
        if (subject !== undefined) query.subject = subject;
        if (from !== undefined) query.from = from;
        if (since !== undefined) query.since = new Date(`${since}T00:00:00Z`);
        if (before !== undefined) query.before = new Date(`${before}T00:00:00Z`);
        if (unread !== undefined) query.seen = !unread;
        let uids = upper > afterUid ? await client.search(query, {uid: true}) : [];
        if (!Array.isArray(uids)) throw new MailError('search_failed');
        uids = [...new Set(uids)].filter(uid => Number.isInteger(uid) && uid > afterUid && uid <= upper).sort((a, b) => a - b);
        const messages = [];
        for (const uid of uids.slice(0, limit)) {
          const message = await client.fetchOne(uid, {envelope: true, flags: true, internalDate: true, size: true}, {uid: true});
          if (!message || message.uid !== uid) throw new MailError('message_not_found');
          messages.push(summary(config, mailbox, message));
        }
        const nextAfterUid = uids.length > limit ? messages.at(-1).uid : Math.max(afterUid, upper);
        return {messages, uidValidity: epoch, nextAfterUid, hasMore: nextAfterUid < highest};
      });
    },
    async listNew({limit = 20, ackToken} = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 50 || (ackToken !== undefined && !/^[a-f0-9]{32}$/.test(ackToken))) throw new MailError('invalid_arguments');
      if (!config.configured) throw new MailError('credentials_not_configured');
      return withState(config, cursor => withInbox(async (client, mailbox) => {
        const uidValidity = String(mailbox.uidValidity);
        if (cursor && cursor.uidValidity !== uidValidity) throw new MailError('uidvalidity_changed');
        let lastUid = cursor?.lastUid || 0;
        let pending = cursor?.pending || null;
        let lastAck = cursor?.lastAck || null;
        if (ackToken !== undefined) {
          if (pending && pending.token === ackToken) {
            lastUid = pending.scannedThrough; pending = null; lastAck = ackToken;
          } else if (lastAck !== ackToken) throw new MailError('ack_invalid');
        }
        const highest = Number(mailbox.uidNext) - 1;
        if (!Number.isInteger(highest) || highest < 0 || highest > 4294967295) throw new MailError('mailbox_state_invalid');
        const replayed = pending !== null;
        const upper = pending?.scannedThrough ?? Math.min(highest, lastUid + 1000);
        let uids = pending?.uids || [];
        if (!pending && upper > lastUid) uids = await client.search({uid: `${lastUid + 1}:${upper}`}, {uid: true});
        if (!Array.isArray(uids)) throw new MailError('search_failed');
        uids = [...new Set(uids)].filter(uid => Number.isInteger(uid) && uid > lastUid && uid <= upper).sort((a, b) => a - b);
        const page = replayed ? uids : uids.slice(0, limit);
        const messages = [];
        for (const uid of page) {
          const message = await client.fetchOne(uid, {envelope: true, flags: true, internalDate: true, size: true}, {uid: true});
          if (!message || message.uid !== uid) throw new MailError('message_not_found');
          messages.push(summary(config, mailbox, message));
        }
        const scannedThrough = replayed ? pending.scannedThrough : uids.length > limit ? page.at(-1) : Math.max(lastUid, upper);
        if (!pending && page.length) pending = {token: randomBytes(16).toString('hex'), uids: page, scannedThrough};
        return {
          result: {messages, uidValidity, scannedThrough, hasMore: scannedThrough < highest, initialScan: cursor === null, ackToken: pending?.token || null, replayed},
          next: {uidValidity, lastUid: pending ? lastUid : scannedThrough, pending, lastAck}
        };
      }));
    },
    async fetch({uid, uidValidity, maxBytes = 32768}) {
      if (!Number.isInteger(uid) || uid < 1 || uid > 4294967295 || !/^\d+$/.test(uidValidity) || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536) throw new MailError('invalid_arguments');
      return withInbox(async (client, mailbox) => {
        if (String(mailbox.uidValidity) !== uidValidity) throw new MailError('uidvalidity_changed');
        const message = await client.fetchOne(uid, {envelope: true, flags: true, internalDate: true, size: true, bodyStructure: true}, {uid: true});
        if (!message || message.uid !== uid) throw new MailError('message_not_found');
        const parts = textParts(message.bodyStructure);
        const part = parts.find(node => node.type === 'text/plain') || parts.find(node => node.type === 'text/html');
        const result = summary(config, mailbox, message);
        if (!part) return {...result, body: '', contentType: null, truncated: false, untrusted: true};
        const partKey = part.part || '1';
        if (!/^\d+(\.\d+)*$/.test(partKey)) throw new MailError('body_part_invalid');
        const content = await client.fetchOne(uid, {bodyParts: [{key: partKey, start: 0, maxLength: maxBytes}]}, {uid: true, binary: false});
        const bytes = content?.bodyParts?.get(partKey);
        if (!bytes || content.uid !== uid || bytes.length > maxBytes) throw new MailError('body_fetch_failed');
        return {...result, body: decodeBody(bytes, part), contentType: part.type, truncated: (part.size || 0) > bytes.length, untrusted: true};
      });
    },
    async status({check = false} = {}) {
      if (!config.configured) return {configured: false, connected: false, readOnly: true};
      if (!check) return {configured: true, connected: null, readOnly: true};
      return withInbox(async () => ({configured: true, connected: true, readOnly: true}));
    }
  };
}



function summary(config, mailbox, message) {
  const envelope = message.envelope || {};
  const uidValidity = String(mailbox.uidValidity);
  const addresses = rows => (rows || []).slice(0, 20).map(row => ({name: (row.name || '').slice(0, 256), address: (row.address || '').slice(0, 320)}));
  return {
    id: `${config.accountKey}:INBOX:${uidValidity}:${message.uid}`,
    uid: message.uid, uidValidity, subject: (envelope.subject || '').slice(0, 2048),
    from: addresses(envelope.from), to: addresses(envelope.to),
    date: message.internalDate ? new Date(message.internalDate).toISOString() : null,
    messageId: (envelope.messageId || '').slice(0, 1024),
    seen: Boolean(message.flags?.has('\\Seen')), size: message.size || 0, untrusted: true
  };
}

function textParts(node) {
  if (!node || node.disposition === 'attachment' || node.dispositionParameters?.filename || node.parameters?.name) return [];
  if (node.type === 'text/plain' || node.type === 'text/html') return [node];
  if (!node.type?.startsWith('multipart/')) return [];
  return (node.childNodes || []).flatMap(textParts);
}

function decodeBody(bytes, part) {
  const encoding = (part.encoding || '7bit').toLowerCase();
  if (encoding === 'base64') bytes = Buffer.from(bytes.toString('ascii'), 'base64');
  else if (encoding === 'quoted-printable') {
    const value = bytes.toString('latin1').replace(/=\r?\n/g, '').replace(/=([a-f0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    bytes = Buffer.from(value, 'latin1');
  } else if (!['7bit', '8bit', 'binary'].includes(encoding)) throw new MailError('body_encoding_unsupported');
  try { return new TextDecoder(part.parameters?.charset || 'utf-8').decode(bytes); }
  catch { throw new MailError('charset_unsupported'); }
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
