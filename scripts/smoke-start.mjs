import { spawn } from 'node:child_process';

const TIMEOUT_MS = 5000;

const child = spawn(process.execPath, ['build/src/index.js'], {
  env: { ...process.env, NODE_ENV: 'test', PORT: process.env.PORT || '8888' },
  stdio: 'inherit',
});

let exited = false;
let exitCode = null;
let exitSignal = null;

child.on('exit', (code, signal) => {
  exited = true;
  exitCode = code;
  exitSignal = signal;
});

setTimeout(() => {
  if (exited) {
    console.error(
      `prod smoke FAILED: server exited within ${TIMEOUT_MS}ms (code=${exitCode}, signal=${exitSignal})`,
    );
    process.exit(1);
  }
  console.log(`prod smoke OK: server stayed up ${TIMEOUT_MS}ms`);
  child.kill('SIGTERM');
  process.exit(0);
}, TIMEOUT_MS);
