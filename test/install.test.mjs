import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

test('isolated native installation is repeatable and preserves other configuration', {skip:process.platform!=='win32',timeout:60000}, async t=>{
 const root=await mkdtemp(join(tmpdir(),'qq-install-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const home=join(root,'codex'); const adapter=join(root,'adapter');
 await mkdir(home);
 const local=join(root,'local');await mkdir(join(local,'qq-mail-mcp'),{recursive:true});
 const state=join(root,'checkout-state');await mkdir(state);
 await writeFile(join(home,'config.toml'),'[mcp_servers.other]\ncommand = "other-command"\n[plugins."other@other"]\nenabled = false\n');
 const args=['-NoProfile','-NonInteractive','-File',resolve('scripts/install.ps1'),'-ConfigHome',home,'-InstallRoot',adapter,'-SkipDependencyInstall'];
 const isolatedEnv={...process.env,LOCALAPPDATA:local,QQ_MAIL_STATE_DIR:state};
 const run=()=>execFileSync('pwsh',args,{encoding:'utf8',env:isolatedEnv});
 run(); run();
 const config=await readFile(join(home,'config.toml'),'utf8');
 assert.match(config,/other-command/); assert.match(config,/other@other/);
 assert.match(config,/qq-mail-readonly@qq-mail-local/);
 await writeFile(join(local,'qq-mail-mcp/credential.xml'),'synthetic-preserve');
 await writeFile(join(state,'state.json'),'synthetic-cursor');
 const conflicting=join(root,'conflicting');
 assert.throws(()=>execFileSync('pwsh',['-NoProfile','-NonInteractive','-File',resolve('scripts/install.ps1'),'-ConfigHome',home,'-InstallRoot',conflicting,'-SkipDependencyInstall'],{stdio:'pipe',env:isolatedEnv}));
 assert.equal(await readFile(join(home,'config.toml'),'utf8'),config);
 assert.throws(()=>execFileSync('pwsh',['-NoProfile','-NonInteractive','-File',resolve('scripts/uninstall.ps1'),'-ConfigHome',home,'-InstallRoot',conflicting],{stdio:'pipe',env:isolatedEnv}));
 assert.equal(await readFile(join(home,'config.toml'),'utf8'),config);
 execFileSync('pwsh',['-NoProfile','-NonInteractive','-File',resolve('scripts/uninstall.ps1'),'-ConfigHome',home,'-InstallRoot',adapter],{env:isolatedEnv});
 assert.equal(await readFile(join(local,'qq-mail-mcp/credential.xml'),'utf8'),'synthetic-preserve');
 assert.equal(await readFile(join(state,'state.json'),'utf8'),'synthetic-cursor');
 assert.match(await readFile(join(home,'config.toml'),'utf8'),/other-command/);
 const mcp=JSON.parse(await readFile(join(adapter,'plugins/qq-mail-readonly/.mcp.json'),'utf8'));
 assert.equal(mcp.mcpServers['qq-mail-readonly'].env.QQ_MAIL_AUTH_CODE,'');
 assert.ok(mcp.mcpServers['qq-mail-readonly'].args.at(-1).endsWith('start-secure.ps1'));
});

test('status helper uses only an isolated credential directory and does not probe QQ by default', {skip:process.platform!=='win32',timeout:20000}, async t=>{
 const root=await mkdtemp(join(tmpdir(),'qq-status-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'qq-mail-mcp'));
 execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',"$secret=ConvertTo-SecureString 'synthetic-only' -AsPlainText -Force; [PSCredential]::new('10000@qq.com',$secret) | Export-Clixml -LiteralPath (Join-Path $env:LOCALAPPDATA 'qq-mail-mcp/credential.xml')"],{env:{...process.env,LOCALAPPDATA:root}});
 const output=execFileSync(process.execPath,[resolve('scripts/status.mjs')],{env:{...process.env,LOCALAPPDATA:root,QQ_MAIL_ADDRESS:'',QQ_MAIL_AUTH_CODE:''},encoding:'utf8'});
 const result=JSON.parse(output);
 assert.equal(result.tools.length,4);
 assert.deepEqual(result.status,{configured:true,connected:null,readOnly:true});
});
