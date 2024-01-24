import 'module-alias/register';
import Debug from 'debug';
import dotenv from 'dotenv';
import socketClusterServer from 'socketcluster-server';
import express from 'express';
import enforce from 'express-sslify';
import serveStatic from 'serve-static';
import path from 'path';
import morgan from 'morgan';
import { v4 } from 'uuid';
import sccBrokerClient from 'scc-broker-client';
import './model/db';
import httpServer from './app/httpServer';
import appUtils from './app/appUtils';
import agServerUtils from './app/agServerUtils';

const debug = Debug('WebJamSocketServer:server');
dotenv.config();
const ENVIRONMENT = process.env.ENV || process.env.NODE_ENV;
const SOCKETCLUSTER_PORT = Number(process.env.SOCKETCLUSTER_PORT) || Number(process.env.PORT);
const SOCKETCLUSTER_LOG_LEVEL = process.env.SOCKETCLUSTER_LOG_LEVEL || 2;
let mE = process.env.SCC_MAPPING_ENGINE;
/* istanbul ignore else */ if (mE !== 'skeletonRendezvous' && mE !== 'simple') mE = undefined;
const SCC_INSTANCE_ID = v4();
const SCC_STATE_SERVER_HOST = process.env.SCC_STATE_SERVER_HOST || undefined;
const SCC_STATE_SERVER_PORT = Number(process.env.SCC_STATE_SERVER_PORT) || undefined;
const SCC_MAPPING_ENGINE = mE;
const SCC_CLIENT_POOL_SIZE = Number(process.env.SCC_CLIENT_POOL_SIZE) || undefined;
const SCC_AUTH_KEY = process.env.SCC_AUTH_KEY || undefined;
const SCC_INSTANCE_IP = process.env.SCC_INSTANCE_IP || undefined;
const SCC_INSTANCE_IP_FAMILY = process.env.SCC_INSTANCE_IP_FAMILY || undefined;
const SCC_STATE_SERVER_CONNECT_TIMEOUT = Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || undefined;
const SCC_STATE_SERVER_ACK_TIMEOUT = Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || undefined;
const SCC_STATE_SERVER_RECONNECT_RANDOMNESS = Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || undefined;
const SCC_PUB_SUB_BATCH_DURATION = Number(process.env.SCC_PUB_SUB_BATCH_DURATION) || undefined;
const SCC_BROKER_RETRY_DELAY = Number(process.env.SCC_BROKER_RETRY_DELAY) || undefined;
const agOptions = {};
/* istanbul ignore if */if (process.env.SOCKETCLUSTER_OPTIONS) {
  const envOptions = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
  Object.assign(agOptions, envOptions);
}
const agServer = socketClusterServer.attach(httpServer, agOptions);
const expressApp = express();
/* istanbul ignore if */if (ENVIRONMENT === 'dev' || ENVIRONMENT === 'development') {
  expressApp.use(morgan('dev'));// Log every HTTP request. See https://github.com/expressjs/morgan for available formats.
}
expressApp.use(serveStatic(path.resolve(__dirname, 'JaMmusic')));
/* istanbul ignore next */
if (process.env.NODE_ENV === 'production' && process.env.BUILD_BRANCH === 'master') expressApp.use(enforce.HTTPS({ trustProtoHeader: true }));
expressApp.use(express.static(path.normalize(path.join(__dirname, '../../JaMmusic/dist'))));
appUtils.setup(expressApp, httpServer);
httpServer.listen(SOCKETCLUSTER_PORT);
(async () => { await agServerUtils.routing(agServer); })();
(async () => { await agServerUtils.handleErrAndWarn(SOCKETCLUSTER_LOG_LEVEL, SOCKETCLUSTER_PORT, agServer); })();
/* istanbul ignore if */if (SCC_STATE_SERVER_HOST) { // Setup broker client to connect to SCC.
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
  if (Number(SOCKETCLUSTER_LOG_LEVEL) >= 1) {
    (async () => {
      const { error } = await sccClient.listener('error').once();
      debug(`sccClient error: ${error.message}`);
    })();
  }
}
