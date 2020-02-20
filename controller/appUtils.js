exports.setup = (expressApp, httpServer) => { // Add GET /health-check express route
  expressApp.get('/health-check', (req, res) => res.status(200).send('OK'));
  (async () => { // HTTP request handling
    const requestData = await httpServer.listener('request').once();
    expressApp(...requestData);
  })();
};
