import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.mjs';
import { loadConfig, createMailService } from './mail.mjs';
try {
  const config = loadConfig();
  const server = createServer(createMailService({config}));
  await server.connect(new StdioServerTransport());
} catch {
  process.stderr.write('qq-mail-mcp: startup_failed; check local configuration.\n');
  process.exitCode = 1;
}