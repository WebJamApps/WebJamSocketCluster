const debug = require('debug')('WebJamSocketServer:agServerUtils');

let count = 0;
// const activeClients = [];
exports.handleDisconnect = (socket, interval, agServer) => {
  (async () => {
    let disconnect;
    const dConsumer = socket.listener('disconnect').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      disconnect = await dConsumer.next();// eslint-disable-line no-await-in-loop
      debug('received disconnect:');
      debug(disconnect.value);
      if (disconnect.value !== undefined) {
        clearInterval(interval);
        count -= 1;
      }
      agServer.exchange.transmitPublish('sample', count);
      /* istanbul ignore else */if (disconnect.done) break;
    }
  })();
  return Promise.resolve(true);
};

exports.sendPulse = (socket, agServer) => {
  const interval = setInterval(() => {
    socket.socket.transmit('pulse', { number: Math.floor(Math.random() * 5) });
  }, 1000);
  this.handleDisconnect(socket.socket, interval, agServer);
};
exports.handleReceiver = (socket, agServer) => {
  (async () => {
    let receiver;
    const rConsumer = socket.socket.receiver('initial message').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
      debug(`received initial message: ${receiver.value}`);
      agServer.exchange.transmitPublish('sample', count);
      /* istanbul ignore else */if (receiver.done) break;
    }
  })();
};
exports.routing = (agServer) => {
  (async () => { // SocketCluster/WebSocket connection handling
    let socket;
    const cConsumer = agServer.listener('connection').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      socket = await cConsumer.next();// eslint-disable-line no-await-in-loop
      debug(`new connection with id: ${socket.value.id}`);
      count += 1;
      this.handleReceiver(socket.value, agServer);
      this.sendPulse(socket.value, agServer);
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
