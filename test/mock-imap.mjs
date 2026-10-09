import tls from 'node:tls';
import { readFile } from 'node:fs/promises';
import { ImapFlow } from 'imapflow';

// Test-only localhost TLS server. All credentials and content are synthetic.
export async function mockImap() {
  const cert = await readFile(new URL('./fixtures/mock-cert.pem', import.meta.url));
  const key = await readFile(new URL('./fixtures/mock-key.pem', import.meta.url));
  const commands = []; const sockets = new Set();
  const fixture = { uidValidity: 77, messages: [1, 2, 3], failFetch: false, commands };
  const server = tls.createServer({cert, key}, socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    socket.setEncoding('utf8'); let buffer = '';
    socket.write('* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN SASL-IR] Synthetic test server\r\n');
    socket.on('data', data => {
      buffer += data;
      while (buffer.includes('\r\n')) {
        const index = buffer.indexOf('\r\n'); const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        const split = line.indexOf(' '); const tag = line.slice(0, split); const command = line.slice(split + 1);
        commands.push(command.startsWith('AUTHENTICATE') ? 'AUTHENTICATE PLAIN <synthetic>' : command);
        const ok = () => socket.write(`${tag} OK done\r\n`);
        if (/^CAPABILITY$/i.test(command)) { socket.write('* CAPABILITY IMAP4rev1 AUTH=PLAIN SASL-IR\r\n'); ok(); }
        else if (/^(AUTHENTICATE|LOGIN) /i.test(command)) ok();
        else if (/^(LIST|LSUB) /i.test(command)) { socket.write('* LIST (\\HasNoChildren) "/" "INBOX"\r\n'); ok(); }
        else if (/^EXAMINE /i.test(command)) {
          socket.write(`* FLAGS (\\Seen)\r\n* ${fixture.messages.length} EXISTS\r\n* 0 RECENT\r\n* OK [UIDVALIDITY ${fixture.uidValidity}] validity\r\n* OK [UIDNEXT ${Math.max(0, ...fixture.messages) + 1}] next\r\n${tag} OK [READ-ONLY] examined\r\n`);
        } else if (/^UID SEARCH /i.test(command)) {
          if (fixture.failSearch) { fixture.failSearch = false; socket.write(`${tag} NO synthetic-search-failure
`); continue; }
          const range = command.match(/UID (\d+):(\d+|\*)/i); let uids = fixture.messages;
          if (range) { const start = Number(range[1]); const end = range[2] === '*' ? Math.max(0, ...uids) : Number(range[2]); uids = uids.filter(uid => uid >= Math.min(start, end) && uid <= Math.max(start, end)); }
          if (/SUBJECT /i.test(command)) uids = uids.filter(uid => uid === 2);
          socket.write(`* SEARCH${uids.length ? ' ' + uids.join(' ') : ''}\r\n`); ok();
        } else if (/^UID FETCH /i.test(command)) {
          if (fixture.failFetch || command.split(' ')[2] === String(fixture.failFetchUid)) { fixture.failFetch = false; fixture.failFetchUid = null; socket.write(`${tag} NO synthetic-fetch-failure\r\n`); continue; }
          const requested = command.split(' ')[2].split(',').map(Number);
          for (const uid of fixture.messages.filter(value => requested.includes(value))) {
            const items = [`UID ${uid}`];
            if (/ENVELOPE/i.test(command)) items.push(`ENVELOPE ("Thu, 08 Oct 2026 12:00:00 +0000" "Synthetic ${uid}" (("Sender" NIL "sender" "example.com")) NIL NIL ((NIL NIL "10000" "qq.com")) NIL NIL NIL "<mock-${uid}@example.com>")`);
            if (/FLAGS/i.test(command)) items.push(`FLAGS (${fixture.seen ? '\\Seen' : ''})`);
            if (/RFC822.SIZE/i.test(command)) items.push('RFC822.SIZE 200');
            if (/INTERNALDATE/i.test(command)) items.push('INTERNALDATE "08-Oct-2026 12:00:00 +0000"');
            if (/BODYSTRUCTURE/i.test(command)) items.push(`BODYSTRUCTURE (("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" ${Buffer.byteLength(fixture.body ?? `Untrusted message ${uid}: hello.`)} 1 NIL NIL NIL)("APPLICATION" "OCTET-STREAM" ("NAME" "secret.txt") NIL NIL "BASE64" 50 NIL ("ATTACHMENT" ("FILENAME" "secret.txt")) NIL) "MIXED")`);
            const peek = command.match(/BODY\.PEEK\[(\d+(?:\.\d+)*)\]<0\.(\d+)>/i);
            if (peek) { const body = Buffer.from(fixture.body ?? `Untrusted message ${uid}: hello.`).subarray(0, Number(peek[2])); items.push(`BODY[${peek[1]}]<0> {${body.length}}\r\n${body.toString()}`); }
            socket.write(`* ${fixture.messages.indexOf(uid) + 1} FETCH (${items.join(' ')})\r\n`);
          } ok();
        } else if (/^LOGOUT$/i.test(command)) { socket.write(`* BYE bye\r\n${tag} OK logout\r\n`); socket.end(); }
        else { socket.write(`${tag} BAD unsupported test command\r\n`); }
      }
    });
  });
  server.on('tlsClientError', () => {});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fixture.clientFactory = options => new ImapFlow({...options, host: '127.0.0.1', port: server.address().port, tls: {...options.tls, ca: cert}});
  fixture.close = async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); };
  return fixture;
}
