import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

test('Windows secure launcher decrypts only synthetic DPAPI credentials and keeps stdio clean without probing QQ', {skip:process.platform !== 'win32',timeout:20000}, async t => {
  const directory = await mkdtemp(join(tmpdir(),'qq-dpapi-test-'));
  await mkdir(join(directory,'qq-mail-mcp'));
  t.after(async()=>rm(directory,{recursive:true,force:true}));
  const script = "$secret = ConvertTo-SecureString 'synthetic-dpapi-test-only' -AsPlainText -Force; [System.Management.Automation.PSCredential]::new('10000@qq.com',$secret) | Export-Clixml -LiteralPath (Join-Path $env:LOCALAPPDATA 'qq-mail-mcp/credential.xml')";
  execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,LOCALAPPDATA:directory}});
  const encrypted = await readFile(join(directory,'qq-mail-mcp/credential.xml'),'utf8');
  assert.ok(!encrypted.includes('synthetic-dpapi-test-only'));
  const transport = new StdioClientTransport({command:'pwsh',args:['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../scripts/start-secure.ps1',import.meta.url))],env:{LOCALAPPDATA:directory,QQ_MAIL_TRANSPORT:'stdio'},stderr:'pipe'});
  let stderr=''; transport.stderr.on('data',chunk=>{stderr+=chunk;});
  const client = new Client({name:'synthetic-dpapi-client',version:'1.0.0'});
  t.after(async()=>client.close());
  await client.connect(transport);
  const status = await client.callTool({name:'qq_mail_status',arguments:{check:false}});
  assert.deepEqual(JSON.parse(status.content[0].text),{configured:true,connected:null,readOnly:true});
  assert.equal(stderr,'');
});
