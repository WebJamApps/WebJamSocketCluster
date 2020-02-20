const debug = require('debug')('WebJamSocketServer:appUtils');

exports.handleRequest = (expressApp, requestData) => {
  debug(requestData[0].url);
  try { expressApp(...requestData); } catch (e) { return debug(e.message); }
  return true;
};

exports.setup = (expressApp, httpServer) => { // Add GET /health-check express route
  expressApp.get('/health-check', (req, res) => res.status(200).send('OK'));
  (async () => { // HTTP request handling
    let packet;
    const consumer = httpServer.listener('request').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      packet = await consumer.next();// eslint-disable-line no-await-in-loop
      this.handleRequest(expressApp, packet.value);
      if (packet.done) break;
    }
  })();
};
