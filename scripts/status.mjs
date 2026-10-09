import {decodeStatus} from './status-result.mjs';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {fileURLToPath} from 'node:url';
const check=process.argv.includes('--check-connection');
const client=new Client({name:'qq-mail-local-status',version:'0.1.0'});
const transport=new StdioClientTransport({command:'pwsh',args:['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./start-secure.ps1',import.meta.url))],stderr:'pipe'});
transport.stderr.on('data',()=>{});
const deadline=setTimeout(()=>{ console.error('Status timed out.'); process.exit(1); },20000);
try {
 await client.connect(transport);
 const tools=await client.listTools();
 const status=await client.callTool({name:'qq_mail_status',arguments:{check}});
 console.log(JSON.stringify({tools:tools.tools.map(t=>t.name),status:decodeStatus(status)},null,2));
} catch { console.error('Status failed. Check prerequisites and credential setup.'); process.exitCode=1; }
finally {clearTimeout(deadline);await client.close();}
