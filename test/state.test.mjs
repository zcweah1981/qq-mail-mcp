import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withState } from '../src/state.mjs';

test('state locking excludes concurrent processes and releases after a hard process exit', {timeout: 15000}, async t => {
  const stateDir = await mkdtemp(join(tmpdir(), 'qq-mail-lock-'));
  const config = {stateDir, accountKey: 'a'.repeat(64)};
  const child = spawn(process.execPath, [fileURLToPath(new URL('./hold-state.mjs', import.meta.url)), stateDir], {stdio: ['ignore', 'pipe', 'pipe']});
  t.after(async () => { if (child.exitCode === null) child.kill(); await rm(stateDir, {recursive: true, force: true}); });
  const [data] = await once(child.stdout, 'data');
  assert.match(data.toString(), /LOCKED/);
  const action = async () => ({result: 'recovered', next: {uidValidity: '77', lastUid: 0}});
  await assert.rejects(withState(config, action), /state_busy/);
  const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  assert.equal(await withState(config, action), 'recovered');
});