import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('stdio exposes exactly four strictly validated read-only tools and works without credentials', {timeout: 15000}, async t => {
  const wiring = JSON.parse(await readFile(new URL('../.mcp.json', import.meta.url), 'utf8')).mcpServers['qq-mail-readonly'];
  assert.equal(wiring.command, 'node');
  const transport = new StdioClientTransport({command: process.execPath, args: [fileURLToPath(new URL('../src/index.mjs', import.meta.url))], env: {QQ_MAIL_ADDRESS: '', QQ_MAIL_AUTH_CODE: '', QQ_MAIL_TRANSPORT: 'stdio'}, stderr: 'pipe'});
  let stderr = ''; transport.stderr.on('data', chunk => { stderr += chunk; });
  const client = new Client({name: 'qq-mail-test-client', version: '1.0.0'});
  t.after(async () => client.close());
  await client.connect(transport);
  const {tools} = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), ['qq_mail_fetch', 'qq_mail_list_new', 'qq_mail_search', 'qq_mail_status']);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint === true && tool.annotations.destructiveHint === false));
  const status = await client.callTool({name: 'qq_mail_status', arguments: {}});
  assert.deepEqual(JSON.parse(status.content[0].text), {configured: false, connected: false, readOnly: true});
  const listing = await client.callTool({name: 'qq_mail_list_new', arguments: {limit: 2}});
  assert.equal(listing.isError, true);
  assert.equal(JSON.parse(listing.content[0].text).error, 'credentials_not_configured');
  const missing = await client.callTool({name: 'qq_mail_fetch', arguments: {uid: 2, uidValidity: '77'}});
  assert.equal(JSON.parse(missing.content[0].text).error, 'credentials_not_configured');
  for (const args of [{uid: 0, uidValidity: '77'}, {uid: 2, uidValidity: '77', host: 'attacker.invalid'}, {uid: 2, uidValidity: '77', maxBytes: 1000000}]) {
    let rejected = false;
    try { const result = await client.callTool({name: 'qq_mail_fetch', arguments: args}); rejected = result.isError === true; } catch { rejected = true; }
    assert.equal(rejected, true);
  }
  let unknownRejected = false;
  try { const result = await client.callTool({name: 'send_mail', arguments: {}}); unknownRejected = result.isError === true; } catch { unknownRejected = true; }
  assert.equal(unknownRejected, true);
  assert.equal(stderr, '');
});

test('complete stdio session replays unacknowledged pages after restart and confirms the final page', {timeout: 30000}, async t => {
  const stateDir = await mkdtemp(join(tmpdir(), 'qq-stdio-test-'));
  const clients = [];
  t.after(async () => { for (const client of clients) await client.close(); await rm(stateDir, {recursive:true, force:true}); });
  async function session() {
    const client = new Client({name:'synthetic-session',version:'1.0.0'});
    const transport = new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./mock-server.mjs',import.meta.url)),stateDir],stderr:'pipe'});
    let stderr = ''; transport.stderr.on('data',chunk=>{stderr+=chunk;});
    clients.push(client); await client.connect(transport);
    return {client, call: async (name,args={}) => {
      const response = await client.callTool({name,arguments:args});
      assert.equal(response.isError, undefined); assert.equal(stderr,'');
      return JSON.parse(response.content[0].text);
    }};
  }
  const first = await session();
  assert.equal((await first.call('qq_mail_status',{check:true})).connected,true);
  assert.deepEqual((await first.call('qq_mail_search',{subject:'Synthetic 2'})).messages.map(m=>m.uid),[2]);
  const body = await first.call('qq_mail_fetch',{uid:2,uidValidity:'77',maxBytes:12});
  assert.equal(body.body,'Untrusted me'); assert.equal(body.untrusted,true);
  const page = await first.call('qq_mail_list_new',{limit:2});
  assert.deepEqual(page.messages.map(m=>m.uid),[1,2]);
  await first.client.close();
  const second = await session();
  const replay = await second.call('qq_mail_list_new',{limit:1});
  assert.deepEqual(replay.messages.map(m=>m.uid),[1,2]); assert.equal(replay.ackToken,page.ackToken);
  const last = await second.call('qq_mail_list_new',{ackToken:page.ackToken});
  assert.deepEqual(last.messages.map(m=>m.uid),[3]); assert.equal(last.hasMore,false);
  const repeat = await second.call('qq_mail_list_new',{ackToken:page.ackToken});
  assert.equal(repeat.ackToken,last.ackToken); assert.deepEqual(repeat.messages.map(m=>m.uid),[3]);
  assert.deepEqual((await second.call('qq_mail_list_new',{ackToken:last.ackToken})).messages,[]);
});
