const debug = require('debug')('WebJamSocketServer:agServerUtils');

exports.handleReceiver = (socket) => {
  (async () => {
    let receiver;
    const rConsumer = socket.socket.receiver('initial message').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
      debug(`received initial message: ${receiver.value}`);
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
      this.handleReceiver(socket.value);
      /* istanbul ignore else */if (socket.done) break;
    }
  })();
  return Promise.resolve(true);
};

exports.handleErrAndWarn = (SOCKETCLUSTER_LOG_LEVEL, SOCKETCLUSTER_PORT, agServer) => {
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 1) {
    (async () => {
      let error;
      const eConsumer = agServer.listener('error').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        error = await eConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`error ${error.value}`);
        /* istanbul ignore else */if (error.done) break;
      }
    })();
  }
  function colorText(message, color) {
  /* istanbul ignore else */if (color) return `\x1b[${color}m${message}\x1b[0m`;
    /* istanbul ignore next */return message;
  }
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 2) { // eslint-disable-next-line no-console
    console.log(`   ${colorText('[Active]', 32)} SocketCluster worker with PID ${process.pid} is listening on port ${SOCKETCLUSTER_PORT}`);
    (async () => {
      let warning;
      const wConsumer = agServer.listener('warning').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        warning = await wConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`warning ${warning.value}`);
        /* istanbul ignore else */if (warning.done) break;
      }
    })();
  }
  return Promise.resolve(true);
};
