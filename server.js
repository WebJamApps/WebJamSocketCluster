require('dotenv').config();
// const http = require('http');
// const eetase = require('eetase');
const socketClusterServer = require('socketcluster-server');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const uuid = require('uuid');
const sccBrokerClient = require('scc-broker-client');
const debug = require('debug')('WebJamSocketServer:server');
const httpServer = require('./httpServer');

const ENVIRONMENT = process.env.ENV || 'dev';
const SOCKETCLUSTER_PORT = process.env.SOCKETCLUSTER_PORT || process.env.PORT || 8888;
// const SOCKETCLUSTER_WS_ENGINE = process.env.SOCKETCLUSTER_WS_ENGINE || 'ws';
// const SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT = Number(process.env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT) || 1000;
const SOCKETCLUSTER_LOG_LEVEL = process.env.SOCKETCLUSTER_LOG_LEVEL || 2;

const SCC_INSTANCE_ID = uuid.v4();
const SCC_STATE_SERVER_HOST = process.env.SCC_STATE_SERVER_HOST || null;
const SCC_STATE_SERVER_PORT = process.env.SCC_STATE_SERVER_PORT || null;
const SCC_MAPPING_ENGINE = process.env.SCC_MAPPING_ENGINE || null;
const SCC_CLIENT_POOL_SIZE = process.env.SCC_CLIENT_POOL_SIZE || null;
const SCC_AUTH_KEY = process.env.SCC_AUTH_KEY || null;
const SCC_INSTANCE_IP = process.env.SCC_INSTANCE_IP || null;
const SCC_INSTANCE_IP_FAMILY = process.env.SCC_INSTANCE_IP_FAMILY || null;
const SCC_STATE_SERVER_CONNECT_TIMEOUT = Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || null;
const SCC_STATE_SERVER_ACK_TIMEOUT = Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || null;
const SCC_STATE_SERVER_RECONNECT_RANDOMNESS = Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || null;
const SCC_PUB_SUB_BATCH_DURATION = Number(process.env.SCC_PUB_SUB_BATCH_DURATION) || null;
const SCC_BROKER_RETRY_DELAY = Number(process.env.SCC_BROKER_RETRY_DELAY) || null;

const agOptions = {};

if (process.env.SOCKETCLUSTER_OPTIONS) {
  const envOptions = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
  Object.assign(agOptions, envOptions);
}

// const httpServer = eetase(http.createServer());
const agServer = socketClusterServer.attach(httpServer, agOptions);

const expressApp = express();
if (ENVIRONMENT === 'dev') {
  // Log every HTTP request. See https://github.com/expressjs/morgan for other
  // available formats.
  expressApp.use(morgan('dev'));
}
expressApp.use(serveStatic(path.resolve(__dirname, 'public')));

// Add GET /health-check express route
expressApp.get('/health-check', (req, res) => {
  res.status(200).send('OK');
});

// HTTP request handling loop.
(async () => {
  for await (const requestData of httpServer.listener('request')) {
    expressApp(...requestData);
  }
})();

// SocketCluster/WebSocket connection handling loop.
(async () => {
  for await (const { socket } of agServer.listener('connection')) {
    debug('I have a connection');
    debug(socket);
    // Handle socket connection.
  }
})();

httpServer.listen(SOCKETCLUSTER_PORT);

if (SOCKETCLUSTER_LOG_LEVEL >= 1) {
  (async () => {
    for await (const { error } of agServer.listener('error')) {
      console.error(error);// eslint-disable-line no-console
    }
  })();
}

function colorText(message, color) {
  if (color) {
    return `\x1b[${color}m${message}\x1b[0m`;
  }
  return message;
}

if (SOCKETCLUSTER_LOG_LEVEL >= 2) { // eslint-disable-next-line no-console
  console.log(
    `   ${colorText('[Active]', 32)} SocketCluster worker with PID ${process.pid} is listening on port ${SOCKETCLUSTER_PORT}`,
  );
  debug('socketcluster-server is running now');

  (async () => {
    for await (const { warning } of agServer.listener('warning')) {
      console.warn(warning);// eslint-disable-line no-console
    }
  })();
}

if (SCC_STATE_SERVER_HOST) {
  // Setup broker client to connect to SCC.
  const sccClient = sccBrokerClient.attach(agServer.brokerEngine, {
    instanceId: SCC_INSTANCE_ID,
    instancePort: SOCKETCLUSTER_PORT,
    instanceIp: SCC_INSTANCE_IP,
    instanceIpFamily: SCC_INSTANCE_IP_FAMILY,
    pubSubBatchDuration: SCC_PUB_SUB_BATCH_DURATION,
    stateServerHost: SCC_STATE_SERVER_HOST,
    stateServerPort: SCC_STATE_SERVER_PORT,
    mappingEngine: SCC_MAPPING_ENGINE,
    clientPoolSize: SCC_CLIENT_POOL_SIZE,
    authKey: SCC_AUTH_KEY,
    stateServerConnectTimeout: SCC_STATE_SERVER_CONNECT_TIMEOUT,
    stateServerAckTimeout: SCC_STATE_SERVER_ACK_TIMEOUT,
    stateServerReconnectRandomness: SCC_STATE_SERVER_RECONNECT_RANDOMNESS,
    brokerRetryDelay: SCC_BROKER_RETRY_DELAY,
  });

  if (SOCKETCLUSTER_LOG_LEVEL >= 1) {
    (async () => {
      for await (const { error } of sccClient.listener('error')) {
        error.name = 'SCCError';
        console.error(error);// eslint-disable-line no-console
      }
    })();
  }
}
