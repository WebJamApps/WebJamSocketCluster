const debug = require('debug')('WebJamSocketServer:AgController');
const tourController = require('../model/tour/tour-controller');
const tourData = require('../model/tour/reset-tour');

class AgController {
  constructor(server) {
    this.server = server;
    this.clients = [];
    this.tourController = tourController;
  }

  async resetData() {
    const { tour } = tourData;
    try {
      await this.tourController.deleteAllDocs();
      await this.tourController.createDocs(tour);
    } catch (e) { debug(e.message); return Promise.resolve(e.message); }
    return Promise.resolve(true);
  }

  handleDisconnect(socket, interval) {
    (async () => {
      let disconnect;
      const dConsumer = socket.listener('disconnect').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        disconnect = await dConsumer.next();// eslint-disable-line no-await-in-loop
        debug('received disconnect:');
        debug(disconnect.value);
        debug(socket.id);
        clearInterval(interval);
        if (disconnect.value !== undefined) {
          const index = this.clients.indexOf(socket.id);
          if (index !== -1) this.clients.splice(index, 1);
          debug(this.clients);
        }
        this.server.exchange.transmitPublish('sample', this.clients.length);
        /* istanbul ignore else */if (disconnect.done) break;
      }
    })();
    return Promise.resolve(true);
  }

  sendPulse(socket) {
    const interval = setInterval(() => {
      socket.socket.transmit('pulse', { number: Math.floor(Math.random() * 5) });
    }, 1000);
    debug(`num clients: ${this.clients.length}`);
    socket.socket.transmit('num_clients', this.clients.length);
    this.server.exchange.transmitPublish('sample', this.clients.length);
    return this.handleDisconnect(socket.socket, interval);
  }

  handleReceiver(socket) { // eslint-disable-line class-methods-use-this
    (async () => {
      let receiver;
      const rConsumer = socket.socket.receiver('initial message').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received initial message: ${receiver.value}`);
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  addSocket(socket) {
    this.clients.push(socket.id);
    debug('clientIds');
    debug(this.clients);
    this.handleReceiver(socket);
    this.sendPulse(socket);
  }
}
module.exports = AgController;
