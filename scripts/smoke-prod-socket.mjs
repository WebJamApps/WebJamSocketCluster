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
// and asserts the server process is still alive and the HTTP server still
// answers. It is intentionally black-box — it doesn't know or care which
// bug crashes the boot path, so it also guards against future regressions
// in this area, not just this specific one.
//
// Loopback host note (2026-08-01, CircleCI build 504): `src/index.ts` calls
// `httpServer.listen(SOCKETCLUSTER_PORT)` with no host, so the OS picks the
// bind address. Dialling by the hostname 'localhost' leaves address
// selection to Node's resolver, and that has bitten this exact test once
// already: confirmed empirically against the actual CI image
// (cimg/node:24.19.0-browsers) that Node 24's *default* `dns.lookup`
// ('localhost') resolves `::1` first. If a given environment's IPv6
// loopback is present but not actually routable (a known class of container
// networking quirk we could not force-reproduce locally, but which matches
// the observed CI symptom: server logged [Active], client never connected
// in 20s, no crash signature), a hostname-based dial can hang or fail while
// the server is perfectly healthy on the other family. Rather than guess
// which family is broken in a given environment, this script empirically
// probes both loopback addresses with a short, bounded raw-TCP connect and
// dials whichever one actually answers -- self-diagnosing, and correct
// regardless of which family (if any) is broken.
import { spawn } from 'node:child_process';
import net from 'node:net';
import dns from 'node:dns';
import { create } from 'socketcluster-client';

const BOOT_TIMEOUT_MS = 20000;
const PROBE_TIMEOUT_MS = 2000;
const CLIENT_CONNECT_TIMEOUT_MS = 8000;
const HOLD_MS = 1500;
const SETTLE_MS = 750;
const LOOPBACK_CANDIDATES = ['127.0.0.1', '::1'];

const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const getFreePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.on('error', reject);
  srv.listen(0, () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

// Raw TCP reachability probe -- deliberately independent of DNS/hostname
// resolution and of socketcluster-client, so it tells us the truth about
// which loopback family actually has something listening/reachable on it.
const probeConnect = (host, port, timeoutMs) => new Promise((resolve) => {
  let settled = false;
  const sock = net.connect({ host, port });
  const finish = (ok, reason) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    try { sock.destroy(); } catch { /* already gone */ }
    resolve({ host, ok, reason });
  };
  const timer = setTimeout(() => finish(false, 'timeout'), timeoutMs);
  sock.on('connect', () => finish(true, null));
  sock.on('error', (e) => finish(false, e.code || e.message));
});

const logDnsOrdering = () => new Promise((resolve) => {
  dns.lookup('localhost', { all: true }, (err, results) => {
    if (err) console.log(`[smoke] dns.lookup('localhost', {all:true}) errored: ${err.message}`);
    else console.log(`[smoke] dns.lookup('localhost', {all:true}) -> ${JSON.stringify(results)}`);
    resolve();
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
  await logDnsOrdering();

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
      resolve();
    });
  });

  const bootDeadline = Date.now() + BOOT_TIMEOUT_MS;

  // Find which loopback family is actually reachable before ever handing a
  // hostname to socketcluster-client. Keep retrying (the child needs a
  // moment to bind) until one candidate answers, the child exits, or we run
  // out of boot budget.
  let reachableHost = null;
  const lastProbeResults = new Map();
  while (!reachableHost && !childExited && Date.now() < bootDeadline) {
    // eslint-disable-next-line no-await-in-loop
    const probes = await Promise.all(
      LOOPBACK_CANDIDATES.map((host) => probeConnect(host, port, PROBE_TIMEOUT_MS)),
    );
    for (const p of probes) lastProbeResults.set(p.host, p);
    const winner = probes.find((p) => p.ok);
    if (winner) {
      reachableHost = winner.host;
      break;
    }
    if (!childExited) {
      // eslint-disable-next-line no-await-in-loop
      await delay(250);
    }
  }

  const probeSummary = () => LOOPBACK_CANDIDATES
    .map((h) => {
      const r = lastProbeResults.get(h);
      return `${h} -> ${r ? (r.ok ? 'OK' : `FAILED (${r.reason})`) : 'not probed'}`;
    })
    .join(', ');

  if (childExited) {
    fail(`server process exited before any loopback address became reachable (code=${exitInfo?.code}, signal=${exitInfo?.signal}). Probe results: ${probeSummary()}`);
    return;
  }
  if (!reachableHost) {
    fail(`no loopback address (${LOOPBACK_CANDIDATES.join(', ')}) accepted a raw TCP connection on port ${port} within ${BOOT_TIMEOUT_MS}ms, even though the server process is still running. Probe results: ${probeSummary()}`);
    return;
  }
  console.log(`[smoke] reachable loopback address: ${reachableHost} (${probeSummary()})`);

  // TCP-level reachability is confirmed; now do the real socketcluster
  // handshake against the address we KNOW is listening. Capture 'error'
  // continuously so a handshake-level failure carries a concrete reason
  // instead of a bare "didn't connect".
  const client = create({
    hostname: reachableHost, port, secure: false, connectTimeout: CLIENT_CONNECT_TIMEOUT_MS,
  });
  let lastClientError = null;
  (async () => {
    const consumer = client.listener('error').createConsumer();
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await consumer.next();
      if (value?.error) lastClientError = value.error;
      if (done) break;
    }
  })();

  const remainingMs = Math.max(1000, bootDeadline - Date.now());
  const connectPromise = client.listener('connect').once().then(() => ({ type: 'connect' }));
  const timeoutPromise = delay(remainingMs).then(() => ({ type: 'timeout' }));
  const exitRace = exitPromise.then(() => ({ type: 'exit' }));

  const first = await Promise.race([exitRace, connectPromise, timeoutPromise]);
  if (first.type === 'exit') {
    fail(`server process exited before the socketcluster-client handshake completed against ${reachableHost}:${port} (code=${exitInfo?.code}, signal=${exitInfo?.signal})`);
    return;
  }
  if (first.type === 'timeout') {
    const reasonMsg = lastClientError ? ` Last client error: ${lastClientError.message || lastClientError}` : ' No error event was emitted by the client.';
    fail(`raw TCP reached ${reachableHost}:${port} but the socketcluster handshake did not complete within ${remainingMs}ms.${reasonMsg}`);
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
    const res = await fetch(`http://${reachableHost}:${port}/`);
    stdout += `\n[smoke] GET / after round-trip -> HTTP ${res.status}\n`;
  } catch (e) {
    fail(`HTTP server did not answer a request after the socket round-trip: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  console.log(`smoke-prod-socket OK: production-mode boot survived a real socketcluster-client connect + disconnect over ${reachableHost}, and the HTTP server still answers.`);
  cleanup(0);
};

run().catch((e) => {
  console.error(`smoke-prod-socket FAILED: unexpected error: ${e instanceof Error ? e.stack : String(e)}`);
  cleanup(1);
});
