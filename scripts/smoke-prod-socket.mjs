#!/usr/bin/env node
// Black-box liveness smoke test for the REAL production boot path (Heroku parity).
//
// Why this exists (2026-08-01, joshandmariamusic.com / web-jam.com outage):
// the AgController unit tests drive `handleDisconnect` with a fake `listener`
// that is a plain function — a plain function doesn't care about its
// receiver, so a *detached* `client.listener(...)` call passes fine under
// test even though the REAL `async-stream-emitter` implementation reads
// `this._listenerDemux` and throws when called with no receiver. Coverage
// stayed green while production crash-looped on every incoming socket
// connection. Nothing in CI ever booted the real build and opened a real
// connection through it.
//
// This script does exactly that: it boots the ACTUAL compiled server with
// NODE_ENV=production (this matters — agServerUtils.routing only skips
// resetData() when NODE_ENV === 'production', so dev/test-mode boot takes a
// DIFFERENT path than the one that crashed in prod), connects a REAL
// socketcluster-client, holds the connection briefly, disconnects cleanly,
// and asserts the server process is still alive and /health-check still
// answers. It is intentionally black-box — it doesn't know or care which
// bug crashes the boot path, so it also guards against future regressions
// in this area, not just this specific one.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { create } from 'socketcluster-client';

const BOOT_TIMEOUT_MS = 20000;
const HOLD_MS = 1500;
const SETTLE_MS = 750;

const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const getFreePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.on('error', reject);
  srv.listen(0, () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

const mongoUri = process.env.MONGO_DB_URI || process.env.TEST_DB;
if (!mongoUri) {
  console.error('smoke-prod-socket FAILED: no MONGO_DB_URI or TEST_DB set in the environment.');
  console.error('This test boots the server with NODE_ENV=production, which requires a real, reachable Mongo connection string (reusing the same test-db CircleCI already provides for the unit suite is fine — it never needs real prod data).');
  process.exit(1);
}

let stderr = '';
let stdout = '';
let childExited = false;
let exitInfo = null;
let finished = false;
let childRef = null;

const cleanup = (code) => {
  if (finished) return;
  finished = true;
  if (childRef && !childExited) {
    try { childRef.kill('SIGKILL'); } catch { /* already gone */ }
  }
  process.exitCode = code;
};

const fail = (msg) => {
  console.error(`smoke-prod-socket FAILED: ${msg}`);
  if (stderr.trim()) console.error(`--- child stderr ---\n${stderr}`);
  if (stdout.trim()) console.error(`--- child stdout ---\n${stdout}`);
  cleanup(1);
};

const run = async () => {
  const port = await getFreePort();
  const child = spawn(process.execPath, ['build/src/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      SOCKETCLUSTER_PORT: String(port),
      MONGO_DB_URI: mongoUri,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  childRef = child;
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  const exitPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      childExited = true;
      exitInfo = { code, signal };
      resolve({ type: 'exit' });
    });
  });

  const client = create({
    hostname: 'localhost', port, secure: false, connectTimeout: BOOT_TIMEOUT_MS,
  });
  const connectPromise = client.listener('connect').once().then(() => ({ type: 'connect' }));
  const timeoutPromise = delay(BOOT_TIMEOUT_MS).then(() => ({ type: 'timeout' }));

  const first = await Promise.race([exitPromise, connectPromise, timeoutPromise]);
  if (first.type === 'exit') {
    fail(`server process exited before a client could connect (code=${exitInfo?.code}, signal=${exitInfo?.signal})`);
    return;
  }
  if (first.type === 'timeout') {
    fail(`no socketcluster-client connection succeeded within ${BOOT_TIMEOUT_MS}ms`);
    client.disconnect();
    return;
  }

  // Connected. Hold the connection briefly, then disconnect cleanly — this
  // is exactly the connect/disconnect lifecycle that used to crash-loop the
  // server (the crash actually fires on connect, inside addSocket ->
  // sendPulse -> handleDisconnect, but we exercise the full real lifecycle
  // rather than assume that detail).
  await delay(HOLD_MS);
  client.disconnect();
  await delay(SETTLE_MS);

  if (childExited) {
    fail(`server process exited after a real client connected + disconnected (code=${exitInfo?.code}, signal=${exitInfo?.signal}) — this is the detached-listener regression`);
    return;
  }

  // Any completed HTTP response (regardless of status code) is evidence the
  // HTTP server is still alive and serving — this app registers a catch-all
  // route ahead of /health-check, so status code isn't a meaningful signal
  // here; only "did the server answer at all" is.
  try {
    const res = await fetch(`http://localhost:${port}/`);
    stdout += `\n[smoke] GET / after round-trip -> HTTP ${res.status}\n`;
  } catch (e) {
    fail(`HTTP server did not answer a request after the socket round-trip: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  console.log('smoke-prod-socket OK: production-mode boot survived a real socketcluster-client connect + disconnect, and the HTTP server still answers.');
  cleanup(0);
};

run().catch((e) => {
  console.error(`smoke-prod-socket FAILED: unexpected error: ${e instanceof Error ? e.stack : String(e)}`);
  cleanup(1);
});
