import Debug from 'debug';
import type socketClusterServer from 'socketcluster-server';
import ConsumableStream from 'consumable-stream';
import AgController from '../AgController';

const debug = Debug('WebJamSocketServer:agServerUtils');

const handleConnections = async (
  cConsumer:ConsumableStream.Consumer<socketClusterServer.AGServer.ConnectionData>, 
  agController: AgController,
) => {
  while (true) { // eslint-disable-line no-constant-condition
    const socket = await cConsumer.next();// eslint-disable-line no-await-in-loop
    debug(`new connection with id: ${socket.value.id}`);
    agController.addSocket(socket.value);
    /* istanbul ignore else */if (socket.done) break;
  }
};

const routing = async (agServer:socketClusterServer.AGServer): Promise<boolean> => {
  const agController = new AgController(agServer);
  /* istanbul ignore else */if (process.env.NODE_ENV !== 'production') await agController.resetData();
  (async () => { // SocketCluster/WebSocket connection handling
    const cConsumer = agServer.listener('connection').createConsumer();
    await handleConnections(cConsumer, agController);
  })();
  return Promise.resolve(true);
};
const setupErrorWarning = (agServer: socketClusterServer.AGServer, type: any): void => {
  (async () => {
    let msg;
    const eConsumer = agServer.listener(type).createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      msg = await eConsumer.next();// eslint-disable-line no-await-in-loop
      debug(type);
      debug(msg.value);
      /* istanbul ignore else */if (msg.done) break;
    }
  })();
};

const handleErrAndWarn = (SOCKETCLUSTER_LOG_LEVEL: any, SOCKETCLUSTER_PORT: any, agServer: socketClusterServer.AGServer): Promise<boolean> => {
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 1) setupErrorWarning(agServer, 'error');
  function colorText(message: string, color: number) {
    let fullMessage = message;
    /* istanbul ignore else */if (color) fullMessage = `\x1b[${color}m${message}\x1b[0m`;
    return fullMessage;
  }
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 2) { // eslint-disable-next-line no-console
    console.log(`   ${colorText('[Active]', 32)} SocketCluster worker with PID ${process.pid} is listening on port ${SOCKETCLUSTER_PORT}`);
    setupErrorWarning(agServer, 'warning');
  }
  return Promise.resolve(true);
};
export default {
  handleErrAndWarn, setupErrorWarning, routing, handleConnections, 
};
