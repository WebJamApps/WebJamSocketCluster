import Debug from 'debug';

const debug = Debug('WebJamSocketServer:appUtils');

const handleRequest = (expressApp, requestData) => {
  debug(requestData[0].url);
  try { expressApp(...requestData); } catch (e) { return debug(e.message); }
  return true;
};

const setup = (expressApp, httpServer) => { // Add GET /health-check express route
  expressApp.get('/health-check', (req, res) => res.status(200).send('OK'));
  (async () => { // HTTP request handling
    let packet;
    const consumer = httpServer.listener('request').createConsumer();
    while (true) { // eslint-disable-line no-constant-condition
      packet = await consumer.next();// eslint-disable-line no-await-in-loop
      handleRequest(expressApp, packet.value);
      /* istanbul ignore else */if (packet.done) break;
    }
  })();
};
export default { handleRequest, setup };
