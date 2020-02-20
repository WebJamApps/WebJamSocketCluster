const debug = require('debug')('WebJamSocketServer:appUtils');

exports.handleRequest = (expressApp, requestData) => {
  debug(requestData);
  try { expressApp(...requestData); } catch (e) { return debug(e.message); }
  return true;
};

exports.setup = (expressApp, httpServer) => { // Add GET /health-check express route
  expressApp.get('/health-check', (req, res) => res.status(200).send('OK'));
  (async () => { // HTTP request handling
    const requestData = await httpServer.listener('request').once();
    return this.handleRequest(expressApp, requestData);
  })();
};
