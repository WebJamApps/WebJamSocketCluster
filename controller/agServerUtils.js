const debug = require('debug')('WebJamSocketServer:agServerUtils');

exports.routing = (agServer) => {
  (async () => { // SocketCluster/WebSocket connection handling
    const { socket } = await agServer.listener('connection').once();
    debug(`new connection with id: ${socket.id}`);
    (async () => {
      const data = await socket.receiver('howdy').once();
      debug(`howdy ${data}`);
    })();
  })();
};

exports.handleErrAndWarn = (SOCKETCLUSTER_LOG_LEVEL, SOCKETCLUSTER_PORT, agServer) => {
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 1) {
    (async () => {
      const { error } = await agServer.listener('error').once();
      debug(`error ${error}`);
    })();
  }
  function colorText(message, color) {
  /* istanbul ignore else */if (color) return `\x1b[${color}m${message}\x1b[0m`;
    /* istanbul ignore next */return message;
  }
  /* istanbul ignore else */if (SOCKETCLUSTER_LOG_LEVEL >= 2) { // eslint-disable-next-line no-console
    console.log(`   ${colorText('[Active]', 32)} SocketCluster worker with PID ${process.pid} is listening on port ${SOCKETCLUSTER_PORT}`);
    (async () => {
      const { warning } = await agServer.listener('warning').once();
      debug(`warning: ${warning}`);
    })();
  }
};
