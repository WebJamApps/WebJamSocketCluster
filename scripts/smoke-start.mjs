#!/usr/bin/env node
import { spawn } from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert';
import { create } from 'socketcluster-client';

const BOOT_TIMEOUT_MS = 20000;
const PROBE_TIMEOUT_MS = 2000;
const CLIENT_CONNECT_TIMEOUT_MS = 8000;
const PUBLISH_RECEIVE_TIMEOUT_MS = 5000;
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

const withTimeout = (promise, ms, errorMsg) => Promise.race([
  promise,
  delay(ms).then(() => { throw new Error(errorMsg); }),
]);

const mongoUri = process.env.MONGO_DB_URI || process.env.TEST_DB;
const nodeEnv = process.env.NODE_ENV || (mongoUri ? 'production' : 'test');

let stdout = '';
let stderr = '';
let childExited = false;
let exitInfo = null;
let finished = false;
let childRef = null;
let client1Ref = null;
let client2Ref = null;

const cleanup = (code) => {
  if (finished) return;
  finished = true;
  if (client1Ref) {
    try { client1Ref.disconnect(); } catch { /* ignore */ }
  }
  if (client2Ref) {
    try { client2Ref.disconnect(); } catch { /* ignore */ }
  }
  if (childRef && !childExited) {
    try { childRef.kill('SIGTERM'); } catch { /* ignore */ }
    setTimeout(() => {
      if (!childExited) {
        try { childRef.kill('SIGKILL'); } catch { /* ignore */ }
      }
    }, 1000);
  }
  process.exitCode = code;
};

const fail = (msg) => {
  console.error(`prod smoke FAILED: ${msg}`);
  if (stderr.trim()) console.error(`--- child stderr ---\n${stderr}`);
  if (stdout.trim()) console.error(`--- child stdout ---\n${stdout}`);
  cleanup(1);
};

const run = async () => {
  const port = process.env.PORT ? Number(process.env.PORT) : await getFreePort();
  const child = spawn(process.execPath, ['build/src/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      PORT: String(port),
      SOCKETCLUSTER_PORT: String(port),
      ...(mongoUri ? { MONGO_DB_URI: mongoUri } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  childRef = child;

  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  child.on('exit', (code, signal) => {
    childExited = true;
    exitInfo = { code, signal };
  });

  const bootDeadline = Date.now() + BOOT_TIMEOUT_MS;
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
    fail(`server process exited before becoming reachable (code=${exitInfo?.code}, signal=${exitInfo?.signal}). Probe results: ${probeSummary()}`);
    return;
  }
  if (!reachableHost) {
    fail(`no loopback address (${LOOPBACK_CANDIDATES.join(', ')}) accepted TCP on port ${port} within ${BOOT_TIMEOUT_MS}ms. Probe results: ${probeSummary()}`);
    return;
  }
  console.log(`[smoke-start] reachable loopback address: ${reachableHost} (${probeSummary()})`);

  const client1 = create({
    hostname: reachableHost,
    port,
    secure: false,
    connectTimeout: CLIENT_CONNECT_TIMEOUT_MS,
  });
  client1Ref = client1;

  const client2 = create({
    hostname: reachableHost,
    port,
    secure: false,
    connectTimeout: CLIENT_CONNECT_TIMEOUT_MS,
  });
  client2Ref = client2;

  (async () => {
    const consumer = client1.listener('error').createConsumer();
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await consumer.next();
      if (value?.error) console.error('[smoke-start] client1 error:', value.error.message || value.error);
      if (done) break;
    }
  })();

  (async () => {
    const consumer = client2.listener('error').createConsumer();
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await consumer.next();
      if (value?.error) console.error('[smoke-start] client2 error:', value.error.message || value.error);
      if (done) break;
    }
  })();

  await withTimeout(
    Promise.all([
      client1.listener('connect').once(),
      client2.listener('connect').once(),
    ]),
    CLIENT_CONNECT_TIMEOUT_MS,
    'both clients failed to connect within timeout',
  );
  console.log('[smoke-start] both socketcluster clients connected');

  // Client 1 subscribes to gigUpdated
  const gigChannel = client1.subscribe('gigUpdated');
  const gigConsumer = gigChannel.createConsumer();
  await withTimeout(
    gigChannel.listener('subscribe').once(),
    CLIENT_CONNECT_TIMEOUT_MS,
    'client1 failed to subscribe to gigUpdated',
  );
  console.log('[smoke-start] client1 subscribed to gigUpdated');

  // Client 1 subscribes to imageUpdated
  const imageChannel = client1.subscribe('imageUpdated');
  const imageConsumer = imageChannel.createConsumer();
  await withTimeout(
    imageChannel.listener('subscribe').once(),
    CLIENT_CONNECT_TIMEOUT_MS,
    'client1 failed to subscribe to imageUpdated',
  );
  console.log('[smoke-start] client1 subscribed to imageUpdated');

  // Client 2 publishes to gigUpdated
  const testGig = { id: 'smoke-gig-1', title: 'Smoke Test Gig', timestamp: Date.now() };
  await client2.invokePublish('gigUpdated', testGig);
  const gigMsg = await withTimeout(
    gigConsumer.next(),
    PUBLISH_RECEIVE_TIMEOUT_MS,
    'client1 did not receive published message on gigUpdated within timeout',
  );
  assert.deepStrictEqual(gigMsg.value, testGig, 'gigUpdated message value mismatch');
  console.log('[smoke-start] gigUpdated publish-and-receive verified');

  // Client 2 publishes to imageUpdated
  const testImage = { id: 'smoke-image-1', caption: 'Smoke Test Image', timestamp: Date.now() };
  await client2.invokePublish('imageUpdated', testImage);
  const imageMsg = await withTimeout(
    imageConsumer.next(),
    PUBLISH_RECEIVE_TIMEOUT_MS,
    'client1 did not receive published message on imageUpdated within timeout',
  );
  assert.deepStrictEqual(imageMsg.value, testImage, 'imageUpdated message value mismatch');
  console.log('[smoke-start] imageUpdated publish-and-receive verified');

  client1.disconnect();
  client2.disconnect();
  console.log('prod smoke OK: server stayed up and two-client publish-and-receive succeeded over gigUpdated and imageUpdated');
  cleanup(0);
};

run().catch((e) => {
  fail(`unexpected error: ${e instanceof Error ? e.stack : String(e)}`);
});
