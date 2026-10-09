import { withState } from '../src/state.mjs';
await withState({stateDir: process.argv[2], accountKey: 'a'.repeat(64)}, async () => {
  process.stdout.write('LOCKED\n');
  await new Promise(() => {});
});