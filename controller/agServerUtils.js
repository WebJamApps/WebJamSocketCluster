const debug = require('debug')('WebJamSocketServer:agServerUtils');
const AgController = require('./AgController');

exports.routing = async (agServer) => {
  const agController = new AgController(agServer);
  /* istanbul ignore else */if (process.env.NODE_ENV !== 'production') await agController.resetData();
  (async () => { // SocketCluster/WebSocket connection handling
    let socket;
    const cConsumer = agServer.listener('connection').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      socket = await cConsumer.next();// eslint-disable-line no-await-in-loop
      debug(`new connection with id: ${socket.value.id}`);
      agController.addSocket(socket.value);
      /* istanbul ignore else */if (socket.done) break;
    }
  })();
  return Promise.resolve(true);
};
exports.setupErrorWarning = (agServer, type) => {
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

exports.handleErrAndWarn = (SOCKETCLUSTER_LOG_LEVEL, SOCKETCLUSTER_PORT, agServer) => {
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 1) this.setupErrorWarning(agServer, 'error');
  function colorText(message, color) {
    let fullMessage = message;
    /* istanbul ignore else */if (color) fullMessage = `\x1b[${color}m${message}\x1b[0m`;
    return fullMessage;
  }
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 2) { // eslint-disable-next-line no-console
    console.log(`   ${colorText('[Active]', 32)} SocketCluster worker with PID ${process.pid} is listening on port ${SOCKETCLUSTER_PORT}`);
    this.setupErrorWarning(agServer, 'warning');
  }
  return Promise.resolve(true);
};
