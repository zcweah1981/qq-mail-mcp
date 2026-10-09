import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/mail.mjs';

test('unconfigured status is explicit and endpoint overrides cannot disable QQ TLS', () => {
  assert.equal(loadConfig({}).configured, false);
  const config = loadConfig({QQ_MAIL_ADDRESS: '10000@qq.com', QQ_MAIL_AUTH_CODE: 'mock-only'});
  assert.equal(config.configured, true);
  assert.equal(config.host, 'imap.qq.com');
  assert.equal(config.port, 993);
  assert.equal(config.secure, true);
  assert.equal(config.tls.rejectUnauthorized, true);
  assert.throws(() => loadConfig({QQ_MAIL_HOST: 'localhost'}), /configuration_invalid/);
  assert.throws(() => loadConfig({QQ_MAIL_ADDRESS: 'other@example.com', QQ_MAIL_AUTH_CODE: 'mock-only'}), /configuration_invalid/);
  assert.throws(() => loadConfig({QQ_MAIL_ADDRESS: '10000@qq.com'}), /configuration_invalid/);
  assert.throws(() => loadConfig({QQ_MAIL_TRANSPORT: 'http'}), /transport_not_supported/);
});
test('remote HTTP transport is refused at startup and emits no secret value', () => {
  const result = spawnSync(process.execPath, ['src/index.mjs'], {cwd: fileURLToPath(new URL('..', import.meta.url)), env: {...process.env, QQ_MAIL_ADDRESS: '', QQ_MAIL_AUTH_CODE: 'synthetic-secret-must-not-appear', QQ_MAIL_TRANSPORT: 'http'}, encoding: 'utf8', timeout: 10000});
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /startup_failed/);
  assert.ok(!result.stderr.includes('synthetic-secret-must-not-appear'));
});