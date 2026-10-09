// Test-only entry point. No production host or real credentials are contacted.
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createServer } from '../src/server.mjs';
import { loadConfig, createMailService } from '../src/mail.mjs';
import { mockImap } from './mock-imap.mjs';
const fixture = await mockImap();
const config = loadConfig({QQ_MAIL_ADDRESS:'10000@qq.com',QQ_MAIL_AUTH_CODE:'synthetic-test-only',QQ_MAIL_STATE_DIR:process.argv[2]});
await createServer(createMailService({config,clientFactory:fixture.clientFactory})).connect(new StdioServerTransport());
